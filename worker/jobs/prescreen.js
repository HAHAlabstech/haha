"use strict";
// Job: prescreen — MiMo flash gate for every new bit (plan §7.2 POST /api/bits).
// Steps: (1) crisis/PII/clarity via mimo.prescreen with few-shot NON-HOLDOUT
// examples only; (2) self-harm => crisis modal + drop (never silent reject);
// (3) dedup vs ALL bits: embed + pgvector cosine, sim >= 0.88 => reject;
// (4) pass => status answered + enqueue straightman.
//
// Budget: embed p95 <800ms + prescreen <1500ms + pgvector <200ms (<3s total);
// flake => retry 1x then requeue (BullMQ backoff, never Edge).

const { createHash } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { prescreen } = require("../mimo");
const { embedBatch, cosine } = require("../embed");

const DEDUP_SIM = 0.88;
const prisma = new PrismaClient();

async function fewShotNonHoldout(category) {
  const rows = await prisma.$queryRaw`
    SELECT b.question, r.answer, o.result
    FROM "Bit" b
    JOIN "ComedianReveal" r ON r.bit_id = b.id
    JOIN "Outcome" o ON o.bit_id = b.id
    WHERE b."is_holdout" = false AND b.category = ${category}::"Category"
      AND o.result IN ('killed_it','bombed')
    ORDER BY b.created_at DESC LIMIT 4`;
  return rows;
}

async function nearestSim(embedding) {
  const rows = await prisma.$queryRaw`
    SELECT id, 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) AS sim
    FROM "Bit" WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector LIMIT 1`;
  return rows[0] ?? null;
}

async function run(job) {
  const { bitId } = job.data;
  const bit = await prisma.bit.findUnique({ where: { id: bitId } });
  if (!bit || bit.status !== "screening") return { skipped: true };

  const gate = await prescreen({
    category: bit.category,
    scenario: bit.scenario,
    question: bit.question,
    fewShot: await fewShotNonHoldout(bit.category),
  }).catch(() => null);
  if (!gate) throw new Error("prescreen flake — retry via backoff");

  if (gate.self_harm) {
    await prisma.bit.update({ where: { id: bitId }, data: { status: "rejected_prescreen", reject_reason: "crisis_support" } });
    return { rejected: "crisis_modal_shown" }; // API layer renders the support modal, bit never processed
  }
  if (!gate.pass || gate.pii || (gate.clarity ?? 1) < 0.4) {
    await prisma.bit.update({
      where: { id: bitId },
      data: { status: "rejected_prescreen", reject_reason: (gate.reasons ?? ["prescreen"]).join(";").slice(0, 200) },
    });
    return { rejected: true };
  }

  const [vec] = await embedBatch([`${bit.scenario}\n${bit.question}`]);
  const near = await nearestSim(vec);
  if (near && Number(near.sim) >= DEDUP_SIM) {
    await prisma.bit.update({ where: { id: bitId }, data: { status: "rejected_prescreen", reject_reason: `duplicate sim=${Number(near.sim).toFixed(3)} of ${near.id}` } });
    return { rejected: "duplicate" };
  }

  const contentHash = createHash("sha256").update(`${bit.category}|${bit.scenario}|${bit.question}`).digest("hex");
  await prisma.bit.update({ where: { id: bitId }, data: { status: "answered", content_hash: contentHash } });
  await prisma.$executeRaw`UPDATE "Bit" SET embedding = ${JSON.stringify(vec)}::vector WHERE id = ${bitId}`;
  return { passed: true, contentHash };
}

module.exports = { run, DEDUP_SIM };
