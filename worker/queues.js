"use strict";
// BullMQ topology (plan §6.2–6.3): repeatable jobs live in the VPS worker.
// GitHub Actions is CI/CD deploy ONLY (never cron). Queues:
//   bits        — prescreen -> straightman -> normalize (flow chain)
//   five-minute-ops  */5       — SLA/expand, norm retry, plants, retrials
//   daily-settlement 0 0 * * * — sweep/claim/split/reward/merkle/proposeRoot
//   weekly-vault     0 1 * * 0 — AES-GCM snapshot + publishSnapshot
//   season-upgrade   0 2 1,15 * * — 14-day playbook canary gate
//   sync-chain       0 * * * * — graduation/takeover/pause monitor

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
  await queues.dailySettlement.add("settle", {}, { repeat: { pattern: "0 0 * * *" }, jobId: "daily-settle", removeOnComplete: 30 });
  await queues.weeklyVault.add("snapshot", {}, { repeat: { pattern: "0 1 * * 0" }, jobId: "weekly-vault", removeOnComplete: 12 });
  await queues.seasonUpgrade.add("upgrade", {}, { repeat: { pattern: "0 2 1,15 * *" }, jobId: "season-upgrade", removeOnComplete: 12 });
  await queues.syncChain.add("sync", {}, { repeat: { pattern: "0 * * * *" }, jobId: "sync-chain", removeOnComplete: 100 });
}

module.exports = { queues, connection, registerSchedules };
