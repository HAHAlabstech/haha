import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

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

// GET /api/vault/pricing -> all VaultPricing rows with source notes.
export async function GET() {
  try {
    const prisma = getPrisma();
    const rows = await prisma.vaultPricing.findMany({
      orderBy: [{ category: "asc" }, { outcome: "asc" }],
    });
    return jsonBig({ pricing: rows });
  } catch {
    return NextResponse.json(
      { error: "vault pricing unavailable" },
      { status: 503 },
    );
  }
}
