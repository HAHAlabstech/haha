"use strict";
// Job: season-upgrade (BullMQ every 14 days). Compiles the Season playbook
// (MiMo-API max, kind=mimo_playbook_max — weights are closed, never LoRA'd;
// DPO export ai_wrong-vs-comedian_right ships every epoch for future
// open-weight use). Pipeline: hybrid retrieval (HNSW cosine + category/
// season filter + rerank) -> prefix-static playbook (prompt-cache hit) ->
// canary 10% -> full. AUTO-RELEASE gate (D4): holdout n>=200 AND Δ>=+3%
// AND p<0.05, else hold + automatic rollback to previous active season.

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const GATE = { n: 200, delta: 0.03, p: 0.05, canary: 0.1 };

// Welch's t-test p-value (one-sided, normal approx) for holdout A/B.
function pValue(meanA, varA, nA, meanB, varB, nB) {
  const se = Math.sqrt(varA / nA + varB / nB);
  if (se === 0) return 1;
  const z = (meanB - meanA) / se;
  return 0.5 * (1 - erf(z / Math.SQRT2)); // P(B > A)
}
function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

async function holdoutStats(seasonId) {
  const rows = await prisma.$queryRaw`
    SELECT o.win_strength::float AS w FROM "Outcome" o JOIN "Bit" b ON b.id=o.bit_id
    WHERE b.season_id = ${seasonId} AND b.is_holdout = true AND o.result IN ('killed_it','bombed')`;
  const ws = rows.map((r) => r.w);
  if (!ws.length) return { n: 0, mean: 0, variance: 0 };
  const mean = ws.reduce((a, b) => a + b, 0) / ws.length;
  return { n: ws.length, mean, variance: ws.reduce((a, b) => a + (b - mean) ** 2, 0) / ws.length };
}

async function run(job) {
  const active = await prisma.season.findFirst({ where: { is_active: true } });
  if (!active) throw new Error("no active season");
  const stats = await holdoutStats(active.id);

  // Candidate playbook compiled from losing patterns (observability logger,
  // opus-5.5 thinking-enabled) - text assembly, no weight updates.
  const candidate = await prisma.season.create({
    data: {
      name: `${active.name}+${Date.now()}`,
      base_model: "opus-5.5",
      system_playbook: `${active.system_playbook}\n[canary ${(job.data.playbookDelta ?? "").slice(0, 2000)}]`,
      kind: "opus_playbook_max",
      holdout_set_id: active.holdout_set_id,
      eval_harness: "crowd_retrial_blind_v1",
      notes: `canary ${(GATE.canary * 100).toFixed(0)}% of open_mic traffic`,
    },
  });

  // Gate on the CANDIDATE's canary holdout slice vs active (evaluated next
  // cycle); this cycle: enforce gate for the PREVIOUS candidate if present.
  const prev = job.data.candidateSeasonId ? await prisma.season.findUnique({ where: { id: job.data.candidateSeasonId } }) : null;
  let decision = { action: "hold_canary", candidate: candidate.id, stats };
  if (prev) {
    const base = await holdoutStats(active.id);
    const cand = await holdoutStats(prev.id);
    const delta = cand.mean - base.mean;
    const p = pValue(base.mean, base.variance, base.n, cand.mean, cand.variance, cand.n);
    const pass = cand.n >= GATE.n && delta >= GATE.delta && p < GATE.p;
    if (pass) {
      await prisma.$transaction([
        prisma.season.update({ where: { id: active.id }, data: { is_active: false } }),
        prisma.season.update({ where: { id: prev.id }, data: { is_active: true, released_at: new Date(), holdout_n: cand.n, holdout_score: cand.mean } }),
      ]);
      decision = { action: "promoted", season: prev.id, delta, p, n: cand.n };
    } else {
      // automatic rollback: candidate deactivated (never served), active kept
      await prisma.season.update({ where: { id: prev.id }, data: { notes: `rolled back: n=${cand.n} Δ=${delta.toFixed(4)} p=${p.toFixed(4)}` } });
      decision = { action: "rolled_back", season: prev.id, delta, p, n: cand.n };
    }
  }
  return decision;
}

module.exports = { run, GATE, pValue };
