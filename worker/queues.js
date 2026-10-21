"use strict";
// BullMQ topology (plan §6.2–6.3): repeatable jobs live in the VPS worker.
// GitHub Actions is CI/CD deploy ONLY (never cron). Queues:
//   bits        — prescreen -> straightman -> normalize (flow chain)
//   five-minute-ops  */5       — SLA/expand, norm retry, plants, retrials
//   daily-settlement 0 0 * * * — sweep/claim/split/reward/merkle/proposeRoot
//   weekly-vault     0 1 * * 0 — AES-GCM snapshot + publishSnapshot
//   season-upgrade   0 2 1,15 * * — 14-day playbook canary gate
//   sync-chain       */10      — CA launch-phase / buyback-reserve monitor

const { Queue } = require("bullmq");

const connection = { url: process.env.REDIS_URL ?? "redis://redis:6379", maxRetriesPerRequest: null };
const queues = {
  bits: new Queue("bits", { connection }),
  fiveMinuteOps: new Queue("five-minute-ops", { connection }),
  dailySettlement: new Queue("daily-settlement", { connection }),
  weeklyVault: new Queue("weekly-vault", { connection }),
  seasonUpgrade: new Queue("season-upgrade", { connection }),
  syncChain: new Queue("sync-chain", { connection }),
};

async function registerSchedules() {
  await queues.fiveMinuteOps.add("tick", {}, { repeat: { pattern: "*/5 * * * *" }, jobId: "five-min-tick", removeOnComplete: 100 });

  // WORKER_CHAIN_WRITES=off (laptop dev): DO NOT register — and proactively
  // REMOVE any previously registered — schedules that write to the REAL
  // chain / prod R2 using operator keys + a laptop's local-DB data:
  //   daily-settlement (merkle root proposeRoot), weekly-vault (R2 publish),
  //   season-upgrade (playbook gate). A laptop bootstrapped with seed data
  //   proposing a live epoch root would corrupt testnet state.
  const chainWrites = (process.env.WORKER_CHAIN_WRITES ?? "on") !== "off";
  if (chainWrites) {
    await queues.dailySettlement.add("settle", {}, { repeat: { pattern: "0 0 * * *" }, jobId: "daily-settle", removeOnComplete: 30 });
    await queues.weeklyVault.add("snapshot", {}, { repeat: { pattern: "0 1 * * 0" }, jobId: "weekly-vault", removeOnComplete: 12 });
    await queues.seasonUpgrade.add("upgrade", {}, { repeat: { pattern: "0 2 1,15 * *" }, jobId: "season-upgrade", removeOnComplete: 12 });
  } else {
    console.log("[queues] WORKER_CHAIN_WRITES=off — skipping/removing daily-settlement, weekly-vault, season-upgrade schedules");
    await queues.dailySettlement.removeRepeatable("settle", { pattern: "0 0 * * *" }, "daily-settle").catch(() => {});
    await queues.weeklyVault.removeRepeatable("snapshot", { pattern: "0 1 * * 0" }, "weekly-vault").catch(() => {});
    await queues.seasonUpgrade.removeRepeatable("upgrade", { pattern: "0 2 1,15 * *" }, "season-upgrade").catch(() => {});
  }

  // Remove the prior hourly schedule when deploying the CA-aware reserve
  // monitor; it refreshes only when route/phase/reserve is valid.
  await queues.syncChain.removeRepeatable("sync", { pattern: "0 * * * *" }, "sync-chain").catch(() => {});
  await queues.syncChain.add("sync", {}, { repeat: { pattern: "*/10 * * * *" }, jobId: "sync-chain", removeOnComplete: 100 });
}

module.exports = { queues, connection, registerSchedules };
