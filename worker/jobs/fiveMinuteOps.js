"use strict";
// Job: five-minute-ops (BullMQ repeatable */5, re-entrant via CronJobRun).
// (1) expire SLA-30min assignments; thin 5->7 expansion top-ups (decide()
//     from lib/quorum; T11: 2-vs-3 heckled NEVER final at 5);
// (2) retry pending A/B normalizations (normalize job);
// (3) plant stage-2 validation: candidates (age>7d, consensus 7/7 or 5/5
//     unanimous + fair 1.0, not expired 30d) get 5 validation assignments to
//     FRESH jurors (exclude originals + related accounts); 5/5 agreement =>
//     is_plant_bank=true; max 5 promotions/day;
// (4) appeal retrials: 1 appeal per bit (bombed/heckled_off only) => 7 fresh
//     juror assignments (round=2); final overwrites Outcome,
//     resolved_by=CROWD_RETRIAL; lose => comedian_rep -1 (anti-spam);
// (5) resume any CronJobRun stuck in non-terminal stage.

const { PrismaClient } = require("@prisma/client");
const { decide } = require("../lib/quorum");
const normalize = require("./normalize");

const prisma = new PrismaClient();
const SLA_MIN = 30;
const EXPAND_TO = 7;

function toVote(a) {
  // position_ai: which slot ("A"|"B") holds the AI answer.
  const votedA = a.vote === "A";
  const aiIsA = a.position_ai === "A";
  const forAI = (votedA && aiIsA) || (!votedA && !aiIsA);
  return {
    weight: a.vote_weight,
    forComedian: !forAI && a.vote !== "both_right" && a.vote !== "both_wrong",
    forAI, bothRight: a.vote === "both_right", bothWrong: a.vote === "both_wrong",
    fair: a.fairness === "fair",
  };
}

async function settleBit(bitId) {
  const votes = (await prisma.crowdAssignment.findMany({ where: { bit_id: bitId, voted_at: { not: null } } })).map(toVote);
  const d = decide(votes);
  if (d.action === "expand") {
    const have = await prisma.crowdAssignment.count({ where: { bit_id: bitId } });
    const need = EXPAND_TO - have;
    if (need > 0) await topUpJurors(bitId, need, 1, false);
    return { bitId, action: "expand" };
  }
  if (d.action === "final") {
    await prisma.outcome.upsert({
      where: { bit_id: bitId },
      create: {
        bit_id: bitId, result: d.result, comedian_votes: d.comedian, ai_votes: d.ai,
        total_weight: d.total, both_wrong_weight: d.wrong, juror_count: d.count,
        fair_ratio: d.fair_ratio, win_strength: d.win_strength,
      },
      update: {
        result: d.result, comedian_votes: d.comedian, ai_votes: d.ai,
        total_weight: d.total, both_wrong_weight: d.wrong, juror_count: d.count,
        fair_ratio: d.fair_ratio, win_strength: d.win_strength, decided_at: new Date(),
      },
    });
    await prisma.bit.update({ where: { id: bitId }, data: { status: d.result } });
    return { bitId, action: "final", result: d.result };
  }
  return { bitId, action: d.action };
}

async function topUpJurors(bitId, n, round, isRetrial) {
  // SKIP LOCKED anti-race + related-account filter happen in /crowd/next at
  // claim time; here we only create open slots bound to eligible jurors.
  const bit = await prisma.bit.findUnique({ where: { id: bitId }, include: { assignments: true } });
  const exclude = new Set(bit.assignments.map((a) => a.juror_id));
  if (isRetrial && bit.user_id) exclude.add(bit.user_id);
  const jurors = await prisma.user.findMany({
    where: {
      id: { notIn: [...exclude] },
      onboarding_passed: true,
      NOT: { wallet: { startsWith: "0x000000000000000000000000" } },
    },
    orderBy: { created_at: "asc" }, take: Math.max(n * 3, n),
  });
  const expires = new Date(Date.now() + SLA_MIN * 60_000);
  let made = 0;
  for (const j of jurors) {
    if (made >= n) break;
    try {
      await prisma.crowdAssignment.create({
        data: {
          bit_id: bitId, juror_id: j.id, is_retrial: isRetrial, round,
          vote_weight: { walk_in: 1.0, regular: 1.15, front_row: 1.3, critic: 1.5 }[j.crowd_tier] ?? 1.0,
          position_ai: Math.random() < 0.5 ? "A" : "B", expires_at: expires,
        },
      });
      made++;
    } catch { /* unique race — next juror */ }
  }
  return made;
}

