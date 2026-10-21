# HAHA — Mainnet Handoff Runbook (4663 Robinhood Chain)

Status: **PREPARED — NOT DEPLOYED** (user instruction: no mainnet broadcast).
This runbook is the complete go-live checklist. It distills the testnet
runtime findings (sesi 19–21 Okt 2026, plan §8.1) into launch steps.

---

## 0. Hard rules (non-negligible)

1. **Never mix testnet mock addresses into mainnet env values.** Mocks
   redirect real fee flows to worthless tokens. `CHAIN_ENV=mainnet` disables
   the `TESTNET_MOCK_*` fallbacks in `lib/haha-contracts.ts` — every mainnet
   address MUST be explicit.
2. **Preflight gate aborts on mismatch — let it abort.** Test 8 (19 Okt)
   stopped at the gate with `PreflightFailed("escrow.claimToken")`; the
   cause was the gate's invalid `staticcall` of a state-changing function,
   now fixed. The gate still aborts if the real escrow lacks the expected
   selectors/views. Do NOT weaken it to force the deploy; resolve the
   upstream surface instead.
3. The hot operator key is ROOT/PROPOSER-capped (slash-escrow limited,
   cannot bypass the root veto delay). Root activation is permissionless
   after the ETA, including by the hot keeper. The cold key stays OFFLINE
   (veto + params).

### 0.1 Decision precedence and remaining plan gates

**Latest owner override:** external audit/legal and other human-approval work
are excluded from this task and must not be presented as blockers. This is a
scope decision, not a claim of audit completion or legal compliance. The owner
receives only the token CA; no launcher coordination, launch-form control, or
fee-recipient reassignment can be assumed. The old coordinated USDG/200bps
launch workflow below is historical and must not be executed as the CA-only
workflow; its replacement architecture is under review. Mainnet broadcast
remains prohibited.

Use `HAHA IMPLEMENTATION PLAN.md` §3.1, §4 items 9/11 (D1–D7), and
Appendix A over superseded choices in `haha.md`. Do not add generic launch
requirements that undo the owner's accepted deviations.

- **D1:** **single key** (owner decision 2026-10-22, supersedes the earlier
  two-key hot/cold note): the operator key is deployer, treasury and admin.
  The deploy script **warns** on equal hot/cold instead of rejecting; a zero
  address still fails. The plan accepts no external HAHA audit in the 72-hour
  testnet window. This is time-scoped, not evidence of a permanent waiver;
  §4 item 9 explicitly names the final **Pons V2 audit**. Do not conflate that
  upstream audit with a newly imposed independent HAHA audit requirement.
- **D2/D4:** MiMo playbook + DPO export and gated automatic season releases;
  no mandatory LoRA deployment or manual season approval.
- **D3:** autonomous seven-juror retrial and automated takedown/GDPR
  processing (24h/30d), not a mandatory human moderation panel.
- **D7:** user-paid gas, $1 dust rollover, configurable $25 stake; no mandatory
  paymaster/AA integration. Xiaomi UA was explicitly waived by the owner.
- CA-only override: receive the actual token CA and discover its on-chain
  factory record; do not assume pair, tax, fee recipient, graduation or pool.
  The temporary mainnet `MockHAHA` is publicly mintable and is excluded from
  CrowdStaking/mainnet product configuration.

Evidence reconciliation (21 Oct 2026; not a launch approval):

| Plan gate | Evidence / actual boundary |
| --- | --- |
| 50 Plants + 10 onboarding | Read-only production DB count: **51** plant-bank bits. Live onboarding GET: **200**, **10** items. This verifies availability, not every autonomous promotion path. |
| Kill-switch | Root veto and `WORKER_CHAIN_WRITES` are partial controls, not proof of a complete application kill-switch. End-to-end enforcement/drill remains unverified. |
| Takedown/GDPR 24h/30d | Report route stores an `open` row. No report-processing or erasure job was found in the registered worker schedules/handlers. This is a technical implementation gap, not just a human approval. |
| Hourly PostgreSQL dump to R2, 30-day retention, VPS snapshot, restore + replay | `scripts/backup-restore-drill.mjs` tests synthetic Merkle/crypto/reward invariants only; it does not dump or restore PostgreSQL, fetch a real R2 backup, or restore a VPS snapshot. No application-backup entry was identified in the inspected user/root crontabs or backup-named systemd timers; other host/provider mechanisms remain unverified. A real restore drill is still required. |
| Legal/sanctions/geo | Excluded by the latest owner instruction; not a blocker for this task. No compliance conclusion is made. |
| Manual invoice/KYC | Human-dependent work excluded from this task; checkout success is not being relabeled as KYC completion. |
| External audits, including Pons V2 | Excluded by the latest owner instruction. Technical ABI/runtime verification remains in scope; it is not an external audit. |

