import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { createPublicClient, decodeEventLog, http, keccak256, toBytes } from "viem";
import { fundingConfig, importFundingReceipt } from "@/worker/lib/funding";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getChainForEnv } from "@/lib/haha-chains";
import { getServerContracts, isDeployed } from "@/lib/haha-contracts";
import { bad, getPrisma, readChainEnv } from "@/lib/server";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

// Canonical plan prices in micro-USD (6dp) per HAHA IMPLEMENTATION PLAN §4.6 / ProducerGateway.sol:
// Snapshot $2,500 / Subscription $1,000 / Eval $500 / Theme Night $500
// (starter/pro/enterprise kept as aliases for backward compatibility).
const PLAN_MICRO_USD: Record<string, bigint> = {
  snapshot: 2_500_000_000n,
  subscription: 1_000_000_000n,
  eval: 500_000_000n,
  theme_night: 500_000_000n,
  starter: 49_000_000n,
  pro: 199_000_000n,
  enterprise: 999_000_000n,
};

/** Canonical plan ids enforced by ProducerGateway.planPriceMicro. Aliases are legacy. */
const PLAN_TYPE: Record<string, number> = {
  snapshot: 0,
  subscription: 1,
  eval: 2,
  theme_night: 3,
};

const PRODUCER_PURCHASE_EVENT = {
  type: "event",
  name: "ProducerPurchase",
  inputs: [
    { name: "orderId", type: "bytes32", indexed: true },
    { name: "batchId", type: "bytes32", indexed: true },
    { name: "buyer", type: "address", indexed: true },
    { name: "planType", type: "uint8", indexed: false },
    { name: "operatorShare", type: "uint256", indexed: false },
    { name: "tipJarGeneralShare", type: "uint256", indexed: false },
    { name: "royaltyShare", type: "uint256", indexed: false },
    { name: "micDropShare", type: "uint256", indexed: false },
  ],
} as const;

async function buildDownloadUrl(
  producerId: string,
  batchId: string,
  r2DatasetKey?: string | null,
): Promise<string> {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim() || "haha-storage";

  if (accountId && accessKeyId && secretAccessKey && r2DatasetKey) {
    try {
      const key = r2DatasetKey.replace(/^r2:\/\/[^/]+\//, "");
      const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      return await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn: 86_400 },
      );
    } catch {
      // Fall back to deterministic URL below if R2 presign fails.
    }
  }
  return `https://r2.stub.invalid/download/${producerId}?batch=${encodeURIComponent(batchId)}`;
}

