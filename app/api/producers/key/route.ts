import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { bad, getPrisma } from "@/lib/server";

export const dynamic = "force-dynamic";

function unwrapDek(wrapped: string): string {
  if (!wrapped.startsWith("kmsv1:")) return wrapped;
  const kms = Buffer.from(
    (process.env.VAULT_DEK_KMS_KEY ?? "0".repeat(64)).padEnd(64, "0").slice(0, 64),
    "hex",
  );
  const cipher = Buffer.from(wrapped.slice(6), "base64");
  const out = Buffer.alloc(cipher.length);
  for (let i = 0; i < cipher.length; i++) {
    out[i] = (cipher[i] ?? 0) ^ (kms[i % kms.length] ?? 0);
  }
  return out.toString("base64");
}

// GET /api/producers/key?token=hkt_... -> single-use DEK exchange.
// Sets used_at, enforces expiry; a token can only be exchanged once.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  if (!token) {
    return bad("token required", 400);
  }
  try {
    const prisma = getPrisma();
    const token_hash = createHash("sha256").update(token).digest("hex");
    const row = await prisma.producerKeyToken.findUnique({
      where: { token_hash },
    });
    if (!row) {
      return bad("unknown token", 404);
    }
    if (row.used_at != null) {
      return bad("token already used", 410);
    }
    if (row.expires_at.getTime() < Date.now()) {
      return bad("token expired", 410);
    }
    await prisma.producerKeyToken.update({
      where: { id: row.id },
      data: { used_at: new Date() },
    });

    const snap = await prisma.vaultSnapshot.findFirst({
      orderBy: { created_at: "desc" },
      select: { dek_wrapped: true, r2_dataset_key: true },
    });
    const dekWrapped = snap?.dek_wrapped ?? "kmsv1:stub";
    const dekBase64 = snap?.dek_wrapped ? unwrapDek(snap.dek_wrapped) : null;

    return NextResponse.json(
      {
        producerId: row.producer_id,
        batchId: row.batch_id,
        dekWrapped,
        dekBase64,
        r2DatasetKey: snap?.r2_dataset_key ?? null,
        expiresAt: row.expires_at.toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("key exchange unavailable", 503);
  }
}
