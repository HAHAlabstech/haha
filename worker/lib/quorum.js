"use strict";
// Canonical quorum math (plan §4.4) — single implementation shared by the
// API route and the five-minute-ops worker. Weighted votes; snapshot weight
// per CrowdAssignment.vote_weight (walk_in 1.00 / regular 1.15 /
// front_row 1.30 / critic 1.50).
//
// W_total    = Σw all votes cast
// W_comedian = Σw votes for the comedian's position
// W_ai       = Σw votes for AI + Σw both_right
// W_wrong    = Σw both_wrong (denominator only, never numerator)
// win_strength = W_comedian / W_total
// fair_ratio   = W_fair / W_total  (weighted; both_right/both_wrong count in W_total)
//
// Evaluation order: (1) <5 votes -> wait; (2) 5 votes + thin zone ->
// expand to 7, DO NOT finalize; (3) finalize only on 7 votes or 5
// non-thin votes. Thin zones: 0.50<=win<0.65 OR 0.50<=fair<0.65 OR
// 0.35<fair<=0.45 (thin-heckled; T11: 2-vs-3 must not finalize at 5).
// Final: killed_it (win>=0.60 AND fair>=0.60) | heckled_off (fair<=0.40) | bombed.

function tally(votes) {
  // votes: [{ weight, forComedian: bool, forAI: bool, bothRight, bothWrong, fair: bool }]
  let total = 0, comedian = 0, ai = 0, wrong = 0, fair = 0;
  for (const v of votes) {
    total += v.weight;
    // Fairness is a separate axis from the pick: a both_right or both_wrong
    // with fairness=fair still counts toward fair_ratio (mirrors the API
    // route's tally exactly — this was previously divergent and worker
    // settlement could contradict the route's recorded outcome).
    if (v.fair) fair += v.weight;
    if (v.bothWrong) { wrong += v.weight; continue; }
    if (v.bothRight) { ai += v.weight; continue; }
    if (v.forComedian) comedian += v.weight;
    else ai += v.weight;
  }
  const win = total > 0 ? comedian / total : 0;
  const fairRatio = total > 0 ? fair / total : 0;
  return { total, comedian, ai, wrong, win_strength: win, fair_ratio: fairRatio, count: votes.length };
}

function isThin({ win_strength, fair_ratio }) {
  return (
    (win_strength >= 0.5 && win_strength < 0.65) ||
    (fair_ratio >= 0.5 && fair_ratio < 0.65) ||
    (fair_ratio > 0.35 && fair_ratio <= 0.45)
  );
}

// Returns { action: "wait" | "expand" | "final", result?, ...tally }.
function decide(votes) {
  const t = tally(votes);
  if (t.count < 5) return { action: "wait", ...t };
  if (t.count === 5 && isThin(t)) return { action: "expand", ...t };
  if (t.count < 7 && isThin(t)) return { action: "wait", ...t }; // 6th in, still thin
  let result = "bombed";
  if (t.win_strength >= 0.6 && t.fair_ratio >= 0.6) result = "killed_it";
  else if (t.fair_ratio <= 0.4) result = "heckled_off";
  return { action: "final", result, ...t };
}

const STAGE_MULT = { open_mic: 1.0, pro: 2.5 };
const TIER_MULT = { open_mic: 1.0, opener: 1.07, feature: 1.15, headliner: 1.22, legend: 1.3 };
const CATEGORY_MULT_CAP = 1.25;

module.exports = { tally, isThin, decide, STAGE_MULT, TIER_MULT, CATEGORY_MULT_CAP };
