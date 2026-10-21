"use strict";
const { decodeEventLog, parseAbi, keccak256, toBytes } = require("viem");
const FUNDING_ABI = parseAbi([
  "event ProducerPurchase(bytes32 indexed orderId,bytes32 indexed batchId,address indexed buyer,uint8 planType,uint256 operatorShare,uint256 tipJarGeneralShare,uint256 royaltyShare,uint256 micDropShare)",
  "event RewardsFunded(address indexed funder,uint256 amountMicro)",
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);
const lower = (s) => String(s).toLowerCase();
function epochIdentity({ chainId, tipJar }) {
  return { chain_id: chainId, tipjar_address: lower(tipJar) };
}
function epochScope({ chainId, tipJar }) {
  const address = lower(tipJar);
  const identity = epochIdentity({ chainId, tipJar });
  return chainId === 46630 ? { chain_id: chainId, OR: [{ tipjar_address: address }, { tipjar_address: "" }] } : identity;
}
function fundingConfig(env = process.env) {
  const { resolveChainConfig } = require("./chain");
  const { chainId } = resolveChainConfig(env);
  const out = { chainId, gateway: lower(env.PRODUCER_GATEWAY_ADDRESS || ""), tipJar: lower(env.TIPJAR_ADDRESS || ""), usdg: lower(env.USDG_ADDRESS || env.TESTNET_MOCK_USDG || "") };
  for (const key of ["gateway", "tipJar", "usdg"]) {
    if (!/^0x[0-9a-f]{40}$/.test(out[key]) || /^0x0{40}$/.test(out[key])) throw new Error(`[funding] ${key} missing`);
  }
  if (chainId === 4663 && !env.USDG_ADDRESS) throw new Error("[funding] mainnet USDG must be explicit");
  return out;
}
function decodeFundingReceipt(receipt, config) {
  if (receipt.status !== "success") throw new Error("[funding] payment reverted");
  const rows = [];
  let transferred = 0n;
  const inbound=new Map(), expectedInbound=new Map();
  let expectedTipJar=0n;
  for (const log of receipt.logs) {
    let ev;
    try { ev = decodeEventLog({ abi: FUNDING_ABI, data: log.data, topics: log.topics, strict: true }); } catch { continue; }
    const a = ev.args;
    if (lower(log.address) === lower(config.usdg) && ev.eventName === "Transfer") {
      if(lower(a.to)===lower(config.gateway)) inbound.set(lower(a.from),(inbound.get(lower(a.from))||0n)+a.value);
      if(lower(a.from)===lower(config.gateway) && lower(a.to)===lower(config.tipJar)) transferred += a.value;
    }
    if (lower(log.address) !== lower(config.gateway)) continue;
    if (!["ProducerPurchase", "RewardsFunded"].includes(ev.eventName)) continue;
    const purchase = ev.eventName === "ProducerPurchase";
    const payer=purchase?lower(a.buyer):lower(a.funder);
    const expected=purchase ? a.operatorShare+a.tipJarGeneralShare+a.royaltyShare+a.micDropShare : a.amountMicro;
    expectedInbound.set(payer,(expectedInbound.get(payer)||0n)+expected);
    expectedTipJar += purchase ? a.tipJarGeneralShare+a.royaltyShare : a.amountMicro;
    rows.push({ chain_id: config.chainId, gateway_address: lower(config.gateway), tipjar_address: lower(config.tipJar),
      tx_hash: lower(receipt.transactionHash), log_index: Number(log.logIndex), block_number: receipt.blockNumber,
      source: purchase ? "b2b" : "treasury", batch_id: purchase ? a.batchId : null,
      general_micro_usdg: purchase ? a.tipJarGeneralShare : a.amountMicro,
      royalty_remaining_micro: purchase ? a.royaltyShare : 0n });
  }
  if (!rows.length) throw new Error("[funding] no funding event from configured gateway");
  const required = rows.reduce((s,r) => s + r.general_micro_usdg + r.royalty_remaining_micro, 0n);
  if (required <= 0n || transferred < required || transferred < expectedTipJar) throw new Error("[funding] USDG transfer does not back funding events");
  for(const [payer,amount] of expectedInbound) if((inbound.get(payer)||0n)<amount) throw new Error("[funding] buyer transfer does not back gateway event");
  return rows;
}
function splitFundingPools(rows) {
  let general=0n, royalty=0n, reservedRoyalty=0n;
  for (const r of rows) {
    if (!r.general_epoch_id) general += BigInt(r.general_micro_usdg);
    const amount=BigInt(r.royalty_remaining_micro);
    if (Array.isArray(r.contributors_json) && r.contributors_json.length) royalty += amount;
    else reservedRoyalty += amount;
  }
  return { general, royalty, reservedRoyalty };
}
/** Import a public receipt; recipients are resolved only from stored snapshots.
 * @param {any} prisma
 * @param {any} client
 * @param {any} hash
 * @param {any} config
 * @param {string|null} [snapshotId]
 */
async function importFundingReceipt(prisma, client, hash, config, snapshotId = null) {
  if (await client.getChainId() !== config.chainId) throw new Error("[funding] RPC chain mismatch");
  const receipt = await client.getTransactionReceipt({ hash });
  const rows = decodeFundingReceipt(receipt, config);
  let snapshot = null;
  if (snapshotId) snapshot = await prisma.vaultSnapshot.findUnique({ where: { id: snapshotId }, select: { id: true, contributors_json: true } });
  for (const row of rows) {
    const manifest = snapshot && row.batch_id === keccak256(toBytes(snapshot.id)) ? snapshot.contributors_json : null;
    // Never reset consumed amounts on a receipt replay. Binding a previously
    // unknown manifest is safe only when its immutable batch hash matches.
    await prisma.rewardFundingReceipt.upsert({
      where: { chain_id_tx_hash_log_index: { chain_id: row.chain_id, tx_hash: row.tx_hash, log_index: row.log_index } },
      create: { ...row, ...(manifest ? { contributors_json: manifest } : {}) },
      update: manifest ? { contributors_json: manifest } : {},
    });
  }
  return rows;
}
module.exports = { FUNDING_ABI, epochIdentity, epochScope, fundingConfig, decodeFundingReceipt, splitFundingPools, importFundingReceipt };
