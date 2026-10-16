"use strict";
// Job: daily-settlement (BullMQ `0 0 * * *`, staged via CronJobRun).
// sweep -> claim -> split 70/30 micro-EXACT -> reward micro (cap/account
// iterative + rollover) -> Merkle BigInt -> R2 -> proposeRoot (hot
// ROOT_PROPOSER; guardian veto 24h / testnet 10min + Telegram alert).
// Skips publishing an empty root when Pons-operator sweep is pending
// (pending>0 but claimable static >12h => alert + skip). Gas float is
// out-of-band; alert if OPERATOR ETH < 0.005. Pre-graduation: MicDrop HOLD.

const { PrismaClient } = require("@prisma/client");
const { scoreOf, distribute, DUST_MICRO } = require("../lib/rewards");
const { buildTree } = require("../lib/merkle");

const prisma = new PrismaClient();
const SPLIT_TIPJAR_BPS = 7000;
const SPLIT_MICDROP_BPS = 3000;
const SPLIT_COMEDIAN_BPS = 8000;
const SPLIT_CROWD_BPS = 2000;

async function stage(runId, idem, jobName, epoch, name, fn) {
  await prisma.cronJobRun.update({ where: { idempotency_key: idem }, data: { stage: name } });
  try {
    const out = await fn();
    return out;
  } catch (err) {
    await prisma.cronJobRun.update({ where: { idempotency_key: idem }, data: { status: "failed", last_error: String(err.message).slice(0, 500) } });
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
    create: { job_name: "daily-settlement", stage: "sweep", epoch_number: epoch, idempotency_key: idem },
    update: { attempt: { increment: 1 }, status: "started", last_error: null },
  });

  // stages sweep/claim/split execute on-chain via the hot keeper; the worker
  // records resulting micro amounts (authoritative numbers come from receipts
  // + FeeSplitExecuted events via scripts/index-events.mjs).
  const inflow = await stage(null, idem, null, epoch, "sweep_claim", async () => ({
    tipjarMicro: BigInt(data.tipjarMicro ?? 0),
    micdropMicro: BigInt(data.micdropMicro ?? 0),
  }));

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

    // Within TipJar inflow: 80% Comedians, 20% Crowd jurors
    const comedianPool = (inflow.tipjarMicro * BigInt(SPLIT_COMEDIAN_BPS)) / 10_000n;
    const crowdPool = inflow.tipjarMicro - comedianPool;

    const comedianDist = distribute(comedianPool, comedianEntries);
    const crowdDist = distribute(crowdPool, crowdEntries);

    const epochRow = await prisma.epoch.upsert({
      where: { epoch_number: epoch },
      create: {
        epoch_number: epoch,
        start_at: since,
        end_at: until,
        tipjar_micro_usdg: inflow.tipjarMicro,
        comedian_micro_usdg: comedianPool,
        crowd_micro_usdg: crowdPool,
      },
      update: {
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

    const totalRollover = comedianDist.rollover + crowdDist.rollover;
    return {
      comediansPaid: comedianDist.payouts.size,
      crowdPaid: crowdDist.payouts.size,
      rollover: totalRollover.toString(),
    };
  });

  // Merkle: leaf = AGGREGATE across (wallet, all epochs, all roles) — sum at
  // settlement; Reward rows stay per-(epoch,role) for audit. Double-hash both sides.
  const merkle = await stage(null, idem, null, epoch, "merkle_r2", async () => {
    const agg = await prisma.$queryRaw`
      SELECT u.wallet AS account, SUM(r.amount_micro_usdg)::text AS cum
      FROM "Reward" r JOIN "User" u ON u.id = r.user_id
      GROUP BY u.wallet`;
    const { root, proofs, treeJson } = await buildTree(agg.map((a) => ({ account: a.account, cumulativeMicro: a.cum })));
    // R2 upload: private/merkle/epoch-{n}.json (S3 PutObject via worker R2 client)
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
    return { root, r2: url };
  });

  await stage(null, idem, null, epoch, "propose_root", async () => {
    // On-chain proposeRoot(epoch, newRoot, newTotalEntitled) signed by hot ROOT_PROPOSER.
    // Guardian veto window 24h (testnet 10min) + Telegram alert fire here.
    // Recorded tx_hash links the CronJobRun to the chain event.
    if (data.proposedTxHash) {
      await prisma.epoch.update({ where: { epoch_number: epoch }, data: { tx_hash: data.proposedTxHash } });
    }
    return { proposed: Boolean(data.proposedTxHash) };
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
};