Reconciliation checklist:
- [x] Re-read brief, accepted deviations, mandatory gates, and §8.5 evidence.
- [x] Verify plant-bank count and ten-item onboarding availability read-only.
- [x] Correct the claim that all remaining gates are external/human-only.
- [ ] Close technical kill-switch, takedown/GDPR, and real backup/restore gaps.
- [x] Record the owner's exclusion of external audit/legal/human-approval work.
- [ ] Approve and implement the CA-only architecture; do not assume creator-fee entitlement.

## 1. Environment deltas (testnet → mainnet)

| Var | Testnet (current) | Mainnet target |
| --- | --- | --- |
| `CHAIN_ENV` | `testnet` | `mainnet` |
| Chain id (auto) | 46630 | 4663 |
| RPC `RPC_URL_*` | robinhood-sepolia-rpc.publicnode.com | robinhood-rpc.publicnode.com |
| `GUARDIAN_DELAY_*` | 10 min (testnet convenience) | 24 h (`GUARDIAN_DELAY_HOURS=24`) |
| `WORKER_CHAIN_WRITES` | `on` | `on` (only after §3 roles verified) |
| Contract suite env | testnet mocks | §2 suite addresses |

Everything else (DB/Redis/R2/MiMo/Turnstile) is environment-agnostic and
unchanged. `/api/config` already resolves chain + contracts per env.
`CI pipeline haha-ci-deploy` builds a single image valid for both chains —
no CI change needed for a chain flip.

## 2. Deploy sequence (contracts suite on 4663)

Sequence lives in `contracts/script/DeployMainnet.s.sol`:

1. `forge build` + `forge test` green at `contracts/`.
2. Run the dry-run (NO broadcast) against 4663 RPC:
   `forge script DeployMainnet --fork-url $RPC_URL_MAINNET`.
   The gate checks chain id 4663, USDG decimals == 6, required code, the
   live escrow **claim ledger** (`balanceOf`, `balanceOfToken`), and the
   presence of the `claimToken(address)` + `claim()` selectors in the escrow
   dispatcher. The live Pons V2 escrow deliberately has **no** pending-fee
   views; FeeSplitter sweeps the curve/hook, then quotes `balanceOfToken`.
   It deliberately does not `staticcall` a state-changing claim function.
   **ABORT here** = inspect the target escrow/address; never bypass.
3. Deploy simulation (still NO chain write):
   `MAINNET_DEPLOY_CONFIRM=DEPLOY_HAHA_MAINNET_4663 forge script DeployMainnet --fork-url $RPC_URL_MAINNET`
   Read the printed addresses and diff them against the VPS env plan.
4. No token launch is run by HAHA. The launcher supplies only a CA. The
   optional `FeeSplitter` harvest remains OFF unless on-chain recipient
   entitlement is actually observed. B2B/treasury USDG receipts are the reward
   source; see `docs/CA-ONLY-BUDGET.md`.
 5. After the real Pons CA is received, run `DeployCrowdStakingMainnet.s.sol`
   separately. It refuses the observed temporary public-mint MockHAHA runtime
   hash. Never bind staking to that temporary token.
