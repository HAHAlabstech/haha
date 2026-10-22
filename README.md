# HAHA — AI Comedy Lab

Human comedians hold the mic against an AI Straight Man. The Crowd juries
blind, results settle with real Merkle payouts (TipJar), and every
settled bit is hashed into The Joke Vault.

- **Prod (mainnet 4663):** https://haha.asifaq.com — cut over 21 Okt 2026
- **Chain:** Robinhood Chain — mainnet `4663` (LIVE), testnet `46630`
  (data lama tetap di DB, chain-scoped; lihat `docs/MAINNET-HANDOFF.md`)
- **Stack:** Next.js (App Router) + Prisma/Postgres + BullMQ worker + Foundry
  suite + Cloudflare R2 + MiMo 2.6.

## Local Development (WSL Docker)

```powershell
# 1) Local stack: Postgres 16 (password in .env) + Redis 6380
wsl -d Ubuntu-22.04 -- docker start haha-db-local haha-redis-local

# 2) App + Worker
npm run dev            # http://localhost:3000
npm run dev:worker     # BullMQ — Local dev MUST set: WORKER_CHAIN_WRITES=off in .env
```

## Cluster (VPS 43.134.60.117)

CI pipeline `haha-ci-deploy` (GitHub main push): migrate → build/push →
compose up + healthcheck + preflight. Containers: `haha-app-1`,
`haha-worker-1`, `haha-db-1`, `haha-redis-1`, `haha-caddy-1`.

```powershell
# Quick check containers / psql / job state
ssh -i "$env:USERPROFILE\.ssh\hadeh.pem" ubuntu@43.134.60.117 "docker ps"
... "docker exec -i haha-db-1 psql -U haha -d haha -c 'SELECT ...'"
```

## Cron Jobs (Worker)

| Job | Schedule | Function |
| --- | --- | --- |
| `five-minute-ops` | `*/5` | SLA expire + re-seat, thin 5→7 top-up, plant stage-2, appeal retrial, **TipJar keeper (activate pending root)** |
| `daily-settlement` | `00:00` | Verified chain-scoped USDG receipts (B2B/treasury; creator fees OFF by default) → reward distribution → Merkle + R2 → `proposeRoot` |
| `normalize` | event | A/B text normalization |
| `weekly-vault` | weekly | Root VaultRegistry |

Job status: table `CronJobRun` (columns `job_name/stage/status/last_error`).

## TipJar Payout Loop (Important during QA)

1. Funding receipts are unique by `(chain, tx, log)` and verified against the configured gateway, event and USDG transfer. Every 00:00 UTC settlement builds the tree (leaf = `keccak(keccak(account, cumulativeMicro))` — MUST use `worker/lib/merkle.js`).
2. `proposeRoot(epoch, root, total)` + veto window `rootDelay` (600s testnet / 24h mainnet).
3. **Keeper** automatically calls `activateRoot()` on the 5-minute tick after ETA.
4. Claim via UI: EIP-712 (`HAHA-TipJar`, contract `verifyingContract`) → `/api/rewards/claim` → `eth_sendTransaction` `TipJar.claim()`.

Claim error `InvalidProof()` ⇒ on-chain root ≠ DB (check `Epoch.merkle_root` vs chain `merkleRoot()`), not a UI bug.

## CA-only revenue and capital

- The launcher supplies only a CA; HAHA does not assume it owns Pons creator
  fees. Creator harvesting stays `CREATOR_FEE_MODE=off` by default.
- Reward funding is imported from successful USDG transfers/events emitted by
  the configured `ProducerGateway` or explicit `fundRewards` deposits. It is
  unique per chain/tx/log; unbound batch royalties stay reserved.
- See `docs/CA-ONLY-BUDGET.md` for actual deployments, current operator balance,
  optional USDG seed and usage-based service costs.

## QA Wallet Bridge (End-to-End Testing without MetaMask)

CDP `initScript` injects EIP-6963 provider per navigation (lost on reload; `initScript` must be re-attached). Chain:
`eth_requestAccounts → wallet_switchEthereumChain(null) → eth_chainId → personal_sign`. Signatures via `sign-bridge.cjs` (stdin JSON; operator key from `.env.worker`, juror keys from temporary pool — never print/commit). ChainId answers `0xb626`.

## Contracts (Mainnet 4663 — deployed 21 Okt 2026, broadcast by owner `0xAeA6…B651` single-wallet)

| Contract | Address |
| --- | --- |
| TipJar | `0xda4762e4205aFf2d8CB9177cDcE6d69A23068bbE` |
| FeeSplitter | `0xE9a827aC2834fFD30DDa5b7d710dbfbE43afe144` |
| MicDrop | `0x57dDE4efC1868A153be6b8d040d13A8d28993949` |
| V4BuybackAdapter | `0x9754F06cA930B9190Dc622D26532Db77E6B76E2c` |
| VaultRegistry | `0x27e5ADf5F3BfEBFA7B7B81619CA68a97CD1866D6` |
| ProducerGateway | `0x71826870a70064F0657EF527AFd9d1029Ae950de` |
| USDG (6dp) | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |
| Standalone fixed-supply HAHA | `0xd2Da320EF90FB76809587C830A33a49512bA90D9` |
| CrowdStaking (bound to standalone HAHA) | `0xe861a2c5d2114A76779d91d416c750bE7D3f7d88` |

The standalone token has 1B initial supply, all at the operator wallet; it has
no mint function and no market/pool. The former public-mint MockHAHA remains
on-chain but is not configured. MicDrop is unbound and buyback route unset
(HOLD) until the Pons CA graduates and a route/quote is configured. If a later
Pons CA replaces the interim token, deploy a new CrowdStaking and do not assume
balances migrate. Root delay mainnet 24h, timelock 48h. Testnet addresses:

| Contract | Testnet 46630 |
| --- | --- |
| TipJar | `0x03f26784cFE5808DC4A669bbB6D410d08765a675` |
| FeeSplitter | `0xC79D6Bc6955844cB396cF67a66eD7f084fA19C7d` |
| MicDrop | `0xCEc9922655BCfFD4cec6A6aA1b9e992C1dfa1d28` |
| USDG (mock) | `0x6b72879a2144049a10b176a827f1603bdb0b72ab` |

## RESTRICTIONS / FORBIDDEN

- Mainnet suite IS deployed (TipJar, FeeSplitter, MicDrop, V4BuybackAdapter,
  VaultRegistry, ProducerGateway). Do NOT redeploy without running
  `scripts/preflight-mainnet.mjs` + a fork simulation first; duplicates waste
  gas and split state.
- Do NOT put testnet/mock addresses into mainnet env — funds go to the wrong
  contracts.
- Do NOT commit `.env*`, `next-env.d.ts`, or QA screenshots to repository root.
- Do NOT build Merkle trees manually for claims (use the server writer).
