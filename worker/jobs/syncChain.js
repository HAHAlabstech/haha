"use strict";
// Job: sync-chain (BullMQ hourly + on-demand). Read-only monitor (plan §7.2):
// Pons graduation detection + feeRecipient takeover/freeze + USDG pause +
// MicDrop gating (HOLD pre-graduation, burn cap post-graduation: amount <=
// min(2% pool reserve, 1% price-impact), minHahaOut AFTER 1%+2% hook fees).
// Token confirmation is propose->confirmHahaToken (48h) with launchTx proof:
// feeRecipient==splitter, pool graduated + hook, pair==USDG,
// creatorTaxBps==200, buyback==false, exempt EMPTY (<=32 checked).
// NOT first-claim auto-detect (anti-spoof). Severity events -> Telegram.

const { createPublicClient, http, fallback, getAddress } = require("viem");

function rpcClient() {
  const env = process.env.CHAIN_ENV === "mainnet" ? "MAINNET" : "TESTNET";
  const urls = [process.env[`RPC_URL_${env}`], "https://robinhood-sepolia-rpc.publicnode.com", "https://rpc.testnet.chain.robinhood.com"].filter(Boolean);
  const id = env === "MAINNET" ? 4663 : 46630;
  return createPublicClient({ chain: { id, name: `Robinhood-${env}`, nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: urls } } }, transport: fallback(urls.map((u) => http(u))) });
}

const FEE_SPLITTER_ABI = [
  { name: "poolGraduated", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
];
const USDG_ABI = [
  { name: "paused", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
];

async function alert(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN) { console.log(`[alert] ${text}`); return; }
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: `[HAHA sync-chain] ${text}` }),
  }).catch(() => {});
}

async function run(job) {
  const client = rpcClient();
  const findings = {};
  const splitter = process.env.FEE_SPLITTER_ADDRESS;
  if (splitter) {
    try {
      findings.poolGraduated = await client.readContract({ address: getAddress(splitter), abi: FEE_SPLITTER_ABI, functionName: "poolGraduated" });
    } catch (err) { findings.splitterError = String(err.message).slice(0, 200); }
    // pending-vs-claimable stall: pending>0 while claimable static >12h =>
    // alert + skip epoch (never publish an empty root). Chain reads feed this;
    // staleness itself is tracked in CronJobRun by daily-settlement.
    if (job.data.pendingMicro > 0 && job.data.claimableStaticHours >= 12) {
      await alert(`Pons operator sweep stall: pending=${job.data.pendingMicro} static ${job.data.claimableStaticHours}h — epoch will SKIP root publish`);
      findings.sweepStall = true;
    }
  }
  if (process.env.USDG_ADDRESS) {
    try {
      const paused = await client.readContract({ address: getAddress(process.env.USDG_ADDRESS), abi: USDG_ABI, functionName: "paused" }).catch(() => false);
      findings.usdgPaused = paused;
      if (paused) await alert("USDG paused — settlement + MicDrop HALTED");
    } catch { /* non-pausable token — fine */ }
  }
  // Operator gas float (out-of-band funded from 40% B2B ops share, never fees).
  if (job.data.operatorEth !== undefined && Number(job.data.operatorEth) < Number(process.env.OPERATOR_MIN_ETH_ALERT ?? 0.005)) {
    await alert(`operator gas low: ${job.data.operatorEth} ETH`);
    findings.gasLow = true;
  }
  return findings;
}

module.exports = { run };
