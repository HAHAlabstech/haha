import { NextResponse } from "next/server";
import { type VoteChoice, type FairnessChoice } from "@prisma/client";
import {
  bad,
  enqueueJob,
  getPrisma,
  isColluding,
  requireWalletSession,
  shuffleInPlace,
  TIER_WEIGHT,
} from "@/lib/server";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;
const VOTES_TO_DECIDE = 5;
const EXTENSION_VOTES = 2;

// POST /api/crowd/[assignmentId] {wallet, vote: A|B|both_right|both_wrong, fairness: fair|unfair}
// Canonical tally (plan §4.4, mirrors worker/lib/quorum.js): both_right counts
// for AI ONLY, win = comedian/total; thin zones expand to 7 before final.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await ctx.params;
  if (!assignmentId) return bad("missing assignmentId", 400);

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return bad("Failed to read request body", 400);
  }
  if (raw.length > MAX_BODY_BYTES) return bad("Request too large", 413);
  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    return bad("Invalid JSON", 400);
  }
  const b = body as Record<string, unknown>;
  const wallet = (
    typeof b.wallet === "string" ? b.wallet : ""
  ).toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(wallet)) return bad("invalid wallet", 400);
  const vote = typeof b.vote === "string" ? b.vote : "";
  if (
    vote !== "A" &&
    vote !== "B" &&
    vote !== "both_right" &&
    vote !== "both_wrong"
  ) {
    return bad("invalid vote", 400);
  }
  const fairness = typeof b.fairness === "string" ? b.fairness : "";
  if (fairness !== "fair" && fairness !== "unfair") {
    return bad("invalid fairness", 400);
  }

  try {
    const prisma = getPrisma();
    const auth = await requireWalletSession(req, prisma, wallet);
    if (!auth.ok) return auth.response;

    const assignment = await prisma.crowdAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        juror: { select: { id: true, wallet: true, crowd_tier: true } },
        bit: {
          select: {
            id: true,
            user_id: true,
            is_plant_bank: true,
            plant_correct_pos: true,
            user: {
              select: {
                id: true,
                device_hash: true,
                ip_subnet: true,
                funding_source: true,
              },
            },
          },
        },
      },
    });
    if (!assignment) return bad("assignment not found", 404);
    if (assignment.juror.wallet.toLowerCase() !== wallet) {
      return bad("assignment belongs to another juror", 403);
    }
    if (assignment.vote != null) return bad("already voted", 409);
    if (assignment.expires_at.getTime() < Date.now()) {
      return bad("assignment expired", 410);
    }

    const weight = TIER_WEIGHT[assignment.juror.crowd_tier] ?? 1.0;
    await prisma.crowdAssignment.update({
      where: { id: assignmentId },
      data: {
        vote: vote as VoteChoice,
        fairness: fairness as FairnessChoice,
        vote_weight: weight,
        voted_at: new Date(),
      },
    });

    if (assignment.is_plant || assignment.bit.is_plant_bank) {
      const expected = assignment.bit.plant_correct_pos ?? "A";
      const passedPlant = vote === expected && fairness === "fair";
      await prisma.user.update({
        where: { id: assignment.juror.id },
        data: {
          plant_total: { increment: 1 },
          ...(passedPlant
            ? { plant_correct: { increment: 1 }, crowd_rep: { increment: 1 } }
            : {}),
        },
      });
    }

    const round = assignment.round;
    const voted = await prisma.crowdAssignment.findMany({
      where: {
        bit_id: assignment.bit_id,
        round,
        vote: { not: null },
      },
      select: {
        juror_id: true,
        vote: true,
        fairness: true,
        vote_weight: true,
        position_ai: true,
      },
    });
    if (voted.length < VOTES_TO_DECIDE) {
      return NextResponse.json(
        { saved: true, votes: voted.length },
        { headers: { "cache-control": "no-store" } },
      );
    }

    let comedianW = 0;
    let aiW = 0;
    let bothWrongW = 0;
    let fairW = 0;
    let totalW = 0;
    for (const v of voted) {
      const w = v.vote_weight;
      totalW += w;
      if (v.vote === "both_wrong") {
        bothWrongW += w;
        continue;
      }
      if (v.fairness === "fair") fairW += w;
      if (v.vote === "both_right") {
        aiW += w;
        continue;
      }
      // A/B: attribute via blind position_ai.
      const pickedAi =
        (v.vote === "A" && v.position_ai === "A") ||
        (v.vote === "B" && v.position_ai === "B");
      if (pickedAi) aiW += w;
      else comedianW += w;
    }
    const winStrength = totalW > 0 ? comedianW / totalW : 0;
    const fairRatio = totalW > 0 ? fairW / totalW : 0;

    const totalAssignments = await prisma.crowdAssignment.count({
      where: { bit_id: assignment.bit_id, round },
    });
    const thin =
      (winStrength >= 0.5 && winStrength < 0.65) ||
      (fairRatio >= 0.5 && fairRatio < 0.65) ||
      (fairRatio > 0.35 && fairRatio <= 0.45);
    if (thin && totalAssignments <= VOTES_TO_DECIDE) {
      const seated = await prisma.crowdAssignment.findMany({
        where: { bit_id: assignment.bit_id },
        select: { juror_id: true },
      });
      const excluded = new Set<string>([
        assignment.bit.user_id,
        ...seated.map((s) => s.juror_id),
      ]);
      const rawCandidates = await prisma.user.findMany({
        where: {
          onboarding_passed: true,
          id: { notIn: [...excluded] },
          // Signless seed wallets can never sign a ballot — seating them as
          // extension jurors blocked the 7-vote finalize for the full SLA.
          NOT: { wallet: { startsWith: "0x000000000000000000000000" } },
        },
        select: {
          id: true,
          crowd_tier: true,
          device_hash: true,
          ip_subnet: true,
          funding_source: true,
        },
        take: 30,
      });
      const candidates = rawCandidates.filter(
        (c) => !isColluding(assignment.bit.user, c),
      );
      shuffleInPlace(candidates);
      const picked = candidates.slice(0, EXTENSION_VOTES);
      const expires_at = new Date(Date.now() + 30 * 60 * 1000); // SLA 30 min — same as the primary quorum (plan §7); stale extensions blocked liveness.
      await prisma.$transaction(
        picked.map((j) =>
          prisma.crowdAssignment.create({
            data: {
              bit_id: assignment.bit_id,
              juror_id: j.id,
              is_retrial: assignment.is_retrial,
              round,
              vote_weight: TIER_WEIGHT[j.crowd_tier] ?? 1.0,
              position_ai: Math.random() < 0.5 ? "A" : "B",
              expires_at,
            },
          }),
        ),
      );
      return NextResponse.json(
        {
          saved: true,
          votes: voted.length,
          status: "extended",
          added: picked.length,
        },
        { headers: { "cache-control": "no-store" } },
      );
    }

    if (thin && voted.length < VOTES_TO_DECIDE + EXTENSION_VOTES) {
      return NextResponse.json(
        { saved: true, votes: voted.length, status: "waiting_extension" },
        { headers: { "cache-control": "no-store" } },
      );
    }

    const result =
      winStrength >= 0.6 && fairRatio >= 0.6
        ? "killed_it"
        : fairRatio <= 0.4
          ? "heckled_off"
          : "bombed";

    await prisma.outcome.upsert({
      where: { bit_id: assignment.bit_id },
      update: {
        result,
        comedian_votes: comedianW,
        ai_votes: aiW,
        total_weight: totalW,
        both_wrong_weight: bothWrongW,
        juror_count: voted.length,
        fair_ratio: fairRatio,
        win_strength: winStrength,
        decided_at: new Date(),
      },
      create: {
        bit_id: assignment.bit_id,
        result,
        comedian_votes: comedianW,
        ai_votes: aiW,
        total_weight: totalW,
        both_wrong_weight: bothWrongW,
        juror_count: voted.length,
        fair_ratio: fairRatio,
        win_strength: winStrength,
      },
    });

    // Post-killed_it 15% holdout lottery (training-set sampling).
    const holdout = result === "killed_it" && Math.random() < 0.15;
    await prisma.bit.update({
      where: { id: assignment.bit_id },
      data: {
        status: result as "killed_it" | "bombed" | "heckled_off",
        ...(holdout ? { is_holdout: true } : {}),
      },
    });

    // Update comedian reputation & resolve any open appeal on round >= 2.
    if (result === "killed_it") {
      await prisma.user.update({
        where: { id: assignment.bit.user_id },
        data: { comedian_rep: { increment: 1 } },
      });
    } else if (result === "heckled_off") {
      await prisma.user.update({
        where: { id: assignment.bit.user_id },
        data: { comedian_rep: { decrement: 1 } },
      });
    }

    if (round >= 2) {
      await prisma.appeal.updateMany({
        where: {
          bit_id: assignment.bit_id,
          status: { in: ["pending", "retrial_open"] },
        },
        data: {
          status: "resolved",
          retrial_outcome: result,
          resolved_by: "CROWD_RETRIAL",
          resolved_at: new Date(),
        },
      });
      if (result !== "killed_it") {
        await prisma.user.update({
          where: { id: assignment.bit.user_id },
          data: { comedian_rep: { decrement: 1 } },
        });
      }
    }

    // Share card render (5-min-ops settles render inline; app-settled bits
    // enqueue — enqueue failure must never fail the vote itself).
    try {
      await enqueueJob("share-card", "render", { bitId: assignment.bit_id });
    } catch (e) {
      console.error("share-card enqueue failed", assignment.bit_id, e);
    }

    return NextResponse.json(
      { saved: true, votes: voted.length, status: result, holdout },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("vote unavailable", 503);
  }
}
