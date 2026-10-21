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
   cannot finalize roots). The cold key stays OFFLINE (veto + params).

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
4. Real broadcast (only after audit/legal/sanctions/geo + 72h gate):
   same command **plus `--broadcast`**, with a funded deployer key. This
   deploys TipJar, FeeSplitter, MicDrop placeholder, real MicDrop,
   VaultRegistry, ProducerGateway, and optional CrowdStaking (only when
   `HAHA_TOKEN_ADDRESS` is already live).
5. Phase 2, cold-admin actions after the 48h timelock (run from the offline
   cold key; the hot operator cannot call `DEFAULT_ADMIN_ROLE` setters):
   ```bash
   # Rotate the temporary MicDrop sink to the real MicDrop
   cast send "$FEE_SPLITTER" "proposeSetMicDrop(address)" "$MICDROP" --private-key "$COLD_PK"
   # wait 48h, then:
   cast send "$FEE_SPLITTER" "confirmSetMicDrop()" --private-key "$COLD_PK"

   # After the Pons $HAHA launch tx (launchTxHash is bytes32, feeRecipient = FeeSplitter)
   cast send "$MICDROP" "proposeHahaToken(address,bytes32,address,address,uint256,bool,uint256)" \
     "$HAHA_TOKEN" "$PONS_LAUNCH_TX_HASH" "$FEE_SPLITTER" "$USDG" 200 false 0 \
     --private-key "$COLD_PK"
   # wait 48h, then:
   cast send "$MICDROP" "confirmHahaToken()" --private-key "$COLD_PK"

   # Bind the real Pons curve/hook/pool for sweeps
   cast send "$FEE_SPLITTER" "proposeSetLaunchRefs(address,address,bytes32)" \
     "$PONS_CURVE" "$PONS_HOOK" "$PONS_POOL_ID" --private-key "$COLD_PK"
   # wait 48h, then:
   cast send "$FEE_SPLITTER" "confirmSetLaunchRefs()" --private-key "$COLD_PK"
   ```
   Keep `COLD_PK` offline; never paste it into `.env` or CI. Do not open
   creator-fee inflow/public launch until the MicDrop rotation is confirmed —
   during the 48h window the 30% split sits in the temporary MicDrop sink.
6. Record every address into the VPS `.env.worker`/`.env.app` file under the
   §10 `.env.example` block names. Do not commit real env values. Keep
   `WORKER_CHAIN_WRITES=off` until roles are verified.

### 2.1 Code verification (21 Oct 2026)

- `forge test` in `contracts/`: **68 passed, 0 failed**.
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
- Foundry's script guard rejects `address(this)` in a script; the preflight now
  probes the escrow with the cold admin address. This was the second blocker
  behind the earlier `staticcall`/RPC failures, and is fixed.
- The remaining gate is external launch authorization, not code or RPC.
  Re-run the same command in the launch window with the final RPC and confirm
  the fork block; only then add `--broadcast`.

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
