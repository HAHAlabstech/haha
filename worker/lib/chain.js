"use strict";
// worker/lib/chain.js — viem chain access for the BullMQ jobs (hot keeper).
// The worker image ships app deps (viem in prod deps), so plain CJS require
// works. Hot key: OPERATOR_PRIVATE_KEY (KEEPER_ROLE on FeeSplitter,
// PROPOSER_ROLE on TipJar). Cold admin/guardian NEVER lives here.

const { createPublicClient, createWalletClient, http, defineChain, parseEventLogs } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");

const RPC =
  process.env.RPC_URL_TESTNET?.trim() || "https://robinhood-sepolia-rpc.publicnode.com";
const CHAIN_ID = Number(process.env.CHAIN_ID_TESTNET || 46630);

const chain = defineChain({
  id: CHAIN_ID,
  name: "robinhood-sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

function publicClient() {
  return createPublicClient({ chain, transport: http(RPC, { timeout: 30_000 }) });
}

/** Hot keeper account + wallet client (throws — loud — when the key is absent). */
function walletClient() {
  const key = (process.env.OPERATOR_PRIVATE_KEY ?? "").trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("[chain] OPERATOR_PRIVATE_KEY missing or malformed");
  }
  const account = privateKeyToAccount(key);
  const client = createWalletClient({ chain, transport: http(RPC, { timeout: 30_000 }), account });
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
        { type: "uint256", name: "totalMicro", indexed: false },
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

module.exports = { publicClient, walletClient, ABI, waitForReceipt, parseFeeSplit, chain, RPC, CHAIN_ID };
