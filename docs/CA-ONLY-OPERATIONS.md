# CA-only operating flow

The launcher is not contacted. The project currently runs with a standalone
fixed-supply HAHA token (1B initial, held by the operator) and its own
CrowdStaking deployment. `CREATOR_FEE_MODE=off`; fee entitlement is never
inferred from a token address. `PONS_LAUNCH_MODE=standalone` is set until the
external launcher supplies the later Pons CA.

## When the actual Pons CA is delivered

1. Read-only inspect on Robinhood mainnet:

   ```bash
   node scripts/inspect-pons-ca.mjs --ca=0x<actual-ca>
   ```

   The script verifies that the configured Pons factory recognizes the CA and
   prints its curve, pair asset, tax, fee recipient and launch phase. It does
   not sign or send. `NotGraduated` / `Swept` means no V4 buyback pool yet.

2. The previous public-mint `MockHAHA` at `0xe992...` is not configured and is
   rejected by the staking deployment script. The current app token is
   `0xd2Da...`; full initial supply is held by the operator and no public pool
   or liquidity has been created.

3. The core suite, standalone HAHA and standalone-token CrowdStaking are already
   deployed and configured in production. Owner selected single-wallet
   operation; the operator is also admin/treasury. Do not redeploy the suite.

4. When the actual Pons CA arrives, bind it with
   `MicDrop.proposeHahaToken(address)` and confirm after the configured
   timelock. This replaces the MicDrop binding only; pair/tax/recipient are
   read from the factory and never assumed.

5. Buyback remains HOLD unless `phase=PoolCreated`. Derive the Pons V4 pool key
   from the factory launch record. For a native-ETH quote token, also supply a
   separate, live-quoted USDG/ETH V4 path; do not guess an ETH/USDG pool from a
   symbol or stale web index. Configure `PoolKey[]` through the MicDrop
    timelock, and require fresh reserve state + min-out before allowing a buy.
    No pool or route means funds stay in MicDrop, not a failed/empty swap.

   After a valid route is configured, the 10-minute `sync-chain` monitor
   refreshes graduation and an active-liquidity virtual USDG reserve estimate
   through StateView. Native pools use the first USDG/ETH route pool's spot
   state for conversion. A reserve refresh is not an execution quote or a
   TWAP; keeper buyback execution remains HOLD without a fresh min-out quote.
   See `docs/CA-ONLY-BUDGET.md` for the conditional refresh-gas budget.

6. Replacing the standalone token requires deploying a new CrowdStaking
   contract because its token is immutable, then changing the app staking/token
   config. Existing standalone balances/stakes do not migrate automatically.

## USDG reward funding

- B2B `ProducerGateway.purchasePlan` transfers 30% to the general TipJar pool
  and 10% to a batch royalty reserve. Each successful funding event must be
  registered once via `POST /api/rewards/funding` (SIWE wallet must match tx
  sender), or automatically by verified producer activation.
- Unknown/missing snapshot contributor manifest leaves royalty unallocated;
  never move it into the general pool.
- Optional owner seed: call
  `ProducerGateway.fundRewards(amountMicro)` after approving USDG, then register
  that receipt. This is a paid deposit, not generated revenue.
- Manual seed sequence (example for 1,000 USDG; amounts are 6-decimal base
  units, and these commands are documentation only—not executed here):

  ```bash
  cast send "$USDG_ADDRESS" "approve(address,uint256)" "$PRODUCER_GATEWAY_ADDRESS" 1000000000 --rpc-url "$RPC_URL_MAINNET" --private-key "$FUNDING_WALLET_PK"
  cast send "$PRODUCER_GATEWAY_ADDRESS" "fundRewards(uint256)" 1000000000 --rpc-url "$RPC_URL_MAINNET" --private-key "$FUNDING_WALLET_PK"
  ```

  Register that successful receipt in the signed-in wallet session using
  `POST /api/rewards/funding` with `{ "tx_hash": "0x…", "wallet": "0x…" }`.
  The API verifies chain, sender, gateway event and actual USDG transfers.
- Settlement reads chain-scoped receipts, persists payouts/root, and retries
  finalized epochs without replacing prior reward rows. Claims remain
  USDG-only.
- The current TipJar has 0 USDG and production has no funding receipts/Reward
  rows. No payout is expected until B2B revenue or an owner seed is deposited.

## Not verified from a CA alone

Fee recipient ownership, a funded USDG/native route, graduated pool liquidity,
and fresh minimum output cannot be known before the actual CA/market state
exists. These are runtime data conditions, not launcher communications. The
safe automatic outcome until they exist is no fee harvest and no buyback.
