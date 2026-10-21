"use strict";
// worker/lib/chain.js — viem chain access for the BullMQ jobs (hot keeper).
// The worker image ships app deps (viem in prod deps), so plain CJS require
// works. Hot key: OPERATOR_PRIVATE_KEY (KEEPER_ROLE on FeeSplitter,
// PROPOSER_ROLE on TipJar). Cold admin/guardian NEVER lives here.

const { createPublicClient, createWalletClient, http, defineChain, parseEventLogs } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");

function resolveChainConfig(env = process.env) {
  const chainEnv = env.CHAIN_ENV || "testnet";
  if (!["testnet", "mainnet"].includes(chainEnv)) throw new Error("[chain] invalid CHAIN_ENV");
  const mainnet = chainEnv === "mainnet";
  return {
    chainEnv,
    chainId: mainnet ? 4663 : 46630,
    rpc: (mainnet ? env.RPC_URL_MAINNET : env.RPC_URL_TESTNET)?.trim()
      || (mainnet ? "https://robinhood-rpc.publicnode.com" : "https://robinhood-sepolia-rpc.publicnode.com"),
  };
}
const config = resolveChainConfig();
const RPC = config.rpc;
const CHAIN_ID = config.chainId;

const chain = defineChain({
  id: CHAIN_ID,
  name: config.chainEnv === "mainnet" ? "robinhood-mainnet" : "robinhood-sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

function publicClient() {
  return createPublicClient({ chain, transport: http(RPC, { timeout: 30_000 }) });
}

async function assertChain(client, expected = CHAIN_ID) {
  const actual = await client.getChainId();
  if (actual !== expected) throw new Error(`[chain] RPC chain mismatch: expected ${expected}, got ${actual}`);
}

/** Hot keeper account + wallet client (throws — loud — when the key is absent). */
function walletClient() {
  if (process.env.WORKER_CHAIN_WRITES === "off") throw new Error("[chain] writes disabled");
  const key = (process.env.OPERATOR_PRIVATE_KEY ?? "").trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("[chain] OPERATOR_PRIVATE_KEY missing or malformed");
  }
  const account = privateKeyToAccount(key);
  const base = createWalletClient({ chain, transport: http(RPC, { timeout: 30_000 }), account });
  const client = { ...base };
  for (const action of ["writeContract", "sendTransaction", "deployContract"]) {
    client[action] = async (args) => { await assertChain(publicClient()); return base[action](args); };
  }
  return { account, client };
}

// Minimal ABI fragments — only what the settlement/keeper jobs need.
const ABI = {
  feeSplitter: [
    {
      type: "function",
      name: "harvestAndSplit",
      stateMutability: "nonpayable",
      inputs: [
        { name: "minUsdgOut", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
      outputs: [],
    },
    {
      type: "event",
      name: "FeeSplitExecuted",
      inputs: [
        { type: "uint256", name: "totalMicro", indexed: true },
        { type: "uint256", name: "tipShare", indexed: false },
        { type: "uint256", name: "dropShare", indexed: false },
      ],
    },
  ],
  tipJar: [
    {
      type: "function",
      name: "proposeRoot",
      stateMutability: "nonpayable",
      inputs: [
        { name: "epoch", type: "uint256" },
        { name: "newRoot", type: "bytes32" },
        { name: "totalCumulative", type: "uint256" },
      ],
      outputs: [],
    },
    {
      type: "function",
      name: "activateRoot",
      stateMutability: "nonpayable",
      inputs: [],
      outputs: [],
    },
    { type: "function", name: "merkleRoot", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
    { type: "function", name: "pendingRoot", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
    { type: "function", name: "pendingEpoch", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
    { type: "function", name: "pendingEta", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
    { type: "function", name: "currentEpoch", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  ],
};

async function waitForReceipt(client, hash, timeoutMs = 120_000) {
  return client.waitForTransactionReceipt({ hash, timeout: timeoutMs, pollingInterval: 2_000 });
}

/** Decode the first FeeSplitExecuted from a receipt; returns {totalMicro, tipShare, dropShare} or null. */
function parseFeeSplit(receipt) {
  const logs = parseEventLogs({ abi: ABI.feeSplitter, logs: receipt.logs });
  const ev = logs.find((l) => l.eventName === "FeeSplitExecuted");
  if (!ev) return null;
  const { totalMicro, tipShare, dropShare } = ev.args;
  return { totalMicro: BigInt(totalMicro), tipShare: BigInt(tipShare), dropShare: BigInt(dropShare) };
}

module.exports = { publicClient, walletClient, ABI, waitForReceipt, parseFeeSplit, chain, RPC, CHAIN_ID, resolveChainConfig, assertChain };
