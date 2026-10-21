const { test } = require('node:test');
const assert = require('node:assert/strict');
const chain = require('../worker/lib/chain');

test('mainnet uses mainnet RPC and never a testnet fallback', () => {
  assert.deepEqual(chain.resolveChainConfig({ CHAIN_ENV: 'mainnet', RPC_URL_MAINNET: 'https://main.example', RPC_URL_TESTNET: 'https://test.example' }),
    { chainEnv: 'mainnet', chainId: 4663, rpc: 'https://main.example' });
  assert.equal(chain.resolveChainConfig({ CHAIN_ENV: 'mainnet' }).rpc, 'https://robinhood-rpc.publicnode.com');
  assert.throws(() => chain.resolveChainConfig({ CHAIN_ENV: 'typo' }), /CHAIN_ENV/);
});
test('testnet resolves 46630 independently of stale chain-id variables', () => {
  assert.equal(chain.resolveChainConfig({ CHAIN_ENV: 'testnet', CHAIN_ID_TESTNET: '4663' }).chainId, 46630);
});
test('RPC mismatch fails before a transaction can be signed', async () => {
  await assert.rejects(chain.assertChain({ getChainId: async () => 4663 }, 46630), /chain mismatch/);
});
test('local writes-off prevents wallet creation even if a key is present', () => {
  const prev = process.env.WORKER_CHAIN_WRITES;
  process.env.WORKER_CHAIN_WRITES = 'off';
  try { assert.throws(() => chain.walletClient(), /writes disabled/); }
  finally { if (prev === undefined) delete process.env.WORKER_CHAIN_WRITES; else process.env.WORKER_CHAIN_WRITES = prev; }
});
