# CA-only capital budget (live mainnet status, 22 Oct 2026)

Status: foundation suite and the standalone fixed-supply HAHA + CrowdStaking
are live on 4663; the production app is configured to these addresses. The
separate public-mint `MockHAHA` remains on-chain but is no longer configured.

## Capital to prepare

### Single-wallet mode (owner decision, 2026-10-22)

The owner chose **one wallet** for everything: the existing operator key
(`0xAeA64dd8…B651`, the key already on the VPS) acts as deployer, gas payer,
treasury and admin. The deploy script now **warns** instead of rejecting
`hot == cold`; a zero address still fails the preflight. Trade-off: a leaked
VPS key controls every role.

Measured on mainnet and the 4663 fork:

- Full foundation deployment: **11,101,298 gas ≈ 0.0004606 ETH** (TipJar,
  FeeSplitter, MicDrop, V4BuybackAdapter, VaultRegistry, ProducerGateway; no
  CrowdStaking).
- Current settlement has no funded receipts, so it publishes no root and
  spends no root transaction gas. Once a funded epoch exists, root proposal
  and activation spend gas per epoch, not per user claim.
- `MicDrop.setPoolReserve` refresh: 71,516 gas, ≤ every 10 min while a buyback
  route is set → **≈ 0.0128 ETH/month** extra; **$0 while the route is unset**
  (HOLD, the current state).
- User claims are user-pays-gas; not budgeted.

**Single-wallet requirement:**

| Scenario | Amount | Note |
| --- | ---: | --- |
| Foundation deploy (already paid) | **≈ 0.00018680253188 ETH** | observed operator balance delta, nonce 1→7 |
| Standalone token + CrowdStaking (already paid) | **0.00003890465 ETH** | actual receipt fees combined |
| Balance after token/staking deploys (historical) | **0.001762392788522 ETH** | before owner's 0.0018 ETH top-up |
| Current measured balance | **0.003562392788522 ETH** | after 0.0018 ETH top-up; nonce 9 |
| Suggested reserve | **0.005 ETH** | operational target; remaining difference **0.001437607211478 ETH** |

Optional hardening (not required): a second key held OFF the VPS for admin
roles would cost 0 extra gas — only create it if the owner changes their mind.

### USDG for rewards (owner choice)

- The contracts require **$0 USDG** reward seed. Current live TipJar balance is
  **0 USDG**; there are **0** mainnet funding receipts, **0** mainnet Reward
  rows, and no claimable rewards.
- With **$0 seed**, claims stay empty until a verified B2B or treasury funding
  receipt arrives; no reward amount is promised.
- Optional cold-start example: deposit **1,000 USDG**. Settlement treats this
  as a general pool: **800 USDG comedian pool / 200 USDG crowd pool**, then
  existing score, per-account cap and dust-rollover rules apply. This is an
  illustrative owner budget, not a mandatory product rule or guaranteed
  per-wallet payout.
- Optional treasury funding is via `ProducerGateway.fundRewards(amountMicro)`;
  a successful USDG transfer and `RewardsFunded` receipt must be imported before
  it can enter a reward epoch.

### B2B cashflow (customer money, not startup capital)

Existing on-chain price floor is **$500 USDG** for the smallest plan. A $500
purchase actually routes:

| Destination | Amount |
| --- | ---: |
| Treasury/operations | $200 |
| General TipJar inflow | $150 |
| Snapshot-contributor royalty reserve | $50 |
| MicDrop hold/buyback budget | $100 |

A $2,500 snapshot purchase routes $1,000 / $750 / $250 / $500 respectively.
The royalty is reserved until the paid batch is bound to its contributor
manifest. The 20% MicDrop share stays on HOLD until a real token/pool and
validated route exist. Creator fees are counted as **$0 by default** because
the owner receives only the CA and has no launcher coordination.

## Variable operating expenses

- **VPS:** current plan documents a 2-vCPU/2-GB/40-GB host, but no current
  invoice/renewal price was available in the repo; amount is **unverified**, not
  treated as free.
- **Cloudflare R2:** storage/operation spend depends on dataset, card and backup
  volume; no current bill/quota snapshot was available.
- **MiMo:** the project uses the separate Token Plan endpoint
  `token-plan-sgp.xiaomimimo.com` (authenticated model list read returned
  `mimo-v2.6-flash` and `mimo-v2.6-pro`). Public pay-as-you-go documentation
  lists per-million-token prices for V2.5, but it is a different billing path;
  do not use that as this account's bill. Actual prepaid balance/plan spend
  needs to be read in the Xiaomi Token Plan account. Source:
  https://platform.xiaomimimo.com/static/docs/price/pay-as-you-go.md
- **User claims:** user-pays-gas by current plan; do not budget project gas for
  each user's claim.

## Summary

| Bucket | Suggested amount | Required? |
| --- | ---: | --- |
| Operator wallet (single-key, all roles) | **0.005 ETH** total | Yes; measured deploy is 0.00046 ETH, rest is ops buffer. Current balance 0.00199 ETH already covers deploy |
| Initial USDG reward seed | $0 minimum; $1,000 example | Optional; only for bootstrapping before customer receipts |
| MicDrop buyback seed | $0 | Optional; hold B2B share until verified route/liquidity (route unset = $0 gas) |
| VPS/R2/MiMo monthly invoice | Not verifiable from repo | Variable; read actual provider/account bills |

Separate cold admin (0.005 ETH extra) is now an **optional** hardening, not a
requirement — the owner chose single-wallet operation on 2026-10-22.

No ETH/USD price conversion is shown because the budget is denominated in ETH
and no pricing quote was captured with this measurement.

## Standalone token and product status

- Fixed-supply token `0xd2Da320EF90FB76809587C830A33a49512bA90D9`, tx
  `0x89a2a1e6961d2bb09724ed8a9163b42910953e2c500d36505bdb5d0067ed7dd3`:
  1,000,000,000 initial HAHA, all held by the operator, no mint function.
- CrowdStaking `0xe861a2c5d2114A76779d91d416c750bE7D3f7d88`, tx
  `0x6c8222ca48bb305c3f1fef7b7a0da577e3ccf55153d3a43d75355225b39a525a`, is
  bound to that standalone token. The operator later added 0.0018 ETH; live
  balance is **0.003562392788522 ETH** and the gap to the suggested 0.005 ETH
  operating buffer is **0.001437607211478 ETH**.
- Actual token deployment receipt gas cost: **0.000012163983 ETH**; staking
  deployment: **0.000026740667 ETH**. The mainnet foundation suite was deployed
  earlier. Fork gas estimates are maxima/simulation results, not actual fees.
- This standalone token has no market pool and all initial supply remains in
  one wallet. No pool was created because available ETH should remain as gas
  reserve, not become dust liquidity. MicDrop is inactive/HOLD and no creator
  fees are assumed. Juror access does not require HAHA stake; the extra-bit lock
  is separate.
- TipJar remains at 0 USDG with no verified receipts or reward rows. Rewards
  are not claimable until verified funding and settlement.
