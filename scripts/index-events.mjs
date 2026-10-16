#!/usr/bin/env node
// Read-only chain indexer for HAHA game events. Polls the Blockscout API v2
// (plan §7: indexing via Blockscout API / Alchemy webhooks — `eth_getLogs`
// fallback over RPC is FORBIDDEN) and prints/appends new events for:
//   FeeSplitter.FeeSplitExecuted, TipJar RootProposed/Activated/Vetoed,
//   MicDropBurned/Held, ProducerGateway.ProducerPurchase, CrowdStaking.Slashed.
//
// Usage: node scripts/index-events.mjs [--chain testnet|mainnet] [--since-block N]
// State: scripts/.indexer-state.json  (last indexed block per chain)
// Env (server-only): TESTNET/MAINNET explorer base URLs; no keys needed.

const CHAINS = {
  testnet: { id: 46630, api: "https://explorer.testnet.chain.robinhood.com/api/v2" },
  mainnet: { id: 4663, api: "https://robinhoodchain.blockscout.com/api/v2" },
};

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; })
);
const chain = CHAINS[args.chain ?? process.env.CHAIN_ENV ?? "testnet"] ?? CHAINS.testnet;

const ADDRESSES = Object.fromEntries(
  ["FEE_SPLITTER_ADDRESS", "TIPJAR_ADDRESS", "MICDROP_ADDRESS", "CROWD_STAKING_ADDRESS", "PRODUCER_GATEWAY_ADDRESS"]
    .map((k) => [k, process.env[k] ?? ""])
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getLogs(address, fromBlock) {
  // Blockscout v2 address logs endpoint (read-only, no RPC eth_getLogs).
  const url = `${chain.api}/addresses/${address}/logs?from_block=${fromBlock}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (res.status === 403) throw new Error(`Blockscout 403 for ${url} — retry from VPS / use Alchemy webhook mirror`);
  if (!res.ok) throw new Error(`Blockscout ${res.status} for ${url}`);
  return res.json();
}

let state = {};
try {
  const { readFileSync } = await import("node:fs");
  state = JSON.parse(readFileSync(new URL("./.indexer-state.json", import.meta.url), "utf8"));
} catch { state = {}; }

const cursorKey = `chain_${chain.id}`;
let fromBlock = Number(args["since-block"] ?? state[cursorKey] ?? "latest");
if (Number.isNaN(fromBlock)) {
  const st = await (await fetch(`${chain.api}/stats`)).json();
  fromBlock = Number(st.latest_block ?? st.total_blocks ?? 0);
}

let highWater = fromBlock;
for (const [label, address] of Object.entries(ADDRESSES)) {
  if (!address) { console.log(`SKIP  ${label} (unset)`); continue; }
  await sleep(300); // public endpoint rate-limit courtesy
  try {
    const logs = await getLogs(address, fromBlock);
    const items = logs.items ?? logs ?? [];
    console.log(`SCAN  ${label} ${address} :: ${items.length} log(s) since ${fromBlock}`);
    for (const log of items) {
      console.log(JSON.stringify({ chain: chain.id, contract: label, block: log.block_number, tx: log.transaction_hash, topics: (log.topics ?? []).slice(0, 2) }));
      if (Number(log.block_number) > highWater) highWater = Number(log.block_number);
    }
  } catch (err) {
    console.error(`WARN  ${label}: ${err.message}`);
  }
}

state[cursorKey] = highWater;
const { writeFileSync } = await import("node:fs");
writeFileSync(new URL("./.indexer-state.json", import.meta.url), JSON.stringify(state, null, 2));
console.log(`CURSOR ${cursorKey} -> ${highWater}`);
