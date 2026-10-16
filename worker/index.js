"use strict";
// Worker entrypoint. Docker: `node worker/index.js` (same image as `app`).
// Registers BullMQ repeatable schedules, then serves all queues with
// retry/backoff (attempts 5, exponential 30s base). No invocation/CPU caps
// (VPS, not serverless) — heavy jobs (Merkle 500+, embed batch 32) run inline.

const { Worker, FlowProducer } = require("bullmq");
const { connection, registerSchedules } = require("./queues");

const OPTS = { connection, concurrency: 4 };
const BACKOFF = { attempts: 5, backoff: { type: "exponential", delay: 30_000 } };

async function main() {
  await registerSchedules();

  const bits = new Worker("bits", async (job) => {
    if (job.name === "prescreen") {
      const out = await require("./jobs/prescreen").run(job);
      if (out.passed) {
        const flow = new FlowProducer({ connection });
        await flow.add({ name: "straightman", queueName: "bits", data: { bitId: job.data.bitId }, opts: BACKOFF, children: [] });
      }
      return out;
    }
    if (job.name === "straightman") return require("./jobs/straightman").run(job);
    if (job.name === "normalize") return require("./jobs/normalize").run(job);
    throw new Error(`unknown bits job ${job.name}`);
  }, OPTS);

  const five = new Worker("five-minute-ops", (job) => require("./jobs/fiveMinuteOps").run(job), { ...OPTS, concurrency: 1 });
  const settle = new Worker("daily-settlement", (job) => require("./jobs/dailySettlement").run(job), { ...OPTS, concurrency: 1 });
  const vault = new Worker("weekly-vault", (job) => require("./jobs/weeklyVault").run(job), { ...OPTS, concurrency: 1 });
  const season = new Worker("season-upgrade", (job) => require("./jobs/seasonUpgrade").run(job), { ...OPTS, concurrency: 1 });
  const sync = new Worker("sync-chain", (job) => require("./jobs/syncChain").run(job), { ...OPTS, concurrency: 2 });

  for (const w of [bits, five, settle, vault, season, sync]) {
    w.on("failed", (job, err) => console.error(`[worker] ${w.name}/${job?.name} failed: ${err.message}`));
    w.on("completed", (job) => console.log(`[worker] ${w.name}/${job?.name} done`));
  }
  console.log("[worker] HAHA queues serving (bits, five-minute-ops, daily-settlement, weekly-vault, season-upgrade, sync-chain)");
}

main().catch((err) => { console.error(err); process.exit(1); });
