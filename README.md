# HAHA — AI Comedy Lab

Human comedians hold the mic against an AI Straight Man. The Crowd juries
blind, results settle with real Merkle payouts (TipJar), and every
settled bit is hashed into The Joke Vault.

- **Prod (testnet 46630):** https://haha.asifaq.com
- **Chain:** Robinhood Chain — testnet `46630`, mainnet `4663` (prepared,
  see `docs/MAINNET-HANDOFF.md`)
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
- See `docs/CA-ONLY-BUDGET.md` for measured fork gas, current operator balance,
  optional USDG seed and usage-based service costs. No new mainnet broadcast is
  part of the current task.

## QA Wallet Bridge (End-to-End Testing without MetaMask)

CDP `initScript` injects EIP-6963 provider per navigation (lost on reload; `initScript` must be re-attached). Chain:
`eth_requestAccounts → wallet_switchEthereumChain(null) → eth_chainId → personal_sign`. Signatures via `sign-bridge.cjs` (stdin JSON; operator key from `.env.worker`, juror keys from temporary pool — never print/commit). ChainId answers `0xb626`.

## Contracts (Active Testnet Addresses)

| Contract | Address |
| --- | --- |
| TipJar | `0x03f26784cFE5808DC4A669bbB6D410d08765a675` |
| FeeSplitter | `0xC79D6Bc6955844cB396cF67a66eD7f084fA19C7d` |
| MicDrop | `0xCEc9922655BCfFD4cec6A6aA1b9e992C1dfa1d28` |
| USDG (mock) | `0x6b72879a2144049a10b176a827f1603bdb0b72ab` |
| HAHA temporary token | `0xe992e6fae3ecbd1f3fe2576064f81bf5db37a167` — mainnet `MockHAHA`, public mint; NOT the eventual Pons token and NOT for staking |

## RESTRICTIONS / FORBIDDEN

- No new mainnet suite broadcast was performed in this CA-only implementation. Read-only fork estimate: 11,102,916 gas / 0.000459882791822916 ETH at the sampled max fee; see `docs/CA-ONLY-BUDGET.md`. The existing `.env.mainnet` currently points hot and cold roles to the same address; `DeployMainnet` now rejects that configuration.
- Do NOT commit `.env*`, `next-env.d.ts`, or QA screenshots to repository root.
- Do NOT build Merkle trees manually for claims (use the server writer).
