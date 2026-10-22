import { NextResponse } from "next/server";
import {
  bad,
  getPrisma,
  jsonBig,
  requireWalletSession,
  readChainEnv,
} from "@/lib/server";
import { getChainForEnv } from "@/lib/haha-chains";
import { getServerContracts } from "@/lib/haha-contracts";
import { buildChainDataScope } from "@/lib/chain-data-scope";
import { epochScope } from "@/worker/lib/funding";

export const dynamic = "force-dynamic";

// GET /api/u/[handle] -> lookup user profile by handle or wallet address, along with stats and recent public non-holdout bits.
export async function GET(
  req: Request,
  ctx: { params: Promise<{ handle: string }> },
) {
  const { handle: rawHandle } = await ctx.params;
  const cleaned = decodeURIComponent(rawHandle || "").replace(/^@/, "").trim();
  if (!cleaned) return bad("missing handle");

  try {
    const prisma = getPrisma();
    const chainId = getChainForEnv(readChainEnv()).id;
    const scope = buildChainDataScope(chainId);
    const contracts = getServerContracts();
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

    const auth = await requireWalletSession(req, prisma, user.wallet).catch(
      () => ({ ok: false } as const),
    );
    const isOwner = auth.ok === true;

    const [bitsCount, killedItCount, crowdVotesCount, rewardAgg, recentBits] =
      await Promise.all([
        prisma.bit.count({ where: { user_id: user.id, chain_id: chainId } }),
        prisma.bit.count({
          where: { ...scope.killedBits, user_id: user.id },
        }),
        prisma.crowdAssignment.count({
          where: { ...scope.votedAssignments, juror_id: user.id },
        }),
        prisma.reward.aggregate({
          where: {
            user_id: user.id,
            epoch: epochScope({ chainId, tipJar: contracts.tipJar }),
          },
          _sum: { amount_micro_usdg: true },
        }),
        prisma.bit.findMany({
          where: isOwner
            ? { user_id: user.id, chain_id: chainId }
            : {
                ...scope.publicBits,
                user_id: user.id,
              },
          orderBy: { created_at: "desc" },
          take: isOwner ? 20 : 10,
          select: {
            id: true,
            category: true,
            scenario: true,
            question: true,
            stage: true,
            status: true,
            reject_reason: true,
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
    const hasMainnetComedianActivity = bitsCount > 0;
    const hasMainnetCrowdActivity = crowdVotesCount > 0;

    return jsonBig({
      ok: true,
      found: true,
      is_owner: isOwner,
      profile_has_chain_activity:
        hasMainnetComedianActivity || hasMainnetCrowdActivity || (rewardAgg._sum.amount_micro_usdg ?? 0n) > 0n,
      profile: {
        wallet: user.wallet,
        handle: user.handle,
        comedian_tier: hasMainnetComedianActivity ? user.comedian_tier : "open_mic",
        comedian_rep: hasMainnetComedianActivity ? user.comedian_rep : 0,
        crowd_tier: hasMainnetCrowdActivity ? user.crowd_tier : "walk_in",
        crowd_rep: hasMainnetCrowdActivity ? user.crowd_rep : 0,
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
