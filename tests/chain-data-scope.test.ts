import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(`${process.cwd()}/package.json`);
let scopeModule: { buildChainDataScope?: (chainId: number) => any } | null = null;
try {
  scopeModule = require("./lib/chain-data-scope");
} catch {
  // The first TDD run verifies the missing production helper fails assertions.
}

function buildScope(chainId: number) {
  const build = scopeModule?.buildChainDataScope;
  assert.equal(typeof build, "function");
  if (!build) throw new Error("buildChainDataScope is missing");
  return build(chainId);
}

test("builds read filters that isolate bits, jury votes, snapshots, and revenue by chain", () => {
  const scope = buildScope(4663);
  assert.deepEqual(scope.killedBits, { chain_id: 4663, status: "killed_it" });
  assert.deepEqual(scope.publicBits, {
    chain_id: 4663,
    is_holdout: false,
    share_public: true,
    status: { in: ["killed_it", "bombed", "in_crowd", "answered"] },
  });
  assert.deepEqual(scope.votedAssignments, {
    is_plant: false,
    voted_at: { not: null },
    bit: { chain_id: 4663 },
  });
  assert.deepEqual(scope.publishedSnapshots, { chain_id: 4663, tx_hash: { not: null } });
  assert.deepEqual(scope.batchSnapshots, {
    chain_id: 4663,
    tx_hash: { not: null },
    r2_dataset_key: { not: null },
  });
  assert.deepEqual(scope.revenue, { chain_id: 4663 });
});

test("testnet scope remains separate from the production mainnet scope", () => {
  const mainnet = buildScope(4663);
  const testnet = buildScope(46630);
  assert.equal(mainnet.killedBits.chain_id, 4663);
  assert.equal(testnet.killedBits.chain_id, 46630);
  assert.notDeepEqual(mainnet.publishedSnapshots, testnet.publishedSnapshots);
  assert.notDeepEqual(mainnet.revenue, testnet.revenue);
});
