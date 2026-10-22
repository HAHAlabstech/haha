import { NextResponse } from "next/server";
import { constants, createHash, publicEncrypt } from "node:crypto";
import { bad, getPrisma, readChainEnv } from "@/lib/server";
import { getChainForEnv } from "@/lib/haha-chains";
import { buildChainDataScope } from "@/lib/chain-data-scope";

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

async function exchangeToken(token: string, publicKeyPem?: string) {
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
    const scope = buildChainDataScope(getChainForEnv(readChainEnv()).id);
    const snap = await prisma.vaultSnapshot.findFirst({
      where: { id: row.batch_id, ...scope.batchSnapshots },
      select: { dek_wrapped: true, r2_dataset_key: true },
    });
    if (!snap) return bad("published dataset batch unavailable on this chain", 404);
    await prisma.producerKeyToken.update({
      where: { id: row.id },
      data: { used_at: new Date() },
    });
    const dekWrapped = snap?.dek_wrapped ?? "kmsv1:stub";
    const dekBase64 = snap?.dek_wrapped ? unwrapDek(snap.dek_wrapped) : null;

    let rsaWrappedDek: string | null = null;
    if (publicKeyPem && publicKeyPem.includes("BEGIN PUBLIC KEY") && dekBase64) {
      try {
        const encrypted = publicEncrypt(
          {
            key: publicKeyPem,
            padding: constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
          },
          Buffer.from(dekBase64, "base64"),
        );
        rsaWrappedDek = `rsa-oaep-sha256:${encrypted.toString("base64")}`;
      } catch {
        rsaWrappedDek = null;
      }
    }

    return NextResponse.json(
      {
        producerId: row.producer_id,
        batchId: row.batch_id,
        dekWrapped,
        wrappedDek: rsaWrappedDek ?? dekBase64 ?? dekWrapped,
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

// GET /api/producers/key?token=hkt_... -> single-use DEK exchange.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = (searchParams.get("token") ?? "").trim();
  return exchangeToken(token);
}

// POST /api/producers/key { token, publicKeyPem? } -> single-use DEK exchange (optional RSA-OAEP wrap).
export async function POST(req: Request) {
  let body: { token?: string; publicKeyPem?: string };
  try {
    body = await req.json();
  } catch {
    return bad("invalid json");
  }
  const token = (body.token ?? "").trim();
  const publicKeyPem = (body.publicKeyPem ?? "").trim() || undefined;
  return exchangeToken(token, publicKeyPem);
}
