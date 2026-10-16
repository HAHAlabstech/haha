import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server";

export const dynamic = "force-dynamic";

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
    const bit = await prisma.bit.findUnique({
      where: { id },
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
    const [votes, assignedCount] = await Promise.all([
      prisma.crowdAssignment.findMany({
        where: { bit_id: id, vote: { not: null } },
        select: { vote: true, fairness: true, vote_weight: true, round: true },
      }),
      prisma.crowdAssignment.count({
        where: { bit_id: id },
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
        ai_answer: bit.ai_answer,
        comedian_reveal: isSettled ? bit.comedian_reveal : null,
        outcome: bit.outcome,
        has_reveal: bit.comedian_reveal != null,
        crowd: {
          assigned: Math.max(5, assignedCount),
          voted: votes.length,
          round: Math.max(1, bit.retrial_round || 1),
        },
        votes: {
          count: votes.length,
          byChoice,
          fairWeight,
          totalWeight,
        },
        share_card_url: bit.share_card_r2_url,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "bit unavailable" }, { status: 503 });
  }
}

