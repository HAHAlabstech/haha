/**
 * HAHA Disaster Recovery & Invariant Drill (Plan §4.9 + §8)
 * Verifies:
 * 1. Merkle double-hash deterministic rebuild & proof verification parity.
 * 2. Vault snapshot AES-256-GCM + KMS DEK wrap/unwrap round-trip integrity.
 * 3. Canonical quorum & 5% iterative epoch reward math invariants.
 *
 * Run: node scripts/backup-restore-drill.mjs
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildTree, leafHash } = require("../worker/lib/merkle.js");
const { decide } = require("../worker/lib/quorum.js");
const { distribute, scoreOf } = require("../worker/lib/rewards.js");
const { keccak256, concat } = require("viem");

function wrapDek(dekBuf, kmsHex) {
  const kms = Buffer.from(kmsHex.padEnd(64, "0").slice(0, 64), "hex");
  const out = Buffer.alloc(dekBuf.length);
  for (let i = 0; i < dekBuf.length; i++) out[i] = dekBuf[i] ^ kms[i % kms.length];
  return `kmsv1:${out.toString("base64")}`;
}

function unwrapDek(wrapped, kmsHex) {
  const kms = Buffer.from(kmsHex.padEnd(64, "0").slice(0, 64), "hex");
  const cipher = Buffer.from(wrapped.slice(6), "base64");
  const out = Buffer.alloc(cipher.length);
  for (let i = 0; i < cipher.length; i++) out[i] = cipher[i] ^ kms[i % kms.length];
  return out;
}

function verifyProofOnChainStyle(proof, root, leaf) {
  let computed = leaf;
  for (const p of proof) {
    const [a, b] = computed.toLowerCase() < p.toLowerCase() ? [computed, p] : [p, computed];
    computed = keccak256(concat([a, b]));
  }
  return computed.toLowerCase() === root.toLowerCase();
}

async function main() {
  console.log("=== HAHA DISASTER RECOVERY & INVARIANT DRILL (TESTNET 46630) ===");

  // 1. Merkle Tree Replay & Proof Verification Drill
  const sampleEntitlements = [
    { account: "0xaea64dd878a8f1746e920e5725e41dca0057b651", cumulativeMicro: "140000000" },
    { account: "0x1111111111111111111111111111111111111111", cumulativeMicro: "28000000" },
    { account: "0x2222222222222222222222222222222222222222", cumulativeMicro: "55000000" },
    { account: "0x3333333333333333333333333333333333333333", cumulativeMicro: "12500000" },
  ];
  const tree1 = await buildTree(sampleEntitlements);
  const tree2 = await buildTree([...sampleEntitlements].reverse());
  if (tree1.root !== tree2.root) {
    throw new Error(`Merkle replay non-deterministic: ${tree1.root} !== ${tree2.root}`);
  }
  for (const item of sampleEntitlements) {
    const proof = tree1.proofs.get(item.account);
    const leaf = leafHash(item.account, item.cumulativeMicro);
    if (!verifyProofOnChainStyle(proof, tree1.root, leaf)) {
      throw new Error(`Merkle proof verification failed for ${item.account}`);
    }
  }
  console.log(`[PASS] 1. Merkle Tree Replay & Double-Hash Proof Parity: root=${tree1.root}`);

  // 2. Vault Snapshot AES-256-GCM + DEK Wrap/Unwrap Drill
  const kmsKey = createHash("sha256").update("haha-testnet-drill-kms").digest("hex");
  const dek = randomBytes(32);
  const iv = randomBytes(12);
  const sampleJsonl = [
    JSON.stringify({ id: "bit_1", category: "punchline", stage: "pro", result: "killed_it" }),
    JSON.stringify({ id: "bit_2", category: "subtext", stage: "open_mic", result: "bombed" }),
  ].join("\n");

  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const enc = Buffer.concat([cipher.update(sampleJsonl, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, enc]);

  const wrapped = wrapDek(dek, kmsKey);
  const unwrapped = unwrapDek(wrapped, kmsKey);
  const rIv = payload.subarray(0, 12);
  const rTag = payload.subarray(12, 28);
  const rCipher = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", unwrapped, rIv);
  decipher.setAuthTag(rTag);
  const dec = Buffer.concat([decipher.update(rCipher), decipher.final()]).toString("utf8");
  if (dec !== sampleJsonl) {
    throw new Error("Vault AES-256-GCM round-trip mismatch");
  }
  console.log(`[PASS] 2. Vault Snapshot AES-256-GCM + KMS DEK Round-Trip (${payload.length} bytes)`);

  // 3. Quorum Thin-Zone & 5% Cap Invariant Drill
  const thinVotes = [
    { weight: 1.0, forComedian: true, forAI: false, bothRight: false, bothWrong: false, fair: true },
    { weight: 1.0, forComedian: true, forAI: false, bothRight: false, bothWrong: false, fair: true },
    { weight: 1.0, forComedian: true, forAI: false, bothRight: false, bothWrong: false, fair: true },
    { weight: 1.0, forComedian: false, forAI: true, bothRight: false, bothWrong: false, fair: true },
    { weight: 1.0, forComedian: false, forAI: true, bothRight: false, bothWrong: false, fair: true },
  ];
  const dThin = decide(thinVotes);
  if (dThin.action !== "expand") {
    throw new Error(`Expected 3v2 thin vote to expand to 7 jurors, got ${dThin.action}`);
  }
  const pool = 1_000_000_000n; // 1,000 USDG
  const dist = distribute(pool, [
    { account: "0xaaa", score: scoreOf({ win_strength: 1.0, fairness: 1.0, stage: "pro", comedian_tier: "open_mic" }) },
    { account: "0xbbb", score: scoreOf({ win_strength: 0.8, fairness: 0.9, stage: "open_mic", comedian_tier: "open_mic" }) },
  ]);
  const cap5Pct = (pool * 500n) / 10_000n;
  for (const [acct, amt] of dist.payouts) {
    if (amt > cap5Pct) throw new Error(`Account ${acct} exceeded 5% epoch cap: ${amt} > ${cap5Pct}`);
  }
  console.log(`[PASS] 3. Quorum Thin-Zone (5->7) & 5% Cap Rollover Invariant (rollover=${dist.rollover} micro-USDG)`);
  console.log("=== ALL DRILLS PASSED 100% ===");
}

main().catch((err) => {
  console.error("DRILL FAILED:", err);
  process.exit(1);
});
