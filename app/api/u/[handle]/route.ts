import { NextResponse } from "next/server";
import { bad, getPrisma, jsonBig } from "@/lib/server";

export const dynamic = "force-dynamic";

// GET /api/u/[handle] -> lookup user profile by handle or wallet address, along with stats and recent public non-holdout bits.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string }> },
) {
  const { handle: rawHandle } = await ctx.params;
  const cleaned = decodeURIComponent(rawHandle || "").replace(/^@/, "").trim();
  if (!cleaned) return bad("missing handle");

  try {
    const prisma = getPrisma();
    const isWallet = /^0x[0-9a-fA-F]{40}$/.test(cleaned);
    const user = await prisma.user.findFirst({
      where: isWallet
        ? { wallet: cleaned.toLowerCase() }
        : { handle: { equals: cleaned, mode: "insensitive" } },
    });

    if (!user) {
      return NextResponse.json(
        {
          ok: true,
          found: false,
          profile: {
            wallet: isWallet ? cleaned.toLowerCase() : null,
            handle: cleaned,
            comedian_tier: "open_mic",
            comedian_rep: 0,
            crowd_tier: "walk_in",
            crowd_rep: 0,
            onboarding_passed: false,
          },
          stats: {
            bits_count: 0,
            killed_it_count: 0,
            crowd_votes_count: 0,
            earned_usdg_micro: "0",
          },
          recent_bits: [],
        },
        { headers: { "cache-control": "no-store" } },
      );
    }

    const [bitsCount, killedItCount, crowdVotesCount, rewardAgg, recentBits] =
      await Promise.all([
        prisma.bit.count({ where: { user_id: user.id } }),
        prisma.bit.count({
          where: {
            user_id: user.id,
            status: "killed_it",
          },
        }),
        prisma.crowdAssignment.count({
          where: { juror_id: user.id, is_plant: false, voted_at: { not: null } },
        }),
        prisma.reward.aggregate({
          where: { user_id: user.id },
          _sum: { amount_micro_usdg: true },
        }),
        prisma.bit.findMany({
          where: {
            user_id: user.id,
            is_holdout: false,
            share_public: true,
            status: { in: ["killed_it", "bombed", "in_crowd", "answered"] },
          },
          orderBy: { created_at: "desc" },
          take: 10,
          select: {
            id: true,
            category: true,
            scenario: true,
            question: true,
            stage: true,
            status: true,
            created_at: true,
            outcome: {
              select: {
                result: true,
                fair_ratio: true,
                win_strength: true,
                decided_at: true,
              },
            },
          },
        }),
      ]);

    return jsonBig({
      ok: true,
      found: true,
      profile: {
        wallet: user.wallet,
        handle: user.handle,
        comedian_tier: user.comedian_tier,
        comedian_rep: user.comedian_rep,
        crowd_tier: user.crowd_tier,
        crowd_rep: user.crowd_rep,
        onboarding_passed: user.onboarding_passed,
      },
      stats: {
        bits_count: bitsCount,
        killed_it_count: killedItCount,
        crowd_votes_count: crowdVotesCount,
        earned_usdg_micro: (rewardAgg._sum.amount_micro_usdg ?? 0n).toString(),
      },
      recent_bits: recentBits,
    });
  } catch {
    return NextResponse.json(
      {
        ok: true,
        found: false,
        profile: {
          wallet: null,
          handle: cleaned,
          comedian_tier: "open_mic",
          comedian_rep: 0,
          crowd_tier: "walk_in",
          crowd_rep: 0,
          onboarding_passed: false,
        },
        stats: {
          bits_count: 0,
          killed_it_count: 0,
          crowd_votes_count: 0,
          earned_usdg_micro: "0",
        },
        recent_bits: [],
      },
      { headers: { "cache-control": "no-store" } },
    );
  }
}
