import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

function getPrisma(): PrismaClient {
  const g = globalThis as unknown as { __hahaPrisma?: PrismaClient };
  g.__hahaPrisma ??= new PrismaClient();
  return g.__hahaPrisma;
}

// GET /api/producers/key?token=hkt_... -> single-use DEK exchange.
// Sets used_at, enforces expiry; a token can only be exchanged once.
// TODO(worker/KMS): return a real wrapped DEK instead of the stub.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }
  try {
    const prisma = getPrisma();
    const token_hash = createHash("sha256").update(token).digest("hex");
    const row = await prisma.producerKeyToken.findUnique({
      where: { token_hash },
    });
    if (!row) {
      return NextResponse.json({ error: "unknown token" }, { status: 404 });
    }
    if (row.used_at != null) {
      return NextResponse.json({ error: "token already used" }, { status: 410 });
    }
    if (row.expires_at.getTime() < Date.now()) {
      return NextResponse.json({ error: "token expired" }, { status: 410 });
    }
    await prisma.producerKeyToken.update({
      where: { id: row.id },
      data: { used_at: new Date() },
    });
    return NextResponse.json(
      {
        producerId: row.producer_id,
        batchId: row.batch_id,
        dekWrapped: "stub-dek — TODO(KMS)",
        expiresAt: row.expires_at.toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "key exchange unavailable" }, { status: 503 });
  }
}