// POST /api/producers/activate {tx_hash, plan, orderId, batchId, wallet?}
// Verifies on-chain receipt + rejects replayed tx_hash, creates Producer +
// RevenueEvent (40% ops/coldTreasury, 30% tipjar_general, 20% micdrop, 10% comedian_royalty).
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
  const tx_hash = (
    typeof b.tx_hash === "string" ? b.tx_hash : ""
  ).toLowerCase();
  const plan = typeof b.plan === "string" ? b.plan.toLowerCase() : "";
  const rawOrder =
    typeof b.orderId === "string" && b.orderId.trim()
      ? b.orderId.trim()
      : typeof b.org_name === "string"
        ? b.org_name.trim()
        : "";
  const rawBatch =
    typeof b.batchId === "string" && b.batchId.trim()
      ? b.batchId.trim()
      : typeof b.contact === "string" && b.contact.trim()
        ? b.contact.trim()
        : "latest";
  const orderId = rawOrder;
  const batchId = rawBatch;
  const orgName =
    typeof b.org_name === "string" && b.org_name.trim()
      ? b.org_name.trim().slice(0, 128)
      : orderId.slice(0, 128);
  const contactInfo =
    typeof b.contact === "string" && b.contact.trim()
      ? b.contact.trim().slice(0, 128)
      : `batch:${batchId}`.slice(0, 128);
  const walletAddress =
    typeof b.wallet === "string" && /^0x[0-9a-fA-F]{40}$/.test(b.wallet)
      ? b.wallet.toLowerCase()
      : null;

  if (!/^0x[0-9a-f]{64}$/.test(tx_hash)) return bad("invalid tx_hash", 400);
  const price = PLAN_MICRO_USD[plan];
  if (price === undefined) return bad("invalid plan", 400);
  if (!orderId || orderId.length > 128) return bad("invalid orderId", 400);
  if (!batchId || batchId.length > 128) return bad("invalid batchId", 400);
  if (!walletAddress) return bad("buyer wallet required", 400);

  const prisma = getPrisma();
  try {
    const existingRev = await prisma.revenueEvent.findUnique({
      where: { tx_hash },
      select: { id: true },
    });
    if (existingRev) {
      return bad("tx_hash already activated", 409);
    }
  } catch {
    return bad("activation unavailable", 503);
  }

  let verified = false;
  let paidAmount = price;
  let paidSplits: Record<string, string> | null = null;
  const contracts = getServerContracts();
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
    if (!isDeployed(contracts, "producerGateway")) return bad("ProducerGateway not configured", 503);
    const receipt = await client.getTransactionReceipt({
      hash: tx_hash as `0x${string}`,
    });
    if (receipt.status !== "success") {
      return bad("payment transaction reverted", 402);
    }
    if (
      isDeployed(contracts, "producerGateway") &&
      receipt.to &&
      receipt.to.toLowerCase() !== contracts.producerGateway.toLowerCase()
    ) {
      return bad("transaction target does not match ProducerGateway", 402);
    }
    if (isDeployed(contracts, "producerGateway")) {
      const expectedType = PLAN_TYPE[plan];
      if (expectedType === undefined) {
        return bad("plan cannot be verified on-chain", 400);
      }
      const gatewayLog = receipt.logs.find(
        (l) =>
          l.address.toLowerCase() === contracts.producerGateway.toLowerCase(),
      );
      if (!gatewayLog) {
        return bad("ProducerPurchase event not found in transaction", 402);
      }
      let decoded: ReturnType<typeof decodeEventLog>;
      try {
        decoded = decodeEventLog({
          abi: [PRODUCER_PURCHASE_EVENT],
          data: gatewayLog.data,
          topics: gatewayLog.topics,
        });
      } catch {
        return bad("invalid ProducerPurchase event", 402);
      }
      const ev = decoded.args as {
        orderId: `0x${string}`;
        batchId: `0x${string}`;
        buyer: `0x${string}`;
        planType: number;
        operatorShare: bigint;
        tipJarGeneralShare: bigint;
        royaltyShare: bigint;
        micDropShare: bigint;
      };
      if (Number(ev.planType) !== expectedType) {
        return bad("payment plan does not match the activated plan", 402);
      }
      if (ev.orderId !== keccak256(toBytes(orderId)) || ev.batchId !== keccak256(toBytes(batchId))) {
        return bad("payment order or dataset batch does not match", 402);
      }
      if (walletAddress && ev.buyer.toLowerCase() !== walletAddress) return bad("payment buyer does not match", 402);
      const paid =
        ev.operatorShare + ev.tipJarGeneralShare + ev.royaltyShare + ev.micDropShare;
      if (paid < price) {
        return bad("payment amount is below the plan price", 402);
      }
      paidAmount = paid;
      paidSplits = { operator_share: ev.operatorShare.toString(), tipjar_general: ev.tipJarGeneralShare.toString(), comedian_royalty: ev.royaltyShare.toString(), mic_drop: ev.micDropShare.toString() };
      // Receipt funding is independent of successful dataset delivery. A retry
      // cannot allocate it twice, and an unknown manifest keeps royalties held.
      await importFundingReceipt(prisma, client, tx_hash, fundingConfig(), batchId);
    }
    verified = true;
  } catch {
    if (readChainEnv() === "mainnet" || process.env.ALLOW_UNVERIFIED_PRODUCER_TX !== "true") {
      return bad("unable to verify payment transaction on-chain", 402);
    }
    verified = false;
  }

  try {
    const boundSnap = await prisma.vaultSnapshot.findUnique({ where: { id: batchId }, select: { r2_dataset_key: true, contributors_json: true } });
    if (readChainEnv() === "mainnet" && (!boundSnap?.r2_dataset_key || !Array.isArray(boundSnap.contributors_json))) return bad("paid dataset batch is unavailable; funding remains registered", 409);
    const latestSnap = boundSnap || (readChainEnv() === "testnet" ? await prisma.vaultSnapshot.findFirst({ orderBy: { created_at: "desc" }, select: { r2_dataset_key: true } }) : null);

    const apiKey = `haha_${randomBytes(24).toString("hex")}`;
    const api_key_hash = createHash("sha256").update(apiKey).digest("hex");
    const expiresAt =
      plan === "subscription"
        ? new Date(Date.now() + 30 * 24 * 3600 * 1000)
        : null;

    const producer = await prisma.producer.create({
      data: {
        org_name: orgName,
        contact: contactInfo,
        wallet_address: walletAddress,
        plan,
        api_key_hash,
        status: "active",
        expires_at: expiresAt,
      },
      select: { id: true },
    });

    const downloadUrl = await buildDownloadUrl(
      producer.id,
      batchId,
      latestSnap?.r2_dataset_key,
    );
    await prisma.producer.update({
      where: { id: producer.id },
      data: { r2_download_url: downloadUrl },
    });

    const splits = paidSplits || {
      operator_share: ((price * 40n) / 100n).toString(),
      tipjar_general: ((price * 30n) / 100n).toString(),
      mic_drop: ((price * 20n) / 100n).toString(),
      comedian_royalty: ((price * 10n) / 100n).toString(),
    };
    await prisma.revenueEvent.create({
      data: {
        producer_id: producer.id,
        amount_micro_usd: paidAmount,
        type: "producer_activation",
        split_json: splits,
        tx_hash,
      },
    });

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
        keyExchangeToken: keyToken,
        downloadUrl,
        verified,
        splits,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("activation unavailable", 503);
  }
}
