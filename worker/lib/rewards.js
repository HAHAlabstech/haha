"use strict";
// Epoch reward math (plan §4.7) — BigInt micro-USDG throughout, Float NEVER
// for money (Float only for score/ratios).
//
// score = win_strength × fairness × stage_mult × tier_mult × category_mult
//   stage_mult: open_mic 1.0 / pro 2.5 (Pro = thinking-on full, holdout + premium dataset)
//   category_mult default 1.0, max 1.25
// raw = floor(pool × score / Σscore)  (integer micro, floor)
// Per-account 5% cap (aggregate over ALL bits of that account): iterate
// until nobody exceeds cap (max 5 iterations); undivided remainder rolls to
// the NEXT epoch pool (never burned, never to operator).
// Claim dust < $1.00 (1_000000 micro) rolls over; user pays gas (no paymaster).

const { STAGE_MULT, TIER_MULT, CATEGORY_MULT_CAP } = require("./quorum");

const CAP_BPS = 500; // 5%
const MAX_ITERS = 5;
const DUST_MICRO = 1_000_000n; // $1.00

function scoreOf({ win_strength, fairness, stage, comedian_tier, category_mult = 1.0 }) {
  const s = Number(win_strength) * Number(fairness)
    * (STAGE_MULT[stage] ?? 1.0)
    * (TIER_MULT[comedian_tier] ?? 1.0)
    * Math.min(Number(category_mult), CATEGORY_MULT_CAP);
  return s;
}

// entries: [{ account, score }] (score>0 only). poolMicro: bigint.
// Returns { payouts: Map(account->bigint), rollover: bigint }.
function distribute(poolMicro, entries) {
  const total = entries.reduce((a, e) => a + e.score, 0);
  const payouts = new Map();
  if (total <= 0 || poolMicro <= 0n) return { payouts, rollover: poolMicro };
  for (const e of entries) payouts.set(e.account, (poolMicro * BigInt(Math.floor(e.score * 1e9))) / BigInt(Math.floor(total * 1e9)));

  // Iterative 5%-per-account cap (max 5 iterations).
  const cap = (poolMicro * BigInt(CAP_BPS)) / 10_000n;
  for (let i = 0; i < MAX_ITERS; i++) {
    let over = 0n;
    let underScore = 0;
    for (const [acct, amt] of payouts) {
      if (amt > cap) { over += amt - cap; payouts.set(acct, cap); }
      else underScore += entries.find((e) => e.account === acct).score;
    }
    if (over === 0n) break;
    if (underScore <= 0) break; // everyone capped: remainder rolls over
    for (const [acct, amt] of payouts) {
      if (amt < cap) {
        const s = entries.find((e) => e.account === acct).score;
        payouts.set(acct, amt + (over * BigInt(Math.floor(s * 1e9))) / BigInt(Math.floor(underScore * 1e9)));
      }
    }
  }
  // Clamp again post-redistribution (converges within MAX_ITERS in practice),
  // then roll over the undistributed remainder.
  let paid = 0n;
  for (const [acct, amt] of payouts) {
    const c = amt > cap ? cap : amt;
    payouts.set(acct, c);
    paid += c;
  }
  return { payouts, rollover: poolMicro - paid };
}

module.exports = { scoreOf, distribute, CAP_BPS, MAX_ITERS, DUST_MICRO };
