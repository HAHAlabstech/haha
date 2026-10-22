import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(`${process.cwd()}/package.json`);
let queueModule: {
  canAcceptCrowdVote?: (status: string) => boolean;
  crowdQueueBitFilter?: (chainId: number) => unknown;
} | null = null;
try {
  queueModule = require("./lib/crowd-queue");
} catch {
  // RED phase: assert the missing queue-state guard is observable.
}

test("only active crowd statuses can still receive ballots", () => {
  const canVote = queueModule?.canAcceptCrowdVote;
  assert.equal(typeof canVote, "function");
  if (!canVote) throw new Error("canAcceptCrowdVote is missing");
  assert.equal(canVote("disputed"), true);
  assert.equal(canVote("in_crowd"), true);
  for (const status of ["screening", "answered", "killed_it", "bombed", "heckled_off", "rejected_prescreen"]) {
    assert.equal(canVote(status), false, `${status} must not accept another vote`);
  }
});

test("the blind jury queue filters out finalized and non-mainnet bits", () => {
  const build = queueModule?.crowdQueueBitFilter;
  assert.equal(typeof build, "function");
  if (!build) throw new Error("crowdQueueBitFilter is missing");
  assert.deepEqual(build(4663), {
    chain_id: 4663,
    status: { in: ["disputed", "in_crowd"] },
  });
});