async function run(job) {
  const epoch = Number(job.data.epoch_number ?? 0);
  const idem = `five-minute-ops:${new Date().toISOString().slice(0, 16)}`;
  await prisma.cronJobRun.upsert({
    where: { idempotency_key: idem },
    create: { job_name: "five-minute-ops", stage: `tick:${idem}`, epoch_number: epoch, idempotency_key: idem, status: "started" },
    update: { status: "started", attempt: { increment: 1 } },
  });

  // (1) expire + settle in-crowd bits
  const open = await prisma.bit.findMany({ where: { status: { in: ["disputed", "in_crowd"] } }, select: { id: true } });
  const settled = [];
  for (const b of open) {
    await prisma.crowdAssignment.deleteMany({ where: { bit_id: b.id, voted_at: null, expires_at: { lt: new Date() } } });
    settled.push(await settleBit(b.id));
  }

  // (2) retry pending normalizations
  const pendingNorm = await prisma.$queryRaw`
    SELECT b.id FROM "Bit" b LEFT JOIN "StraightManAnswer" s ON s.bit_id=b.id
    LEFT JOIN "ComedianReveal" r ON r.bit_id=b.id
    WHERE (s.normalized_text IS NULL OR r.bit_id IS NOT NULL AND r.normalized_text IS NULL) LIMIT 20`;
  for (const p of pendingNorm) { try { await normalize.run({ data: { bitId: p.id } }); } catch { /* next tick */ } }

  // (3) plant stage-2 validation (max 5 promotions/day, candidates expire 30d)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const promotedToday = await prisma.bit.count({ where: { is_plant_bank: true, created_at: { gte: today } } });
  let promotions = 0;
  if (promotedToday < 5) {
    const sevenDays = new Date(Date.now() - 7 * 86400_000);
    const thirtyDays = new Date(Date.now() - 30 * 86400_000);
    const cands = await prisma.bit.findMany({
      where: { plant_candidate_at: { lt: sevenDays, gt: thirtyDays }, is_plant_bank: false }, take: 5 - promotedToday,
    });
    for (const c of cands) {
      const vals = await prisma.crowdAssignment.findMany({ where: { bit_id: c.id, is_validation: true, voted_at: { not: null } } });
      if (vals.length >= 5 && vals.every((v) => v.vote !== "both_wrong")) {
        await prisma.bit.update({ where: { id: c.id }, data: { is_plant_bank: true, plant_validation_count: vals.length } });
        promotions++;
      } else if (vals.length < 5) {
        await topUpJurors(c.id, 5 - vals.length, 1, false);
        await prisma.crowdAssignment.updateMany({ where: { bit_id: c.id, voted_at: null }, data: { is_validation: true } });
      }
    }
  }

  // (4) appeal retrials (7 fresh jurors, round=2)
  const appeals = await prisma.appeal.findMany({ where: { status: "pending" }, take: 10 });
  for (const ap of appeals) {
    const made = await topUpJurors(ap.bit_id, 7, 2, true);
    await prisma.appeal.update({ where: { id: ap.id }, data: { status: made >= 7 ? "retrial_open" : "pending" } });
  }
  // finalize retrials with 7 votes in
  const retrials = await prisma.bit.findMany({ where: { retrial_round: { gte: 2 }, status: { in: ["disputed", "in_crowd"] } }, select: { id: true } });
  for (const r of retrials) {
    const s = await settleBit(r.id);
    if (s.action === "final") {
      const ap = await prisma.appeal.findFirst({ where: { bit_id: r.id, status: "retrial_open" } });
      if (ap) {
        const won = s.result === "killed_it";
        await prisma.appeal.update({ where: { id: ap.id }, data: { status: "resolved", retrial_outcome: s.result, resolved_by: "CROWD_RETRIAL", resolved_at: new Date() } });
        if (!won) await prisma.user.update({ where: { id: ap.user_id }, data: { comedian_rep: { decrement: 1 } } });
      }
    }
  }

  await prisma.cronJobRun.update({ where: { idempotency_key: idem }, data: { status: "done" } });
  return { settled: settled.length, promotions, appeals: appeals.length };
}

module.exports = { run, settleBit, topUpJurors };
