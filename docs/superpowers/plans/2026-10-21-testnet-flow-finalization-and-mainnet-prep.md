# Testnet Flow Finalization + Mainnet Prep — Implementation Plan

> **For agentic workers:** Use `executing-plans` while implementing. Track each task to completion and verify with the commands listed. No mainnet broadcast.

**Goal:** Close every P0/P1/P2 finding from `docs/audits/2026-10-21-testnet-user-flow.md`, then ship a complete, non-broadcast mainnet deployment script + runbook.

**Architecture:** Keep the existing visual system and product rules. Make role, authentication, state, and next-action explicit per screen. Persist only local drafts; never persist secrets. Mainnet remains env-gated and dry-run by default.

**Tech Stack:** Next.js 16 (App Router, client components), Prisma/Postgres, viem, BullMQ worker, Solidity 0.8.24 + Foundry.

> **Execution status (21 Oct 2026):** Tasks 1–6 are implemented and deployed to
> testnet; Task 7's deploy code/runbook is complete, unit-tested, and passed a
> full 4663 fork simulation (no broadcast); Task 8 is complete with a real
> on-chain claim, a live juror ballot/quota check, and the evidence in
> `docs/audits/2026-10-21-testnet-user-flow.md` §6. The unchecked boxes below
> are the original plan, not current status.

## Global Constraints

- Target runtime for all tests: `https://haha.asifaq.com`, `CHAIN_ENV=testnet`, chain `46630`.
- No mainnet transaction, no `--broadcast`, no private-key use in this task.
- Do not redesign hero/preloader. Preserve obsidian/amber design.
- Do not change reward math, contract economics, settlement schedule, or product rules.
- Author-only actions must be enforced server-side and hidden for spectators.
- Missing credentials must never authorize a wallet-bound mutation.
- Empty state, loading, error, and not-found are distinct states.
- All money labels must state whether they are lifetime, already claimed, or currently claimable.
- Mainnet script must abort unless chain id is 4663 and required addresses/code exist.

---

### Task 1: Strict wallet session (P0 AUTH-01)

**Files:**
- Modify: `lib/server.ts:114-144`
- Verify: `docs/audits/2026-10-21-testnet-user-flow.md` AUTH-01

**Steps:**
- [ ] Remove the fallback that accepts a caller-supplied wallet when no cookie/header token is present.
- [ ] Keep accepting a signed `haha_session` cookie, `Authorization: Bearer`, or `x-haha-session`.
- [ ] Return `401 active SIWE session required — sign in first` when no token is supplied.
- [ ] Confirm every mutation route still calls `requireWalletSession`.
- [ ] Verify with `npx tsc --noEmit`.

### Task 2: Bit lifecycle + author-only UI (P1 FLOW-02/03/04, NOTFOUND-01, ROUND-01)

**Files:**
- Modify: `app/bit/[id]/page.tsx`
- Modify: `app/api/bits/[id]/route.ts`
- Modify: `app/api/bits/[id]/verdict/route.ts`
- Modify: `app/api/u/[handle]/route.ts`
- Modify: `app/u/[handle]/page.tsx`
- Modify: `components/WalletMenu.tsx`

**Steps:**
- [ ] `/api/bits/[id]` counts only the active round (`retrial_round`), and returns `has_reveal`.
- [ ] Ensure `verdict` accepts only `answered` with a stored `ai_answer`; require a non-empty explanation for `missed_it`.
- [ ] Bit page keeps polling until `ai_answer` exists; `answered` without an answer is still processing.
- [ ] Distinguish 404 from 503 and render a recoverable not-found/error screen.
- [ ] Use connected account to compute `isAuthor`; show Got it/Missed it only to the author and only when `ai_answer` exists.
- [ ] For `has_reveal && !comedian_reveal`, show “Reveal locked. Waiting for the Crowd.”, not “awaiting reveal”.
- [ ] For self-conceded `bombed` with no Outcome, explain that no Crowd vote occurred and hide the appeal panel.
- [ ] Show appeal for `bombed`/`heckled_off` with an Outcome, round < 2.
- [ ] Render rejected prescreen reason; show crisis support for `crisis_support`.
- [ ] Add `My bits & profile` to WalletMenu.
- [ ] For the owner, `/api/u/[handle]` includes pending/rejected bits (with the owner session); public profile remains public-only.
- [ ] Verify with `npx tsc --noEmit` and browser flows against a dedicated testnet wallet.

### Task 3: Stage draft persistence (P1 FLOW-01)

**Files:**
- Modify: `components/app/views/StageView.tsx`

**Steps:**
- [ ] Persist `{category, stageKind, scenario, question}` per wallet in `localStorage`.
- [ ] Restore on mount after wallet state is known; do not leak one wallet’s draft to another.
- [ ] Show `Draft saved locally` and a `Discard draft` action when content exists.
- [ ] Clear the draft after successful submit.
- [ ] Fix the quorum copy to `5 → 7 blind human judges`.
- [ ] Verify draft survives Stage → Crowd → Stage and a reload.

