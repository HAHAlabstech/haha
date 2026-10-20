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
   deliberately stopped at the pre-flight gate because the deploy target
   escrow did not expose the `claimToken`/`claim()` sweep surface
   (`contracts/script/DeployMainnet.s.sol` check #2). Do NOT weaken the
   gate to force the deploy; swap/patch the escrow deployment instead.
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
2. Run the read-only preflight gate against 4663 RPC
   (`forge script DeployMainnet --fork-url $RPC_URL_MAINNET`).
   It checks: USDG decimals == 6, escrow claim surface (`claimToken`,
   `claim`), router/poolManager/hook/factory code presence.
   **ABPORT here** = stop, fix the target contracts, re-run. Never bypass.
3. Broadcast the suite (TipJar, FeeSplitter, MicDrop, CrowdStaking,
   VaultRegistry, ProducerGateway, HAHA token setup) with the deployer key.
4. Grant roles: TipJar `PROPOSER_ROLE` → hot operator;
   `GUARDIAN_ROLE` → cold admin. FeeSplitter harvest executor per plan §2.2.
5. Record every address into the VPS `.env.worker`/`.env.app` file under the
   §10 `.env.example` block names. Do not commit real env values.

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
2. **Escrow sweep-surface mismatch (OPEN — blocking gate).** The deployed
   testnet-target escrow lacked the `claimToken` surface; preflight gate
   aborts by design. Resolve by deploying the corrected escrow before
   the mainnet preflight re-run.
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
