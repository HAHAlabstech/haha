import { NextResponse } from "next/server";
import { getPrisma, readChainEnv } from "@/lib/server";
import { getChainForEnv } from "@/lib/haha-chains";
import { shareCardUrlForBit } from "@/lib/share-card-state";

export const dynamic = "force-dynamic";

function sanitizeModelVersion(raw?: string | null): string {
  if (!raw) return "opus-5.5";
  return raw.replace(/mimo-v2\.6-pro/gi, "opus-5.5").replace(/mimo/gi, "opus 5.5");
}

// GET /api/bits/[id] -> bit + ai_answer + outcome + vote progress + share card.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }
  try {
    const prisma = getPrisma();
    const chainId = getChainForEnv(readChainEnv()).id;
    const bit = await prisma.bit.findFirst({
      where: { id, chain_id: chainId },
      include: {
        user: { select: { wallet: true, handle: true, comedian_tier: true } },
        ai_answer: true,
        outcome: true,
        comedian_reveal: true,
      },
    });
    if (!bit) {
      return NextResponse.json({ error: "bit not found" }, { status: 404 });
    }
    // Progress belongs to the ACTIVE round. A retrial must never show
    // round-1 votes under a round-2 denominator.
    const activeRound = Math.max(1, bit.retrial_round || 1);
    const [votes, assignedCount] = await Promise.all([
      prisma.crowdAssignment.findMany({
        where: {
          bit_id: id,
          round: activeRound,
          vote: { not: null },
        },
        select: { vote: true, fairness: true, vote_weight: true, round: true },
      }),
      prisma.crowdAssignment.count({
        where: { bit_id: id, round: activeRound },
      }),
    ]);
    const byChoice: Record<string, number> = {
      A: 0,
      B: 0,
      both_right: 0,
      both_wrong: 0,
    };
    let fairWeight = 0;
    let totalWeight = 0;
    for (const v of votes) {
      if (v.vote) {
        const key = v.vote as keyof typeof byChoice;
        byChoice[key] = (byChoice[key] ?? 0) + v.vote_weight;
      }
      if (v.fairness === "fair") fairWeight += v.vote_weight;
      totalWeight += v.vote_weight;
    }

    // Keep comedian_reveal text hidden while in_crowd so blind jurors cannot peek.
    const isSettled =
      bit.status === "killed_it" ||
      bit.status === "bombed" ||
      bit.status === "heckled_off";

    const bitMeta = {
      id: bit.id,
      category: bit.category,
      language: bit.language,
      scenario: bit.scenario,
      question: bit.question,
      status: bit.status,
      reject_reason: bit.reject_reason,
      stage: bit.stage,
      retrial_round: bit.retrial_round,
      created_at: bit.created_at.toISOString(),
    };

    return NextResponse.json(
      {
        ...bitMeta,
        bit: bitMeta,
        user: bit.user,
        ai_answer: bit.ai_answer
          ? {
              ...bit.ai_answer,
              model_version: sanitizeModelVersion(bit.ai_answer.model_version),
            }
          : null,
        comedian_reveal: isSettled ? bit.comedian_reveal : null,
        outcome: bit.outcome,
        has_reveal: bit.comedian_reveal != null,
        crowd: {
          assigned: Math.max(5, assignedCount),
          voted: votes.length,
          round: activeRound,
        },
        votes: {
          count: votes.length,
          byChoice,
          fairWeight,
          totalWeight,
        },
        share_card_url: shareCardUrlForBit({
          status: bit.status,
          hasOutcome: bit.outcome != null,
          storedUrl: bit.share_card_r2_url,
        }),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "bit unavailable" }, { status: 503 });
  }
}
