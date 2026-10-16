"use strict";
// Job: straightman — The Straight Man answers via MiMo 2.6 Pro (plan §2.3).
// Two tables, disclosed at /stage + /seasons:
//   open_mic: thinking DISABLED, temp 0.3 (fast/cheap, "weakened" label)
//   pro:      thinking ENABLED, temp 0.7, max 600 tokens, prefix-cached
//             season playbook (strong, expensive — subscriber-safe)
// Stores StraightManAnswer + model_version + response_hash (T13: upstream
// change => automatic holdout regression). Bit stays `answered` until the
// comedian reveals (verdict), which opens crowd assignment.

const { createHash } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { straightMan } = require("../mimo");

const prisma = new PrismaClient();

async function run(job) {
  const { bitId } = job.data;
  const bit = await prisma.bit.findUnique({ where: { id: bitId }, include: { season: true } });
  if (!bit) return { skipped: true };
  const exists = await prisma.straightManAnswer.findUnique({ where: { bit_id: bitId } });
  if (exists) return { skipped: "already_answered" };

  const stage = bit.stage === "pro" ? "pro" : "open_mic"; // stage_mult 1.0 / 2.5
  const out = await straightMan({ stage, seasonPlaybook: bit.season.system_playbook, scenario: bit.scenario, question: bit.question });
  const responseHash = createHash("sha256").update(JSON.stringify({ a: out.answer, r: out.reasoning })).digest("hex");

  await prisma.straightManAnswer.create({
    data: {
      bit_id: bitId, season_id: bit.season_id,
      answer: String(out.answer).slice(0, 300),
      reasoning: String(out.reasoning ?? "").slice(0, 300),
      confidence: Number(out.confidence ?? 0.5),
      model_version: out.model_version, response_hash: responseHash, latency_ms: out.latency_ms,
    },
  });
  return { stage, model_version: out.model_version, responseHash };
}

module.exports = { run };
