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
async function carriedPools(epoch) {
  const prev = await prisma.epoch.findUnique({ where: { epoch_number: epoch - 1 } });
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
  let epoch = Number(data.epoch_number);
  let since = data.since ? new Date(data.since) : null;
  let until = data.until ? new Date(data.until) : new Date();

  if (!Number.isInteger(epoch) || epoch <= 0) {
    const latest = await prisma.epoch.findFirst({ orderBy: { epoch_number: "desc" } });
    epoch = (latest?.epoch_number ?? 0) + 1;
    if (!since) {
      since = latest?.end_at ?? new Date(until.getTime() - 24 * 3600 * 1000);
    }
  } else if (!since) {
    since = new Date(until.getTime() - 24 * 3600 * 1000);
  }

  const idem = `daily-settlement:${epoch}`;
  await prisma.cronJobRun.upsert({
    where: { idempotency_key: idem },
    create: { job_name: "daily-settlement", stage: "sweep_claim", epoch_number: epoch, idempotency_key: idem },
    update: { attempt: { increment: 1 }, status: "started", last_error: null },
  });

  // ---- sweep + claim + split (on-chain hot keeper; payload mode skips) ----
  const inflow = await stage(null, idem, null, epoch, "sweep_claim", async () => {
    if (data.tipjarMicro != null) {
      return {
        tipjarMicro: BigInt(data.tipjarMicro),
        micdropMicro: BigInt(data.micdropMicro ?? 0),
        onchain: false,
        tx: data.harvestTxHash ?? null,
      };
    }
    // Retry/reconcile path: reuse the epoch's recorded inflow instead of
    // double-harvesting when this idempotency key already ran.
    const existing = await prisma.epoch.findUnique({ where: { epoch_number: epoch } });
    if (existing && existing.tipjar_micro_usdg > 0n) {
      return {
        tipjarMicro: existing.tipjar_micro_usdg,
        micdropMicro: existing.fee_in_base_units - existing.tipjar_micro_usdg,
        onchain: false,
        tx: existing.tx_hash,
        reused: true,
      };
    }
    const res = await harvestOnChain();
    return { tipjarMicro: res.tipjarMicro, micdropMicro: res.micdropMicro, tx: res.tx, onchain: true };
  });

  // ---- rewards (TipJar inflow: 80% comedians / 20% crowd, + rollover) ----
  const rewards = await stage(null, idem, null, epoch, "rewards", async () => {
    const finals = await prisma.outcome.findMany({
      where: { decided_at: { gte: since, lt: until } },
      include: {
        bit: {
          include: {
            user: true,
            assignments: {
              where: { is_plant: false, voted_at: { not: null } },
              include: { juror: true },
            },
          },
        },
      },
    });
    const comedianEntries = finals
      .filter((o) => o.result === "killed_it" || o.result === "bombed")
      .map((o) => ({
        account: o.bit.user.wallet,
        score: scoreOf({
          win_strength: o.win_strength,
          fairness: o.fair_ratio,
          stage: o.bit.stage,
          comedian_tier: o.bit.user.comedian_tier,
        }),
      }))
      .filter((e) => e.score > 0);

    const crowdEntries = [];
    for (const o of finals) {
      for (const a of o.bit.assignments || []) {
        if (isConsensusVote(o.result, a) && a.juror?.wallet) {
          crowdEntries.push({
            account: a.juror.wallet,
            score: Math.max(0.1, Number(a.vote_weight || 1.0)),
          });
        }
      }
    }

    const carried = await carriedPools(epoch);
    const comedianPool = (inflow.tipjarMicro * BigInt(SPLIT_COMEDIAN_BPS)) / 10_000n + carried.com;
    const crowdPool = (inflow.tipjarMicro * BigInt(SPLIT_CROWD_BPS)) / 10_000n + carried.crd;

    const comedianDist = distribute(comedianPool, comedianEntries);
    const crowdDist = distribute(crowdPool, crowdEntries);

    const epochRow = await prisma.epoch.upsert({
      where: { epoch_number: epoch },
      create: {
        epoch_number: epoch,
        start_at: since,
        end_at: until,
        fee_in_base_units: inflow.tipjarMicro + inflow.micdropMicro,
        tipjar_micro_usdg: inflow.tipjarMicro,
        comedian_micro_usdg: comedianPool,
        crowd_micro_usdg: crowdPool,
      },
      update: {
        fee_in_base_units: inflow.tipjarMicro + inflow.micdropMicro,
        tipjar_micro_usdg: inflow.tipjarMicro,
        comedian_micro_usdg: comedianPool,
        crowd_micro_usdg: crowdPool,
      },
    });

    for (const [account, amt] of comedianDist.payouts) {
      if (amt < DUST_MICRO) continue;
      const user = await prisma.user.findUnique({ where: { wallet: account } });
      if (!user) continue;
      await prisma.reward.create({
        data: { epoch_id: epochRow.id, user_id: user.id, role: "comedian", amount_micro_usdg: amt },
      });
    }

    for (const [account, amt] of crowdDist.payouts) {
      if (amt < DUST_MICRO) continue;
      const user = await prisma.user.findUnique({ where: { wallet: account } });
      if (!user) continue;
      await prisma.reward.create({
        data: { epoch_id: epochRow.id, user_id: user.id, role: "crowd", amount_micro_usdg: amt },
      });
    }

    return {
      comediansPaid: comedianDist.payouts.size,
      crowdPaid: crowdDist.payouts.size,
      carriedCom: carried.com.toString(),
      carriedCrd: carried.crd.toString(),
      rollover: (comedianDist.rollover + crowdDist.rollover).toString(),
    };
  });

  // ---- stage-1 plant candidates (plan §4.6: autonomous 2-stage Plants) ----
  await stage(null, idem, null, epoch, "plant_stage1", async () => {
    const finals = await prisma.outcome.findMany({
      where: { decided_at: { gte: since, lt: until } },
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
    const agg = await prisma.$queryRaw`
      SELECT u.wallet AS account, SUM(r.amount_micro_usdg)::text AS cum
      FROM "Reward" r JOIN "User" u ON u.id = r.user_id
      GROUP BY u.wallet`;
    const { root, proofs, treeJson } = await buildTree(
      agg.map((a) => ({ account: a.account, cumulativeMicro: a.cum })),
    );
    const { putR2 } = require("./weeklyVault");
    const url = await putR2(`private/merkle/epoch-${epoch}.json`, treeJson, "application/json").catch(() => null);
    await prisma.epoch.update({ where: { epoch_number: epoch }, data: { merkle_root: root, merkle_r2_url: url } });
    for (const a of agg) {
      const proof = proofs.get(a.account) ?? [];
      const cumBig = BigInt(a.cum || "0");
      await prisma.$executeRaw`
        UPDATE "Reward" r
        SET merkle_proof = ${JSON.stringify(proof)}::jsonb,
            cumulative_micro_usdg = ${cumBig}
        FROM "User" u
        WHERE r.user_id = u.id AND u.wallet = ${a.account} AND r.epoch_id = (SELECT id FROM "Epoch" WHERE epoch_number = ${epoch})`;
    }
    return { root, r2: url, leaves: agg.length };
  });

  // ---- proposeRoot on-chain (hot PROPOSER; veto window per rootDelay) ----
  await stage(null, idem, null, epoch, "propose_root", async () => {
    // Skip when the root did not move since the previous committed epoch —
    // re-proposing identical values creates veto-window noise for no change.
    const prev = await prisma.epoch.findUnique({ where: { epoch_number: epoch - 1 } });
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
    const agg = await prisma.$queryRaw`
      SELECT SUM(r.amount_micro_usdg)::text AS cum FROM "Reward" r`;
    const totalCumulative = BigInt(agg[0]?.cum ?? "0");
    const { client, account } = walletClient();
    const hash = await client.writeContract({
      address: tipjar,
      abi: ABI.tipJar,
      functionName: "proposeRoot",
      args: [BigInt(epoch), merkle.root, totalCumulative],
      account,
      gas: 400_000n,
    });
    const receipt = await waitForReceipt(publicClient(), hash);
    if (receipt.status !== "success") throw new Error(`[settle] proposeRoot reverted: ${hash}`);
    await prisma.epoch.update({ where: { epoch_number: epoch }, data: { tx_hash: receipt.transactionHash } });
    return { proposed: true, tx: receipt.transactionHash, totalCumulative: totalCumulative.toString(), etaSec: 600 };
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
