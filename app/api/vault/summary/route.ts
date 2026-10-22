import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getChainForEnv } from "@/lib/haha-chains";
import { readChainEnv } from "@/lib/server";
import { buildChainDataScope } from "@/lib/chain-data-scope";

export const revalidate = 30;

function getPrisma(): PrismaClient {
  const g = globalThis as unknown as { __hahaPrisma?: PrismaClient };
  g.__hahaPrisma ??= new PrismaClient();
  return g.__hahaPrisma;
}

function jsonBig(data: unknown, status = 200) {
  const body = JSON.stringify(data, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
  return new NextResponse(body, {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

// GET /api/vault/summary -> verified (killed_it) counts per category,
// replacement micro-USD sum (ref_price_micro_usd x counts), revenue sum.
export async function GET() {
  try {
    const prisma = getPrisma();
    const scope = buildChainDataScope(getChainForEnv(readChainEnv()).id);
    const counts = await prisma.bit.groupBy({
      by: ["category"],
      where: { ...scope.killedBits, is_holdout: false },
      _count: { _all: true },
    });
    const pricing = await prisma.vaultPricing.findMany({
      where: { outcome: "killed_it" },
      select: { category: true, ref_price_micro_usd: true },
    });
    const priceByCat = new Map<string, bigint>(
      pricing.map((p) => [p.category, p.ref_price_micro_usd]),
    );
    const byCategory: Record<string, number> = {};
    let verified = 0;
    let replacementMicroUsd = 0n;
    for (const c of counts) {
      const n = c._count._all;
      byCategory[c.category] = n;
      verified += n;
      replacementMicroUsd += BigInt(n) * (priceByCat.get(c.category) ?? 0n);
    }
    const revenue = await prisma.revenueEvent.aggregate({
      where: scope.revenue,
      _sum: { amount_micro_usd: true },
    });
    return jsonBig({
      verified,
      byCategory,
      replacementMicroUsd: replacementMicroUsd.toString(),
      revenueMicroUsd: (revenue._sum.amount_micro_usd ?? 0n).toString(),
    });
  } catch {
    return NextResponse.json(
      { error: "vault summary unavailable" },
      { status: 503 },
    );
  }
}
