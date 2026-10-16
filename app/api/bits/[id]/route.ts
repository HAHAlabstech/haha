import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

function getPrisma(): PrismaClient {
  const g = globalThis as unknown as { __hahaPrisma?: PrismaClient };
  g.__hahaPrisma ??= new PrismaClient();
  return g.__hahaPrisma;
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
    const bit = await prisma.bit.findUnique({
      where: { id },
      include: {
        ai_answer: true,
        outcome: true,
        comedian_reveal: { select: { id: true, created_at: true } },
      },
    });
    if (!bit) {
      return NextResponse.json({ error: "bit not found" }, { status: 404 });
    }
    const votes = await prisma.crowdAssignment.findMany({
      where: { bit_id: id, vote: { not: null } },
      select: { vote: true, fairness: true, vote_weight: true, round: true },
    });
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
    return NextResponse.json(
      {
        bit: {
          id: bit.id,
          category: bit.category,
          language: bit.language,
          scenario: bit.scenario,
          question: bit.question,
          status: bit.status,
          stage: bit.stage,
          retrial_round: bit.retrial_round,
          created_at: bit.created_at.toISOString(),
        },
        ai_answer: bit.ai_answer,
        outcome: bit.outcome,
        has_reveal: bit.comedian_reveal != null,
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