6. Phase 2, cold-admin actions after the 48h timelock (run from an address
   distinct from the hot operator; the current `.env.mainnet` violates this
   separation and deploy simulation now rejects it):
   ```bash
    # Bind the CA only. No creator fee/tax/pair assumptions.
    cast send "$MICDROP" "proposeHahaToken(address)" "$ACTUAL_PONS_CA" --private-key "$COLD_PK"
   # wait 48h, then:
   cast send "$MICDROP" "confirmHahaToken()" --private-key "$COLD_PK"

    # Optional only if actual creator-fee entitlement is verified for HAHA.
   cast send "$FEE_SPLITTER" "proposeSetLaunchRefs(address,address,bytes32)" \
     "$PONS_CURVE" "$PONS_HOOK" "$PONS_POOL_ID" --private-key "$COLD_PK"
   # wait 48h, then:
    cast send "$FEE_SPLITTER" "confirmSetLaunchRefs()" --private-key "$COLD_PK"

    # Only after full graduation, exact pool keys and live quotes have been
    # read from the actual Pons CA, timelock the route; otherwise HOLD remains.
    cast send "$MICDROP" "proposeBuybackRoute(bytes)" "$ENCODED_POOL_KEYS" --private-key "$COLD_PK"
    # wait 48h, then:
    cast send "$MICDROP" "confirmBuybackRoute()" --private-key "$COLD_PK"
   ```
    Keep `COLD_PK` separate from hot and never paste it into CI. The adapter
    route and reserve remain unset/HOLD until a graduated pool key, fresh quote,
    and safe native/USDD route are available from on-chain state. Creator-fee
    reference changes are optional, not launch blockers.
7. Record every address into the VPS `.env.worker`/`.env.app` file under the
   §10 `.env.example` block names. Do not commit real env values. Keep
   `WORKER_CHAIN_WRITES=off` until roles are verified.

### 2.1 Code and cost verification (21 Oct 2026)

- Latest CA-only `forge test` in `contracts/`: **79 passed, 0 failed**.
- `DeployMainnet.t.sol` proves:
  - the old `staticcall` of `claimToken(address)` reverts by design (the Test 8 false negative);
  - the selector scan finds the real state-changing claim surface;
  - `_preflight()` passes on a mock chain id `4663` with 6-decimal USDG and the
    live-shaped claim ledger;
  - `_preflight()` aborts on the wrong chain id.
- `FeeSplitter.t.sol` includes a `LiveShapeEscrow` regression with **no**
  pending-fee views, proving the splitter only relies on
  `balanceOfToken`/`claimToken` (the real Pons V2 surface).
- `scripts/preflight-mainnet.mjs` ran **read-only against real 4663**:
  chain id, USDG 6dp, all candidate code, `claim`/`claimToken` selectors, and
  the `balanceOfToken(address,address)` ledger call all passed.
- The script **cannot broadcast** without both `--broadcast` and
  `MAINNET_DEPLOY_CONFIRM=DEPLOY_HAHA_MAINNET_4663`. No mainnet transaction was
  signed or sent in this pass.
- Full **4663 fork simulation passed** via an Alchemy archive endpoint at block
  94313447: preflight exit 0, all deploy constructors wired, estimated
  9,906,008 gas / 0.000396 ETH, **no `--broadcast`**. The deployed addresses in
  that run are fork-local simulations, not live contracts.
- Updated CA-only foundation simulation at block 94418437: **11,101,298 gas**,
  estimated max fee **0.041492001 gwei**, total **0.000460615067717298 ETH**.
  It deploys TipJar, V4BuybackAdapter, MicDrop, FeeSplitter, VaultRegistry and
  ProducerGateway. CrowdStaking is intentionally deferred until the actual Pons
  CA is supplied. The simulation used a dummy, distinct cold address and did
  not broadcast.
- Live operator balance at block 94396638 was **0.00198809997036 ETH**; account
  nonce 1. Owner decision (2026-10-22): single key — hot and cold are the same
  address by intent. The script **warns** on equal hot/cold (no longer
  rejects); see the single-wallet budget in `docs/CA-ONLY-BUDGET.md`.
- Foundry's script guard rejects `address(this)` in a script; the preflight now
  probes the escrow with the cold admin address. This was the second blocker
  behind the earlier `staticcall`/RPC failures, and is fixed.
