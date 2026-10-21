"use strict";
// Job: weekly-vault (BullMQ weekly). Exports verified entries (killed_it &
// bombed, EXCLUDING holdout) as JSONL, encrypts with a RANDOM per-snapshot
// AES-256-GCM DEK, uploads ciphertext to R2 private/vault/snapshot-{n}.jsonl.enc,
// wraps the DEK via KMS (VAULT_DEK_KMS_KEY / env), stores dek_wrapped on
// VaultSnapshot, and calls VaultRegistry.publishSnapshot(entryCount,
// replacementMicroUsd, merkleRoot, r2ManifestUri) (micro, not dollars).

const { randomBytes, createCipheriv } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const prisma = new PrismaClient();
function r2() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });
}
const BUCKET = process.env.R2_BUCKET_NAME ?? "haha-storage";

async function putR2(key, body, contentType, opts) {
  const client = r2();
  await client.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: body, ContentType: contentType,
    // Custom-domain CDN default-caches PNGs; short TTL keeps retrial card
    // overwrites visible after a few minutes instead of serving stale art.
    CacheControl: opts?.cacheControl ?? "public, max-age=86400",
  }));
  return `r2://${BUCKET}/${key}`;
}

async function presignedR2(key, secs = 86400) {
  const client = r2();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: secs });
}

function wrapDek(dek) {
  // KMS-envelope placeholder: XOR with VAULT_DEK_KMS_KEY handle is NOT real
  // KMS — production wires Cloudflare KMS / HashiCorp Vault here. The wrap
  // format is versioned so rotation stays compatible.
  const kms = Buffer.from(process.env.VAULT_DEK_KMS_KEY ?? "dev-only-insecure", "utf8");
  const out = Buffer.alloc(dek.length);
  for (let i = 0; i < dek.length; i++) out[i] = dek[i] ^ kms[i % kms.length];
  return `kmsv1:${out.toString("base64")}`;
}

function unwrapDek(wrapped) {
  if (typeof wrapped !== "string" || !wrapped.startsWith("kmsv1:")) {
    throw new Error("unsupported wrapped DEK format");
  }
  const raw = Buffer.from(wrapped.slice(6), "base64");
  const kms = Buffer.from(process.env.VAULT_DEK_KMS_KEY ?? "dev-only-insecure", "utf8");
  const out = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw[i] ^ kms[i % kms.length];
  return out;
}

async function run(job) {
  const rows = await prisma.$queryRaw`
    SELECT b.id, b.category, b.stage, b.question, r.answer, r.explanation, o.result, o.win_strength, o.fair_ratio, u.wallet
    FROM "Bit" b JOIN "User" u ON u.id=b.user_id JOIN "ComedianReveal" r ON r.bit_id=b.id JOIN "Outcome" o ON o.bit_id=b.id
    WHERE o.result IN ('killed_it','bombed') AND b.is_holdout = false`;
  const pricing = await prisma.vaultPricing.findMany();
  const priceOf = (cat, res) => pricing.find((p) => p.category === cat && p.outcome === res)?.ref_price_micro_usd ?? 0n;
  let total = 0n;
  const byCat = {};
  const lines = rows.map((e) => {
    const price = priceOf(e.category, e.result);
    total += price;
    byCat[`${e.category}/${e.result}`] = (byCat[`${e.category}/${e.result}`] ?? 0) + 1;
    const { wallet, ...entry } = e; // contributor addresses stay in the server manifest.
    return JSON.stringify({ ...entry, ref_price_micro_usd: price.toString(), win_strength: Number(e.win_strength), fair_ratio: Number(e.fair_ratio) });
  });

  const dek = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const enc = Buffer.concat([cipher.update(lines.join("\n"), "utf8"), cipher.final(), cipher.getAuthTag()]);
  const payload = Buffer.concat([Buffer.from("HAHAV1"), iv, enc]); // version + iv + ct + tag
  const key = `private/vault/snapshot-${Date.now()}.jsonl.enc`;
  const r2uri = await putR2(key, payload, "application/octet-stream");

  // Snapshot Merkle root over entry hashes (same OZ double-hash helper).
  const { buildTree } = require("../lib/merkle");
  const { keccak256, toHex } = require("viem");
  const { root } = await buildTree(rows.map((e) => ({ account: "0x0000000000000000000000000000000000000000", cumulativeMicro: BigInt(keccak256(toHex(e.id))) })));

  const contributors = new Map();
  for (const e of rows) contributors.set(e.wallet, (contributors.get(e.wallet) || 0) + 1);
  const snap = await prisma.vaultSnapshot.create({
    data: {
      entry_count: rows.length, by_category_json: byCat, replacement_micro_usd: total,
      merkle_root: root, r2_dataset_key: key, dek_wrapped: wrapDek(dek),
      contributors_json: [...contributors].map(([wallet, weight]) => ({ wallet, weight })),
    },
  });
  // publishSnapshot(entryCount, replacementMicroUsd, merkleRoot, r2ManifestUri)
  // is submitted on-chain by the hot keeper; tx recorded when mined.
  if (job?.data?.publishedTxHash) {
    await prisma.vaultSnapshot.update({ where: { id: snap.id }, data: { tx_hash: job.data.publishedTxHash } });
  }
  return { entries: rows.length, replacementMicroUsd: total.toString(), root, r2uri };
}

module.exports = { run, putR2, presignedR2, wrapDek, unwrapDek };
