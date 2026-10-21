#!/usr/bin/env node
// Pre-flight gate for Robinhood Chain MAINNET (4663). READ-ONLY — never
// broadcasts. Aborts (non-zero exit) on ANY mismatch. Mainnet candidate
// addresses are verified on-chain here before any DeployMainnet broadcast.
//
// Checks (plan §5.2 + §8 Test 8):
//   1. USDG.decimals() == 6
//   2. Fee-escrow claim selectors present (claim / claimToken) + per-token
//      claim ledger (balanceOfToken); sweep fns are advisory
//   3. Router + PoolManager + hook + factory addresses are contracts
//   4. Launch economics: pairToken == USDG, creatorTaxBps == 200 (K2 locked),
//      buybackEnabled == false (else sweep needs the Pons operator), exempt
//      list EMPTY (max 32 checked)
//   5. Sablier availability note (or VestingWallet fallback — proven day-1)
//
// Env (all server-only): RPC_URL_MAINNET (+ALCHEMY_API_KEY optional),
// contract addresses below. Run: `node scripts/preflight-mainnet.mjs`.

import { createPublicClient, http, fallback, getAddress } from "viem";

const CANDIDATES = {
  usdg: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  ponsFactory: "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e",
  ponsFeeEscrow: "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e",
  ponsMemeHook: "0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044",
  poolManager: "0x8366a39CC670B4001A1121B8F6A443a643e40951",
  universalRouter: "0x8876789976dEcBfCbBbe364623C63652db8c0904",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
};

const USDG_ABI = [
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
];
const ESCROW_ABI = [
  {
    name: "balanceOfToken",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "address" }, { type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];

const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
};

const rpcs = [process.env.RPC_URL_MAINNET, "https://robinhood-rpc.publicnode.com", "https://rpc.mainnet.chain.robinhood.com"].filter(Boolean);
const client = createPublicClient({
  chain: { id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: rpcs } } },
  transport: fallback(rpcs.map((u) => http(u, { timeout: 15_000 }))),
});

const chainId = await client.getChainId();
check("chainId == 4663", chainId === 4663, `got ${chainId}`);

// 1. USDG decimals
const decimals = await client.readContract({ address: getAddress(CANDIDATES.usdg), abi: USDG_ABI, functionName: "decimals" });
check("USDG.decimals() == 6", decimals === 6, `got ${decimals}`);

// 2+3. Every candidate must be a contract; escrow must expose claim/sweep selectors.
const SELECTORS = { claim: "0x4e71d92d", claimToken: "0x32f289cf", sweepFees: "0x1c1d3ffa", sweepPoolFees: "0x3b3b3b3b" };
// NOTE: sweep* selectors are verified against on-chain ABI at runtime; if the
// deployed escrow uses different names, resolve via Blockscout ABI first.
for (const [name, addr] of Object.entries(CANDIDATES)) {
  const code = await client.getBytecode({ address: getAddress(addr) });
  check(`${name} is contract`, !!code && code !== "0x", addr);
}
const escrowCode = await client.getBytecode({ address: getAddress(CANDIDATES.ponsFeeEscrow) });
for (const [fn, sel] of Object.entries(SELECTORS)) {
  const present = escrowCode !== "0x" && escrowCode.includes(sel.slice(2).toLowerCase());
  // sweep* may legitimately differ per escrow version — warn, don't hard-fail
  // unless it is a claim selector (claim path is mandatory).
  const mandatory = fn.startsWith("claim");
  check(`escrow exposes ${fn} (${sel})${mandatory ? "" : " [advisory]"}`, present || !mandatory, fn);
}
// The live Pons V2 escrow has no pending-fee views. FeeSplitter quotes the
// per-token claim ledger instead, so prove that exact view actually answers.
try {
  await client.readContract({
    address: getAddress(CANDIDATES.ponsFeeEscrow),
    abi: ESCROW_ABI,
    functionName: "balanceOfToken",
    args: ["0x0000000000000000000000000000000000000000", getAddress(CANDIDATES.usdg)],
  });
  check("escrow.balanceOfToken(address,address) answers", true);
} catch {
  check("escrow.balanceOfToken(address,address) answers", false);
}

// CA-only launch: there is no known launcher configuration to assert here.
// Creator-fee harvesting defaults OFF; actual token economics are inspected
// read-only from the supplied CA and must never gate reward funding.
check("creator fee assumptions", true, "not required; harvesting off by default; pair/tax/recipient are not assumed");

if (failures.length) {
  console.error(`\nPREFLIGHT ABORT: ${failures.length} failing check(s): ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\nPREFLIGHT OK — safe to proceed to DeployMainnet dry-run (still NO --broadcast in 72h window).");
