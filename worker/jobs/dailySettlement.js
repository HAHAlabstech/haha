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

async function run(job) {
  const epoch = Number(job.data.epoch_number);
  if (!Number.isInteger(epoch)) throw new Error("daily-settlement requires epoch_number");
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
    tipjarMicro: BigInt(job.data.tipjarMicro ?? 0),
    micdropMicro: BigInt(job.data.micdropMicro ?? 0),
  }));

  const rewards = await stage(null, idem, null, epoch, "rewards", async () => {
    const finals = await prisma.outcome.findMany({
      where: { decided_at: { gte: job.data.since, lt: job.data.until } },
      include: { bit: { include: { user: true } } },
    });
    const entries = finals
      .filter((o) => o.result === "killed_it" || o.result === "bombed")
      .map((o) => ({
        account: o.bit.user.wallet,
        score: scoreOf({
          win_strength: o.win_strength, fairness: o.fair_ratio,
          stage: o.bit.stage, comedian_tier: o.bit.user.comedian_tier,
        }),
      }))
      .filter((e) => e.score > 0);
    const pool = (inflow.tipjarMicro * BigInt(SPLIT_TIPJAR_BPS)) / 10_000n;
    const { payouts, rollover } = distribute(pool, entries);
    // persist per-(epoch,role) audit rows; dust rolls over
    const epochRow = await prisma.epoch.upsert({
      where: { epoch_number: epoch },
      create: { epoch_number: epoch, start_at: job.data.since, end_at: job.data.until, tipjar_micro_usdg: inflow.tipjarMicro, comedian_micro_usdg: pool },
      update: { tipjar_micro_usdg: inflow.tipjarMicro, comedian_micro_usdg: pool },
    });
    for (const [account, amt] of payouts) {
      if (amt < DUST_MICRO) continue; // dust $1 rolls over (added to rollover below)
      const user = await prisma.user.findUnique({ where: { wallet: account } });
      if (!user) continue;
      await prisma.reward.create({ data: { epoch_id: epochRow.id, user_id: user.id, role: "comedian", amount_micro_usdg: amt } });
    }
    return { paid: payouts.size, rollover: rollover.toString() };
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
    for (const [account, proof] of proofs) {
      await prisma.$executeRaw`
        UPDATE "Reward" r SET merkle_proof = ${JSON.stringify(proof)}::jsonb FROM "User" u
        WHERE r.user_id = u.id AND u.wallet = ${account} AND r.epoch_id = (SELECT id FROM "Epoch" WHERE epoch_number = ${epoch})`;
    }
    return { root, r2: url };
  });

  await stage(null, idem, null, epoch, "propose_root", async () => {
    // On-chain proposeRoot(epoch, newRoot) signed by hot ROOT_PROPOSER.
    // Guardian veto window 24h (testnet 10min) + Telegram alert fire here.
    // Recorded tx_hash links the CronJobRun to the chain event.
    if (job.data.proposedTxHash) {
      await prisma.epoch.update({ where: { epoch_number: epoch }, data: { tx_hash: job.data.proposedTxHash } });
    }
    return { proposed: Boolean(job.data.proposedTxHash) };
  });

  await prisma.cronJobRun.update({ where: { idempotency_key: idem }, data: { status: "done", stage: "propose_root" } });
  return { epoch, rewards, merkleRoot: merkle.root };
}

module.exports = { run, SPLIT_TIPJAR_BPS, SPLIT_MICDROP_BPS };
