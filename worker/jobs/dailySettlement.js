// Job: daily-settlement (BullMQ `0 0 * * *`, staged via CronJobRun).
// REAL on-chain stages via the hot keeper (KEEPER_ROLE on FeeSplitter,
// PROPOSER_ROLE on TipJar): sweep escrow -> claim USDG -> split 70/30
// micro-EXACT -> reward micro (cap/account iterative + rollover carry) ->
// stage-1 plant-candidate marking -> Merkle BigInt -> R2 -> proposeRoot
// on-chain (RootProposed); activation is permissionless after rootDelay
// (testnet 10min / mainnet 48h). Payload mode {tipjarMicro, micdropMicro}
// skips the harvest leg (dry / reconciliation) but still pays out + proposes.

const { PrismaClient } = require("@prisma/client");
const { scoreOf, distribute, DUST_MICRO } = require("../lib/rewards");
const { buildTree } = require("../lib/merkle");
const { publicClient, walletClient, ABI, waitForReceipt, parseFeeSplit } = require("../lib/chain");
const { fundingConfig, epochIdentity, epochScope } = require("../lib/funding");
const { settleFundingEpoch } = require("../lib/settlementFunding");

const prisma = new PrismaClient();
const SPLIT_TIPJAR_BPS = 7000;
const SPLIT_MICDROP_BPS = 3000;
const SPLIT_COMEDIAN_BPS = 8000;
const SPLIT_CROWD_BPS = 2000;
const SPLIT_COMEDIAN_NUM = SPLIT_COMEDIAN_BPS; // 80% of TipJar inflow
const SPLIT_CROWD_NUM = 10_000 - SPLIT_COMEDIAN_BPS;

async function stage(runId, idem, jobName, epoch, name, fn) {
  await prisma.cronJobRun.update({ where: { idempotency_key: idem }, data: { stage: name } });
  try {
    const out = await fn();
    return out;
  } catch (err) {
    await prisma.cronJobRun.update({
      where: { idempotency_key: idem },
      data: { status: "failed", stage: name, last_error: String(err.message || err).slice(0, 500) },
    });
    throw err;
  }
}

function isConsensusVote(outcomeResult, a) {
  if (!a.vote || a.is_plant) return false;
  if (outcomeResult === "heckled_off") return a.fairness === "unfair";
  const comedianPos = a.position_ai === "A" ? "B" : "A";
  if (outcomeResult === "killed_it") {
    return a.vote === comedianPos || a.vote === "both_right";
  }
  if (outcomeResult === "bombed") {
    return a.vote === a.position_ai || a.vote === "both_right";
  }
  return false;
}

/** Sweep escrow + claim + split 70/30 on-chain, decode FeeSplitExecuted. */
async function harvestOnChain() {
  const splitter = (process.env.FEE_SPLITTER_ADDRESS ?? "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(splitter)) {
    throw new Error("[settle] FEE_SPLITTER_ADDRESS missing");
  }
  const { client, account } = walletClient();
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const hash = await client.writeContract({
    address: splitter,
    abi: ABI.feeSplitter,
    functionName: "harvestAndSplit",
    args: [0n, deadline], // minUsdgOut 0: harvest is value-driven, not quota-driven
    account,
    gas: 600_000n,
  });
  const receipt = await waitForReceipt(publicClient(), hash);
  if (receipt.status !== "success") throw new Error(`[settle] harvest reverted: ${hash}`);
  const split = parseFeeSplit(receipt);
  // Never allow a silent mismatch between chain and DB: if the split event
  // cannot be decoded, fail loudly and reconcile manually (no fake zeros).
  if (!split) throw new Error(`[settle] harvest moved funds but FeeSplitExecuted undecodable (tx ${hash})`);
  return {
    tx: hash,
    tipjarMicro: split.tipShare,
    micdropMicro: split.dropShare,
    totalMicro: split.totalMicro,
  };
}

/** Carry unallocated rollover from the previous epoch (pool − written payouts). */
async function carriedPools(epoch, config) {
  const prev = await prisma.epoch.findFirst({ where: { ...epochScope(config), epoch_number: epoch - 1 } });
  if (!prev) return { com: 0n, crd: 0n };
  const paid = await prisma.reward.groupBy({
    by: ["role"],
    where: { epoch_id: prev.id },
    _sum: { amount_micro_usdg: true },
  });
  const pCom = BigInt(paid.find((p) => p.role === "comedian")?._sum.amount_micro_usdg ?? 0);
  const pCrd = BigInt(paid.find((p) => p.role === "crowd")?._sum.amount_micro_usdg ?? 0);
  const cCom = prev.comedian_micro_usdg > pCom ? prev.comedian_micro_usdg - pCom : 0n;
  const cCrd = prev.crowd_micro_usdg > pCrd ? prev.crowd_micro_usdg - pCrd : 0n;
  return { com: cCom, crd: cCrd };
}