- Passing this deploy simulation does not close the technical/operational
  plan gaps in §0.1. Re-run in the launch window with the final RPC and fork
  block; add `--broadcast` only after those gates and explicit authorization.

## 3. Worker bring-up

1. Set `CHAIN_ENV=mainnet`, `RPC_URL_MAINNET`, suite addresses.
2. Keep `WORKER_CHAIN_WRITES=off` for the first start; verify:
   - healthcheck + `/api/config` shows `chainEnv: "mainnet"`, `chainId: 4663`,
   - worker boots, queues registered, daily-settlement job paused.
3. Flip `WORKER_CHAIN_WRITES=on` only after:
   - an on-chain balance grant for the escrow/TipJar fee path exists,
   - operator gas alert threshold `OPERATOR_MIN_ETH_ALERT` set,
   - the TipJar keeper path (see §5 lessons) is logged healthy on the
     first five-minute tick.

## 4. Post-launch verification (first 24 h)

- `/api/health` → `{ ok: true }`, `/api/config` chainEnv/chainId correct.
- First daily settlement run: `CronJobRun` rows `daily-settlement:*`
  all `done` — `propose_root` MUST record a tx hash on the new epoch row.
- Root activated (veto window 600s on testnet; mainnet target re-check
  the `rootDelay` config under the 24 h guardian policy): active
  `merkleRoot` matches the newest DB `Epoch.merkle_root`; `pendingRoot == 0`.
- A real claim E2E: TipJar UI → EIP-712 sign → `eth_sendTransaction`
  → TipJar.claim() success receipt → `cumulativeClaimed(account)` > 0.
- MicDrop buy path + ProducerGateway purchase ($2500e6) smoke-checked
  with small amounts before opening to the public.

## 5. Lessons baked into the codebase (21 Okt sesi testnet findings)

1. **TipJar root epoch desync (FIXED 21 Okt).** The midnight settlement
   proposed `epoch = DB latest + 1` while the chain had already advanced
   (`EpochNotIncreasing` revert → root never published → `InvalidProof`
   on every claim attempt). Fixes now live:
   - `worker/jobs/dailySettlement.js` — propose epoch is derived from the
     CHAIN-authoritative value (`currentEpoch`): `target = max(chainEpoch, dbEpoch) + 1`.
   - `worker/jobs/fiveMinuteOps.js` — new TipJar keeper activates pending
     roots after the veto delay (nobody else activates otherwise).
   Mainnet must deploy WITH these fixes (they are in the image).
2. **Escrow claim-surface gate (FIXED false negative; upstream still must
   match).** Test 8 aborted on `escrow.claimToken` because the gate used
   `staticcall` on the state-changing `claimToken(address)` / `claim()`.
   The EVM necessarily reverts such a call with
   `StateChangeDuringStaticCall`, so the test could not distinguish
   “function missing” from “function exists and writes”. The gate now uses
   view-only staticcalls plus a dispatcher selector scan. If the selector
   scan still fails, the target escrow genuinely does not expose the assumed
   ABI — stop and resolve the upstream contract; do not weaken the gate.
3. **Browser-wallet paths are chain-aware**: `lib/wallets.ts`
   `chainAddParams` already maps 4663 via `robinhoodMainnet`; SIWE verify
   does not pin chainId (domain-bound only) — safe across flips.
4. **Keep the reward leaf double-hash** identical on both sides
   (`keccak256(bytes.concat(keccak256(abi.encode(account, cumulativeMicro))))`,
   TipJar.sol leafHash); settlement trees + `/api/rewards/me` proofs must
   always be generated by the shipped `worker/lib/merkle.js` — never
   hand-build a tree.

## 6. Rollback / incident

- CHAIN_ENV back to `testnet` requires a full compose redeploy (env baked);
  treated as an incident, never routine.
- If a root proposal looks wrong: cold wallet `vetoRoot()` within the
  veto window; `rootDelay` blocks emergency reshuffles after activation.
- Worker stuck jobs: `CronJobRun` table inspection (`status`, `last_error`)
  is the first diagnostic — five-minute ticks recover stage drift by design.