### Task 4: Crowd queue + calibration states (P1 QUIZ-01/02/03, ERROR-01)

**Files:**
- Modify: `components/app/views/CrowdView.tsx`
- Modify: `app/crowd/join/page.tsx`
- Modify: `app/api/crowd/onboarding/route.ts`
- Modify: `app/api/crowd/[assignmentId]/route.ts`

**Steps:**
- [ ] `/api/crowd/onboarding` GET returns `authenticated` separately from `status`.
- [ ] Join page: if connected but no valid session, show sign-in recovery before the quiz; after sign-in re-check saved status.
- [ ] After a preview pass, only a save action is primary; `Enter Crowd` appears only after `savedServer`.
- [ ] Keep answers on save failure; show a visible `role="alert"` error near Submit; disable while saving.
- [ ] CrowdView loads stake-check first; does not request ballots for uncalibrated wallets.
- [ ] Separate `loading`, `empty` (404), `error` (non-404), and `locked` (not calibrated).
- [ ] On 503 show `Couldn't load the jury queue` + Retry, never “no cases”.
- [ ] Explain gate mode in user terms (`Calibration + allowlist`, `Staked $HAHA`).
- [ ] Server: reject votes from uncalibrated jurors, self-votes, and over-quota jurors.

### Task 5: Tip Jar money states (P1 CLAIM-01)

**Files:**
- Modify: `components/app/views/TipJarView.tsx`
- Modify: `app/api/rewards/me/route.ts`

**Steps:**
- [ ] Distinguish `loading`, `empty` (404), `error` (non-404), and `ready`.
- [ ] Show lifetime allocation, already claimed, and available-to-claim separately.
- [ ] Require an active provider; if account is remembered without a provider, show `Reconnect wallet to verify` instead of Claim.
- [ ] Disable Claim until on-chain `cumulativeClaimed` is known and `available > 0`.
- [ ] Wait for the receipt; on success refresh `cumulativeClaimed` + rewards; on revert show the reason; on timeout show pending with explorer link.
- [ ] Return `proofEpoch`, `activeEpoch`, and pending-root status from the API; show pending activation explicitly.
- [ ] Fix split copy: creator fees 70/30; producer revenue 30% general + 10% royalty.
- [ ] Verify no-provider, no-reward, 503, fully-claimed, and pending-activation states.

### Task 6: Mobile navigation + buyer plan preservation + Vault truthfulness (P1/P2)

**Files:**
- Modify: `components/app/AppHeader.tsx`
- Modify: `components/app/views/VaultView.tsx`
- Modify: `app/producers/page.tsx`

**Steps:**
- [ ] Mobile header: two-row layout, wallet control never clipped, workspace tabs have accessible names + `aria-current`.
- [ ] Vault checkout links carry `?plan=<id>`; Producers validates and selects it.
- [ ] Remove the invented eight-week chart; show real snapshots or an honest empty state.
- [ ] Separate estimated replacement value, actual licensing revenue, and price list.
- [ ] Fix quorum copy to `5 → 7` and the B2B split hint to `40/30/10/20`.
- [ ] Verify at 390px and 1440px.

### Task 7: Mainnet deploy code + runbook (no broadcast)

**Files:**
- Modify: `contracts/script/DeployMainnet.s.sol`
- Modify: `.env.example`
- Modify: `docs/MAINNET-HANDOFF.md`
- Modify: `README.md` if it still says the gate is open

**Steps:**
- [ ] Replace the invalid `staticcall` of state-changing `claimToken`/`claim` with view-surface checks + bytecode selector presence checks.
- [ ] Abort unless `block.chainid == 4663`, USDG has code + 6 decimals, and every required external address has code.
- [ ] Deploy the suite in a dry-run by default: TipJar, MicDrop placeholder, FeeSplitter, real MicDrop, ProducerGateway, VaultRegistry, optional CrowdStaking after `$HAHA` exists.
- [ ] Use 24h TipJar root delay / 48h timelocks on mainnet.
- [ ] Gate actual broadcast behind an explicit `MAINNET_DEPLOY_CONFIRM` phrase and `--broadcast`.
- [ ] Document phase-2 actions: FeeSplitter MicDrop rotation, sweep refs, `$HAHA` token proposal, role grants.
- [ ] Add the Pons addresses/selectors to `.env.example`.
- [ ] Verify with `forge build`/`forge test` if Foundry is available (WSL), otherwise `solc`/static review and document the gap.

### Task 8: Full verification

- [ ] `npx tsc --noEmit`.
- [ ] `npm run build` (or document the Next build if infra-bound).
- [ ] Browser run: anonymous Stage, draft persistence, mobile 390px, missing bit, rejected bit state (if a safe fixture exists).
- [ ] Browser run with dedicated testnet QA wallet: submit → AI answer → spectator cannot act → author reveal → locked state → profile recovery → Crowd calibration save gate → queue error injection → no-provider claim state.
- [ ] No mainnet RPC write; confirm `/api/config` remains testnet 46630.
- [ ] Record evidence + remaining gaps in the audit/runbook.
- [ ] Commit and push owned changes.