async function run(job) {
  const data = job?.data ?? {};
  if (data.tipjarMicro != null || data.micdropMicro != null) throw new Error("[settle] unbacked payload allocations are disabled; register a funding receipt");
  const config = fundingConfig();
  const identity = epochIdentity(config);
  let epoch = Number(data.epoch_number);
  let since = data.since ? new Date(data.since) : null;
  let until = data.until ? new Date(data.until) : new Date();

  if (!Number.isInteger(epoch) || epoch <= 0) {
    const latest = await prisma.epoch.findFirst({ where: epochScope(config), orderBy: { epoch_number: "desc" } });
    epoch = (latest?.epoch_number ?? 0) + 1;
    if (!since) {
      const scoped = await prisma.epoch.findFirst({where:epochScope(config),orderBy:{epoch_number:"desc"}});
      since = scoped?.end_at ?? new Date(until.getTime() - 24 * 3600 * 1000);
    }
  } else if (!since) {
    since = new Date(until.getTime() - 24 * 3600 * 1000);
  }

  const idem = `daily-settlement:${config.chainId}:${config.tipJar.toLowerCase()}:${epoch}`;
  await prisma.cronJobRun.upsert({
    where: { idempotency_key: idem },
    create: { job_name: "daily-settlement", stage: "sweep_claim", epoch_number: epoch, chain_id:config.chainId, idempotency_key: idem },
    update: { attempt: { increment: 1 }, status: "started", last_error: null },
  });

  // ---- sweep + claim + split (on-chain hot keeper; payload mode skips) ----
  const inflow = await stage(null, idem, null, epoch, "sweep_claim", async () => {
    // CA-only: creator fees are not ours by default. B2B/treasury receipts
    // settle independently, without a zero-value transaction to an escrow.
    if ((process.env.CREATOR_FEE_MODE || "off") !== "off") {
      throw new Error("[settle] automatic creator harvesting requires a verified owned-fee adapter; CA-only mode is off");
    }
    return { tipjarMicro: 0n, micdropMicro: 0n, onchain: false, reason: "creator_fees_not_assumed" };
  });

  // ---- rewards (TipJar inflow: 80% comedians / 20% crowd, + rollover) ----
  const rewards = await stage(null, idem, null, epoch, "rewards", () =>
    settleFundingEpoch(prisma, { epoch, since, until, config, consensus: isConsensusVote }));

  // ---- stage-1 plant candidates (plan §4.6: autonomous 2-stage Plants) ----
  await stage(null, idem, null, epoch, "plant_stage1", async () => {
    const finals = await prisma.outcome.findMany({
      where: { decided_at: { gte: since, lt: until }, bit: { chain_id: config.chainId } },
      include: {
        bit: { include: { assignments: { where: { voted_at: { not: null } } } } },
      },
    });
    let marked = 0;
    for (const o of finals) {
      const bit = o.bit;
      if (bit.is_holdout || bit.is_plant_bank || bit.plant_candidate_at) continue;
      if (o.result !== "killed_it" && o.result !== "bombed") continue;
      const voted = (bit.assignments ?? []).filter((a) => !a.is_plant);
      if (voted.length < 5 || voted.length < o.juror_count) continue;
      if (!voted.every((a) => isConsensusVote(o.result, a))) continue;
      await prisma.bit.update({ where: { id: bit.id }, data: { plant_candidate_at: until } });
      marked++;
    }
    return { marked };
  });

  // ---- Merkle (aggregate across epochs/roles) + R2 + claimable proofs ----
  const merkle = await stage(null, idem, null, epoch, "merkle_r2", async () => {
    const scope = epochScope(config);
    const rows = await prisma.reward.findMany({where:{epoch:scope},select:{amount_micro_usdg:true,user:{select:{wallet:true}}}});
    const sums = new Map();
    for (const row of rows) sums.set(row.user.wallet,(sums.get(row.user.wallet)||0n)+BigInt(row.amount_micro_usdg));
    const agg = [...sums].map(([account,cum])=>({account,cum:String(cum)}));
    const { root, proofs, treeJson } = await buildTree(
      agg.map((a) => ({ account: a.account, cumulativeMicro: a.cum })),
    );
    const { putR2 } = require("./weeklyVault");
    const url = await putR2(`private/merkle/${config.chainId}/${config.tipJar.toLowerCase()}/epoch-${epoch}.json`, treeJson, "application/json").catch(() => null);
    await prisma.epoch.update({ where: { epoch_number_chain_id_tipjar_address:{epoch_number:epoch,...identity} }, data: { merkle_root: root, merkle_r2_url: url } });
    for (const a of agg) {
      const proof = proofs.get(a.account) ?? [];
      const cumBig = BigInt(a.cum || "0");
      // A wallet can have a cumulative entitlement without a new Reward row in
      // this epoch. Update EVERY row for the wallet so its latest proof always
      // matches the active root; storing the proof epoch inside the JSON lets
      // the API distinguish "latest reward epoch" from "latest proof epoch".
      await prisma.reward.updateMany({where:{user:{wallet:a.account},epoch:scope},data:{merkle_proof:{proof,epoch},cumulative_micro_usdg:cumBig}});
    }
    return { root, r2: url, leaves: agg.length };
  });

  // ---- proposeRoot on-chain (hot PROPOSER; veto window per rootDelay) ----
  await stage(null, idem, null, epoch, "propose_root", async () => {
    // Skip when the root did not move since the previous committed epoch —
    // re-proposing identical values creates veto-window noise for no change.
    const prev = await prisma.epoch.findFirst({ where: { ...epochScope(config), epoch_number: epoch - 1 } });
    if (prev && prev.merkle_root === merkle.root) {
      return { proposed: false, reason: "root_unchanged" };
    }
    if (!merkle.root || merkle.leaves === 0) {
      return { proposed: false, reason: "no_entitlements_yet" };
    }
    const tipjar = (process.env.TIPJAR_ADDRESS ?? "").trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(tipjar)) {
      throw new Error("[settle] TIPJAR_ADDRESS missing");
    }
    const agg = await prisma.reward.aggregate({where:{epoch:epochScope(config)},_sum:{amount_micro_usdg:true}});
    const totalCumulative = BigInt(agg._sum.amount_micro_usdg ?? 0);
    // Chain-state guards (pending staged / already active) win over the
    // previous-epoch DB check: reconciliation re-runs must not double-queue.
    const pc = publicClient();
    const [activeRoot, pendingRootNow, pendingEpochNow, chainEpoch] = await Promise.all([
      pc.readContract({ address: tipjar, abi: ABI.tipJar, functionName: "merkleRoot" }),
      pc.readContract({ address: tipjar, abi: ABI.tipJar, functionName: "pendingRoot" }),
      pc.readContract({ address: tipjar, abi: ABI.tipJar, functionName: "pendingEpoch" }),
      pc.readContract({ address: tipjar, abi: ABI.tipJar, functionName: "currentEpoch" }),
    ]);
    if (activeRoot === merkle.root) return { proposed: false, reason: "already_active_onchain" };
    // The on-chain epoch sequence is chain-specific; DB ledger numbers are
    // scoped by chain/gateway and must not force skipped mainnet epochs.
    const chainEpochNum = Number(chainEpoch);
    const targetEpoch = chainEpochNum + 1;
    if (activeRoot === merkle.root) return { proposed: false, reason: "already_active_onchain" };
    if (pendingRootNow !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      if (pendingRootNow === merkle.root) return { proposed: false, reason: "already_pending_onchain", pendingEpoch: Number(pendingEpochNow) };
      return { proposed: false, reason: "another_root_pending", pendingEpoch: Number(pendingEpochNow) };
    }
    const { client, account } = walletClient();
    const hash = await client.writeContract({
      address: tipjar,
      abi: ABI.tipJar,
      functionName: "proposeRoot",
      args: [BigInt(targetEpoch), merkle.root, totalCumulative],
      account,
      gas: 400_000n,
    });
    const receipt = await waitForReceipt(publicClient(), hash);
    if (receipt.status !== "success") throw new Error(`[settle] proposeRoot reverted: ${hash}`);
    await prisma.epoch.update({ where: { epoch_number_chain_id_tipjar_address:{epoch_number:epoch,...identity} }, data: { tx_hash: receipt.transactionHash } });
    return { proposed: true, tx: receipt.transactionHash, epochOnChain: targetEpoch, totalCumulative: totalCumulative.toString(), etaSec: 600 };
  });

  await prisma.cronJobRun.update({ where: { idempotency_key: idem }, data: { status: "done", stage: "propose_root" } });
  return { epoch, rewards, merkleRoot: merkle.root };
}

module.exports = {
  run,
  SPLIT_TIPJAR_BPS,
  SPLIT_MICDROP_BPS,
  SPLIT_COMEDIAN_BPS,
  SPLIT_CROWD_BPS,
  isConsensusVote,
  harvestOnChain,
};
