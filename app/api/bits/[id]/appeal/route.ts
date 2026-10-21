import { NextResponse } from "next/server";
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

// POST /api/bits/[id]/appeal {wallet, reason<=500}
// 1 appeal per bit AND max 1 appeal per day per user. Only bombed/heckled_off bits.
// Creates Appeal + 7 retrial CrowdAssignments (is_retrial, round 2,
// excluding round-1 jurors & colluding accounts).
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return bad("missing id", 400);

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
  const reason = typeof b.reason === "string" ? b.reason : "";
  if (!reason || reason.length > 500) {
    return bad("reason must be 1-500 chars", 400);
  }

  try {
    const prisma = getPrisma();
    const auth = await requireWalletSession(req, prisma, wallet);
    if (!auth.ok) return auth.response;

    const bit = await prisma.bit.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        user_id: true,
        outcome: { select: { result: true } },
        user: {
          select: {
            id: true,
            wallet: true,
            device_hash: true,
            ip_subnet: true,
            funding_source: true,
          },
        },
      },
    });
    if (!bit) return bad("bit not found", 404);
    if (bit.user.wallet.toLowerCase() !== wallet) {
      return bad("only the author can appeal", 403);
    }
    if (bit.status !== "bombed" && bit.status !== "heckled_off") {
      return bad("only bombed or heckled_off bits can be appealed", 409);
    }
    // A self-conceded "Got it" also writes status=bombed, but no Outcome
    // exists because the Crowd never voted. It must never create a retrial.
    if (!bit.outcome || bit.outcome.result !== bit.status) {
      return bad("no Crowd verdict exists to appeal", 409);
    }
    const prior = await prisma.appeal.findFirst({
      where: { bit_id: id },
      select: { id: true },
    });
    if (prior) return bad("appeal already filed for this bit", 409);

    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const recentUserAppeal = await prisma.appeal.findFirst({
      where: { user_id: bit.user_id, created_at: { gt: dayAgo } },
      select: { id: true },
    });
    if (recentUserAppeal) {
      return bad("only 1 appeal allowed per 24 hours", 429);
    }

    const round1 = await prisma.crowdAssignment.findMany({
      where: { bit_id: id, round: 1 },
      select: { juror_id: true },
    });
    const excluded = new Set<string>([
      bit.user_id,
      ...round1.map((r) => r.juror_id),
    ]);
    const rawCandidates = await prisma.user.findMany({
      where: {
        onboarding_passed: true,
        id: { notIn: [...excluded] },
        // Seed/probe wallets are fixtures, not people — same rule as the
        // verdict route; a retrial seated on fixtures can never settle.
        NOT: { wallet: { startsWith: "0x000000000000000000000000" } },
      },
      select: {
        id: true,
        crowd_tier: true,
        device_hash: true,
        ip_subnet: true,
        funding_source: true,
      },
      take: 50,
    });
    const candidates = rawCandidates.filter((c) => !isColluding(bit.user, c));
    shuffleInPlace(candidates);
    const picked = candidates.slice(0, 7);
    const expires_at = new Date(Date.now() + 48 * 3600 * 1000);

    const appeal = await prisma.appeal.create({
      data: {
        bit_id: id,
        user_id: bit.user_id,
        reason,
        status: picked.length >= 7 ? "retrial_open" : "pending",
        retrial_round: 2,
      },
      select: { id: true },
    });
    await prisma.$transaction(
      picked.map((j) =>
        prisma.crowdAssignment.create({
          data: {
            bit_id: id,
            juror_id: j.id,
            is_retrial: true,
            round: 2,
            vote_weight: TIER_WEIGHT[j.crowd_tier] ?? 1.0,
            position_ai: Math.random() < 0.5 ? "A" : "B",
            expires_at,
          },
        }),
      ),
    );
    await prisma.bit.update({
      where: { id },
      data: { retrial_round: 2, status: "disputed" },
    });

    await enqueueJob("five-minute-ops", "tick", { bitId: id, appealId: appeal.id });
    return NextResponse.json(
      { appealId: appeal.id, bitId: id, jurors: picked.length },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("appeal unavailable", 503);
  }
}
