# Standalone HAHA mainnet operations

Current product mode is standalone HAHA on Robinhood Chain mainnet (4663).
Pons, Pons creator fees, and Pons hook integration are not part of this
operating path. `PONS_LAUNCH_MODE=standalone` and `CREATOR_FEE_MODE=off` must
remain set; the worker must not poll Pons or write to MicDrop in this mode.

## Live contracts and product behavior

- HAHA: `0xd2Da320EF90FB76809587C830A33a49512bA90D9`; fixed initial supply of
  1,000,000,000, held by the operator; no mint function.
- CrowdStaking: `0xe861a2c5d2114A76779d91d416c750bE7D3f7d88`, immutable token is
  the standalone HAHA address.
- The app and worker use the standalone token and staking addresses. Never use
  the old public-mint `MockHAHA` at `0xe992...`.
- Jurors need a connected signed-in wallet and a passing 10-case calibration
  quiz (8/10). There is no on-chain juror minimum stake. The separate 10 HAHA
  extra-bit lock applies only to above-quota bits where that feature is used.
- No market pool is configured. Token buy/trade is not available from the app;
  do not show a price or imply that users can buy HAHA.
- The operator wallet last measured `0.003562392788522 ETH`. Preserve it as an
  operations/gas balance; do not put it into a dust-liquidity pool.

## Reward funding and settlement

- Current TipJar balance is 0 USDG; production has 0 verified funding receipts
  and 0 mainnet reward rows. No payout is claimable now.
- Only actual, verified USDG transfers/events can fund rewards. Customer B2B
  purchases split 30% to the general TipJar pool, 10% to a contributor royalty
  reserve, 20% to the MicDrop hold, and 40% to operations/treasury. The MicDrop
  allocation stays held; no standalone HAHA buyback route exists.
- An owner reward seed is optional and must be a real USDG transfer through
  `ProducerGateway.fundRewards(amountMicro)`, followed by verified receipt
  registration. Do not count ETH gas funding as USDG rewards.
- Settlement publishes roots only for funded eligible epochs. Claims are
  USDG-only and require an activated root; do not promise daily or fixed payouts.
- A new CrowdStaking deployment is required if the token is ever replaced;
  its token address is immutable and existing stakes do not migrate.

## Production checks

1. Confirm `/api/health` returns 200 and `/api/config` returns chain ID 4663,
   the standalone HAHA address, and the standalone CrowdStaking address.
2. Confirm app/worker containers are healthy and worker logs show
   `productMode=standalone` without Pons errors or MicDrop writes.
3. Confirm TipJar USDG balance, verified funding receipt count, and reward rows
   before announcing any payout.
4. Confirm operator ETH reserve before any new mainnet transaction. No pool,
   USDG seed, or token distribution transaction is part of the current release.
