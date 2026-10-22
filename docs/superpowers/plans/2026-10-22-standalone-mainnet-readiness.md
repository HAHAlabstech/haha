# Standalone Mainnet Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make HAHA mainnet usable and truthful with the standalone token and deployed staking contract, without Pons dependencies or unverified market/reward claims.

**Architecture:** Keep on-chain contracts unchanged. Make worker standalone mode skip all Pons-only work, expose accurate read-only juror/stake state, update user-facing copy, and ship through the existing CI deployment pipeline. No pool, token transfer, reward seed, or other mainnet write is performed.

**Tech Stack:** Next.js 16.4.2 App Router, TypeScript/React, Node worker, viem, Prisma, Foundry, Node test runner, Docker/GitHub Actions.

## Global Constraints

- Mainnet chain ID is `4663`; standalone HAHA is `0xd2Da320EF90FB76809587C830A33a49512bA90D9`.
- CrowdStaking is `0xe861a2c5d2114A76779d91d416c750bE7D3f7d88` and its token is immutable.
- Pons factory/hook, creator fees, and MicDrop buyback are out of scope and disabled for standalone mode.
- Do not create a pool, send HAHA, or fund USDG; preserve the operator ETH as gas/operations reserve.
- Do not expose secrets or interpret unavailable price/reward data as zero-valued guarantees.
- Read the installed Next.js guide before editing App Router code; do not use legacy Next APIs.

---

### Task 1: Lock standalone worker behavior

**Files:**
- Modify: `worker/jobs/syncChain.js`
- Test: `tests/pons-launch.test.cjs` and a new `tests/standalone-sync.test.cjs`
- Modify: `.env.example`

**Interfaces:**
- `run(job)` remains the worker entry point.
- `PONS_LAUNCH_MODE=standalone` must return `{ productMode: "standalone", buybackReadiness: "HOLD: standalone token has no configured market route" }` and must not read a Pons factory or write MicDrop.

- [ ] Add a failing test that injects a public client/read recorder and asserts no Pons factory, MicDrop, or wallet-write calls in standalone mode.
- [ ] Run `node --test tests/standalone-sync.test.cjs`; confirm the missing standalone branch fails.
- [ ] Gate the Pons-specific block behind `PONS_LAUNCH_MODE=pons`; standalone mode reports token/mode/HOLD without network Pons calls.
- [ ] Add `PONS_LAUNCH_MODE=standalone` as the sample default and retain `CREATOR_FEE_MODE=off`.
- [ ] Run `node --test tests/standalone-sync.test.cjs tests/pons-launch.test.cjs`; confirm pass.

### Task 2: Make juror access and stake telemetry truthful

**Files:**
- Modify: `app/api/crowd/stake-check/route.ts`
- Modify: `components/app/views/CrowdView.tsx`
- Modify: `app/crowd/join/page.tsx`
- Test: add `tests/stake-check.test.cjs` using extracted pure response/eligibility helpers.

**Interfaces:**
- Keep existing response keys for compatibility.
- Add `juror_access_mode: "allowlist_calibration" | "unverified"`, `extra_bit_stake_wei`, and `stake_verified: boolean`.
- `onboarding_passed` remains the queue gate; `staked_enough` describes only the configured on-chain amount and must not be presented as required juror eligibility.

- [ ] Add tests for RPC success, RPC failure, onboarding pass/fail, and stake telemetry independent from eligibility.
- [ ] Run `node --test tests/stake-check.test.cjs`; confirm failures before implementation.
- [ ] Extract a pure formatter/response helper and make RPC failure explicit (`stake_verified=false`), without turning it into a market price or access approval.
- [ ] Update Crowd UI to say “Calibration + allowlist” for juror access and label any 10 HAHA value only as extra-bit stake, not `$25` or juror minimum.
- [ ] Update join flow to state the actual onboarding/access criteria; ensure no unsupported stake promise remains.
- [ ] Run stake-check unit tests and `npm run typecheck`.

### Task 3: Correct public product/reward claims

**Files:**
- Modify: `components/landing/LandingFaq.tsx`
- Modify: `components/landing/ProcessPipeline.tsx`
- Modify: `components/app/views/TipJarView.tsx`
- Modify: `app/vault/method/page.tsx`
- Modify: `app/api/tipjar/summary/route.ts`
- Test: `tests/product-copy.test.cjs`

**Interfaces:**
- No endpoint shape changes required except removing Pons-only exemption claims from summary notes.
- User copy must describe verified USDG funding/settlement and current standalone token status.

- [ ] Add source assertions that fail on claims of automatic HAHA buyback, creator-fee entitlement, guaranteed daily payout, or mandatory juror token stake.
- [ ] Run `node --test tests/product-copy.test.cjs`; confirm stale claims are detected.
- [ ] Replace them with accurate copy: reward depends on funded USDG and activated root; standalone HAHA has no price promise; juror eligibility follows onboarding/allowlist; buyback is not active.
- [ ] Run copy tests and `npm run typecheck`.

### Task 4: Verify build and non-production test baseline

**Files:**
- No app files unless verification reveals a root-cause issue.

- [ ] Run `node --test tests/chain.test.cjs tests/funding.test.cjs tests/micdrop.test.cjs tests/pons-launch.test.cjs tests/rewards.test.cjs tests/product-copy.test.cjs tests/stake-check.test.cjs tests/standalone-sync.test.cjs`.
- [ ] Run `wsl -d Ubuntu-22.04 -- bash -lc 'cd /mnt/d/Project/wealthypeople/HAHA/contracts && ~/.foundry/bin/forge test --summary'`.
- [ ] Run `npm run typecheck` and `npm run build`.
- [ ] Do not run `tests/settlement.integration.cjs` against `/haha`; it intentionally aborts unless `DATABASE_URL` ends in `_ca_only_verify`. Run it only if that isolated DB is explicitly configured.

### Task 5: Production cutover and verification

**Files:**
- Modify remote config keys only: `/srv/haha/.env`, `/srv/haha/.env.app`, `/srv/haha/.env.worker`.
- Modify docs: `README.md`, `docs/CA-ONLY-OPERATIONS.md`, `docs/CA-ONLY-BUDGET.md`, `docs/MAINNET-HANDOFF.md`.

- [ ] Set `PONS_LAUNCH_MODE=standalone`, keep creator-fee mode off, and ensure app token/staking addresses match the verified mainnet contracts; remove Pons-only worker triggers without touching secrets.
- [ ] Commit/push code; wait for CI build+deploy success.
- [ ] Verify `/api/health` 200 and `/api/config` chain ID/addresses.
- [ ] Verify app and worker containers are healthy and recent sync logs contain no Pons error/alert and no chain write.
- [ ] Read the mainnet ETH balance and token/TipJar state after deployment; report exact results. Do not broadcast market, reward, or token-distribution transactions.
- [ ] Commit final documentation/status only after live verification.
