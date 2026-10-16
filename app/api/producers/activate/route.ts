import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createPublicClient, http } from "viem";
import { getChainForEnv, type ChainEnv } from "@/lib/haha-chains";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

// Plan price in micro-USD (6dp). Split 40/30/20/10 across
// comedian_pool / crowd_pool / treasury / ops.
const PLAN_MICRO_USD: Record<string, bigint> = {
  starter: 49_000_000n,
  pro: 199_000_000n,
  enterprise: 999_000_000n,
};

function getPrisma(): PrismaClient {
  const g = globalThis as unknown as { __hahaPrisma?: PrismaClient };
  g.__hahaPrisma ??= new PrismaClient();
  return g.__hahaPrisma;
}

function bad(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function readChainEnv(): ChainEnv {
  const raw = (process.env.CHAIN_ENV ?? "").toLowerCase();
  return raw === "mainnet" ? "mainnet" : "testnet";
}

// POST /api/producers/activate {tx_hash, plan, orderId, batchId}
// Best-effort receipt verification via viem; creates Producer + RevenueEvent
// (40/30/20/10 micro split). Returns one-time apiKey + presigned stub URL +
// single-use key_token (ProducerKeyToken).
// TODO(worker): payment verification + R2 presign move to BullMQ.
export async function POST(req: Request) {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return bad("Failed to read request body", 400);
  }
  if (raw.length > MAX_BODY_BYTES) return bad("Request too large", 413);
  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    return bad("Invalid JSON", 400);
  }
  const b = body as Record<string, unknown>;
  const tx_hash = typeof b.tx_hash === "string" ? b.tx_hash : "";
  const plan = typeof b.plan === "string" ? b.plan : "";
  const orderId = typeof b.orderId === "string" ? b.orderId : "";
  const batchId = typeof b.batchId === "string" ? b.batchId : "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(tx_hash)) return bad("invalid tx_hash", 400);
  const price = PLAN_MICRO_USD[plan];
  if (price === undefined) return bad("invalid plan", 400);
  if (!orderId || orderId.length > 128) return bad("invalid orderId", 400);
  if (!batchId || batchId.length > 128) return bad("invalid batchId", 400);

  let verified = false;
  try {
    const chainEnv = readChainEnv();
    const chain = getChainForEnv(chainEnv);
    const override =
      chainEnv === "mainnet"
        ? process.env.RPC_URL_MAINNET?.trim()
        : process.env.RPC_URL_TESTNET?.trim();
    const rpcUrl =
      override && override.length > 0
        ? override
        : (chain.rpcUrls.default.http[0] as string);
    const client = createPublicClient({ chain, transport: http(rpcUrl) });
    const receipt = await client.getTransactionReceipt({
      hash: tx_hash as `0x${string}`,
    });
    verified = receipt.status === "success";
    if (!verified) return bad("payment transaction reverted", 402);
  } catch {
    // Best-effort: chain unreachable — proceed unverified, flagged.
    verified = false;
  }

  try {
    const prisma = getPrisma();
    const apiKey = `haha_${randomBytes(24).toString("hex")}`;
    const api_key_hash = createHash("sha256").update(apiKey).digest("hex");
    const producer = await prisma.producer.create({
      data: {
        org_name: orderId.slice(0, 128),
        contact: `batch:${batchId}`.slice(0, 128),
        plan,
        api_key_hash,
        status: "active",
      },
      select: { id: true },
    });

    const splits = {
      comedian_pool: ((price * 40n) / 100n).toString(),
      crowd_pool: ((price * 30n) / 100n).toString(),
      treasury: ((price * 20n) / 100n).toString(),
      ops: ((price * 10n) / 100n).toString(),
    };
    try {
      await prisma.revenueEvent.create({
        data: {
          producer_id: producer.id,
          amount_micro_usd: price,
          type: "producer_activation",
          split_json: splits,
          tx_hash,
        },
      });
    } catch (e) {
      const code =
        typeof e === "object" && e !== null && "code" in e
          ? (e as { code?: unknown }).code
          : undefined;
      if (code !== "P2002") throw e;
    }

    const keyToken = `hkt_${randomBytes(24).toString("hex")}`;
    await prisma.producerKeyToken.create({
      data: {
        producer_id: producer.id,
        batch_id: batchId,
        token_hash: createHash("sha256").update(keyToken).digest("hex"),
        expires_at: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });

    return NextResponse.json(
      {
        producerId: producer.id,
        apiKey,
        keyToken,
        downloadUrl: `https://r2.stub.invalid/download/${producer.id}?batch=${encodeURIComponent(batchId)}`,
        verified,
        splits,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("activation unavailable", 503);
  }
}
