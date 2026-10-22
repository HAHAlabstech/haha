import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getChainForEnv } from "@/lib/haha-chains";
import { readChainEnv } from "@/lib/server";
import { buildChainDataScope } from "@/lib/chain-data-scope";

export const dynamic = "force-dynamic";

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

// GET /api/vault/history -> VaultSnapshot list, oldest first.
export async function GET() {
  try {
    const prisma = getPrisma();
    const scope = buildChainDataScope(getChainForEnv(readChainEnv()).id);
    const rows = await prisma.vaultSnapshot.findMany({
      where: scope.publishedSnapshots,
      orderBy: { created_at: "asc" },
      take: 100,
    });
    return jsonBig({ snapshots: rows });
  } catch {
    return NextResponse.json(
      { error: "vault history unavailable" },
      { status: 503 },
    );
  }
}
