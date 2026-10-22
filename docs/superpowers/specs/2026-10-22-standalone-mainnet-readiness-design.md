# Standalone HAHA Mainnet Readiness — Design

## Goal

Make the existing HAHA web app honest and usable on Robinhood Chain mainnet with the already-deployed fixed-supply token and CrowdStaking, without relying on Pons, creator fees, or an unverified market.

## User and product scope

- HAHA standalone token is the only configured product token: `0xd2Da320EF90FB76809587C830A33a49512bA90D9`.
- CrowdStaking remains bound to that token: `0xe861a2c5d2114A76779d91d416c750bE7D3f7d88`.
- Pons, creator-fee harvesting, and MicDrop buyback are out of this release. No Pons factory polling, fees, or route assumptions are required for the app to work.
- Juror access is based on a signed-in wallet and the calibration quiz. The current app does not enforce on-chain juror stake in `/api/crowd/next`; the API/UI must not imply that a 10 HAHA extra-bit stake is a juror threshold or USD valuation.
- Token balances and extra-bit stake are displayed in HAHA units only. No USD valuation is shown without an independent price source.
- USDG rewards are claimable only after verified funding and settlement. Empty funding state is shown as “no rewards funded yet,” not as a failed or promised payout.
- Do not create a pool or market with the current dust-level ETH balance. The latest verified operator balance is `0.003562392788522 ETH`; preserve it for gas/operations. Trading is explicitly unavailable until a separate market/liquidity decision is supported by verified venue and adequate liquidity.

## Architecture

1. `sync-chain` gains a strict standalone mode that reports token identity and buyback HOLD without calling Pons factory/hook contracts or producing false Pons alerts.
2. `/api/crowd/stake-check` remains read-only and preserves its response compatibility while separating juror eligibility from optional on-chain stake telemetry.
3. Crowd and marketing UI copy describes the actual allowlist/calibration flow, token utility, and unfunded reward state; it removes automatic buyback and guaranteed-payout claims.
4. Existing API/config and worker separation remain: public contract addresses only, no wallet keys or server secrets in client responses. No new contract or mainnet write is needed.
5. Production configuration uses the standalone mode and standalone token/staking addresses. Deployment is via normal CI image rollout, followed by app/worker health and runtime-config verification.

## User-visible behavior

- Connected users see the configured chain and token addresses, and clear wallet-signature/transaction errors.
- Juror queue eligibility is accurately labeled: allowlist plus calibration; staking does not silently gate or imply USD value.
- Extra-bit token locking, where used, is labeled as a fixed HAHA amount and is not represented as a juror minimum.
- Tip Jar and reward pages show actual funded/claimable values and state that no payout is available when the funded pool/root is empty.
- Market/buy actions remain disabled with a plain explanation until a verified pool exists. No liquidity is manufactured from gas reserves.

## Failure handling and security

- RPC failures are surfaced as “could not verify” and never converted into a zero-price, zero-reward, or market-ready assertion.
- Worker standalone mode is fail-closed: no writes to MicDrop and no Pons calls; creator-fee mode remains off.
- No private key is read by app or public market-status routes. Mainnet wallet use is limited to read-only verification in this release.
- Production env updates preserve unrelated secrets and only change named non-secret flags/addresses.

## Testing and acceptance

- Unit tests prove standalone worker mode does not call Pons and leaves buyback HOLD.
- API tests prove `stake-check` distinguishes calibration eligibility from token stake and reports units/verification status.
- UI copy tests or deterministic source checks prevent stale guaranteed-reward, mandatory-juror-stake, and automatic-buyback claims.
- Node unit suite (excluding the guarded real-Postgres test when no isolated `_ca_only_verify` DB is configured), Foundry suite, TypeScript check, and production build pass.
- CI deploys the resulting image; `/api/health` returns 200; `/api/config` returns chain 4663 and the two deployed addresses; worker sync completes without Pons alerts or mainnet writes.
- No pool or reward seed transaction is part of this release.
