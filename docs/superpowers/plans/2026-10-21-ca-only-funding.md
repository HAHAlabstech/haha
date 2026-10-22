# CA-only Funding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Owner requests inline execution, not another approval round.

**Goal:** Operate from a supplied token CA without launcher coordination or assumed creator-fee ownership, and publish a reproducible capital budget.

**Architecture:** Separate token identity, optional creator harvest, USDG receipt accounting and routed buyback. Persist verified funding independently of Producer activation; reserve batch royalties and consume receipts atomically with immutable epoch allocations. Real routing is structured and HOLD is an explicit valid state.

**Tech Stack:** Solidity 0.8.24, Foundry, viem, Node test runner, Prisma 6/PostgreSQL, Next.js 16.

## Global Constraints

- No new mainnet broadcast, no launcher communication, no arbitrary swap calldata.
- No external audit/legal/human-approval blockers; preserve user's concurrent changes.
- USDG 6 decimals; B2B 40/30/10/20, general rewards 80/20, existing 5% per-account cap and $1 dust rollover.
- Do not overwrite env secrets, production DB, hero or preloader. Keep funding scopes chain/gateway/TipJar-specific.

## Task 1: Chain isolation and claim verification

Files: `worker/lib/chain.js`, `worker/jobs/fiveMinuteOps.js`, `app/api/rewards/me/route.ts`, `tests/chain.test.cjs`.
Interface: `resolveChainConfig(env) -> {chainId,rpc,chainEnv}`; `walletClient()` refuses `WORKER_CHAIN_WRITES=off`; `assertChain(client)` rejects RPC mismatch.
- [x] RED: Node tests asserted mainnet/testnet/bad env, RPC mismatch and writes-off rejection; each failed before implementation.
- [x] GREEN: select matching RPC/chain, guard writes, scope tipjar/game reads by chain, remove epoch-label bypass of proof verification.
- [x] Verify chain Node tests, typecheck and mainnet fork simulation.

## Task 2: Explicit receipt funding and atomic settlement

Files: Prisma schema/migration; `worker/lib/funding.js`; `worker/lib/settlementFunding.js`; `worker/lib/rewards.js`; `worker/jobs/dailySettlement.js`; producer activation; snapshot exporter; funding receipt API/CLI; `ProducerGateway.sol`.
Interfaces: `decodeFundingReceipt(receipt, config)` yields canonical rows keyed by chain/tx/log; `importFundingReceipt(prisma, client, hash, config)` verifies chain/receipt/transfers and idempotently upserts; `allocateFunding(tx, epoch, config)` consumes unallocated scoped receipts atomically. Royalty-only rows without a manifest stay reserved.
- [x] RED: tests require event/transfer-backed amounts, reject failed/wrong/unbacked receipts, test chain scopes, duplicate wallet aggregation, royalties and retry; watched failures first.
- [x] GREEN: add chain/log-unique receipt ledger, `fundRewards(uint256)`, explicit receipt importer, snapshot contributor royalties and serializable/idempotent epoch allocation. Do not count raw balances or use RPC log scans.
- [x] Verify Node tests, Prisma validate/generate, migration and real PostgreSQL settlement integration against dedicated local `haha_ca_only_verify`, plus Foundry treasury deposit.

## Task 3: Token identity and structured buyback adapter

Files: `MicDrop.sol`, `V4BuybackAdapter.sol`, adapter interfaces, focused Foundry tests; token discovery worker/script.
Interfaces: adapter `swapExactInput(address token,uint256 amountIn,uint256 minOut,uint256 deadline,bytes route)` returns actual output; route is ABI-encoded pool path with at most two connected hops. MicDrop stores timelocked route and accepts only a nonzero ERC20 contract.
- [x] RED: tests caught EOA registration and old pool state following a token rotation; adapter tests cover route/output/deadline and scoped approvals.
- [x] GREEN: token registration is independent of launch economics; structured V4 2.1.1 adapter handles direct and native-intermediate routes, has nonzero minimum output and leaves unsupported route unset/HOLD. Read-only factory/CA inspector and Pons-phase monitor are added.
- [ ] Verify against a graduated **real HAHA Pons pool**. No real Pons HAHA CA/pool was supplied. The live CRIT reference is not HAHA liquidity, and MockHAHA is explicitly rejected for staking.

## Task 4: CA-only deployment preparation and budget

Files: deploy script, `.env.example`, read-only capital report script, `docs/MAINNET-HANDOFF.md`, budget document.
- [x] RED: preflight tests include hot/cold key-separation rejection; post-CA staking deploy guard identifies the exact current public-mint MockHAHA runtime hash.
- [x] GREEN: remove MicDrop/FeeSplitter construction cycle, deploy real adapter, keep creator harvest OFF, defer staking until actual Pons CA, and keep route unset/HOLD.
- [x] Measure updated archive-fork simulation and document separate gas/seed/buyback/operating-cost buckets in `docs/CA-ONLY-BUDGET.md`.

## Task 5: Final verification and reconciliation

- [x] Node tests **16/16**, isolated Postgres settlement test **1/1**, Prisma validation/generation, Next typecheck/build, Foundry **79/79**, mainnet preflight and fork-only simulation pass; `git diff --check` clean.
- [x] Review CA-only constraints, old testnet/TipJar scope, hot/cold mismatch, live temporary token identity, and `.env.mainnet` ignore rule.
- [x] Record actual gas measurement and budget; clearly separate optional USDG seed from customer-funded receipts.
- [x] Mainnet foundation suite + standalone fixed-supply HAHA + CrowdStaking deployed by the owner wallet; production app/worker are cut over and healthy. Standalone supply is held by the operator.
- [ ] Await actual Pons CA/pool before replacing MicDrop binding or enabling buyback. This is an on-chain asset/lifecycle dependency; no launcher communication is required. The temporary MockHAHA is not used by production.
