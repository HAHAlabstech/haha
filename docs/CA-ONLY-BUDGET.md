# CA-only capital budget (pre-mainnet estimate)

Status: design/code verification only. No suite broadcast was performed. The
temporary mainnet token is the public-mint `MockHAHA`; do **not** use it as the
CrowdStaking token or infer Pons liquidity from it.

## Capital to prepare

### ETH for contract deployment and operator gas

Latest read-only mainnet sample (chain 4663):

- Operator wallet balance: **0.00198809997036 ETH**; nonce **1**.
- Full foundation fork simulation (block 94418437): **11,101,298 gas**,
  estimated max cost **0.000460615067717298 ETH** at the simulated maximum
  fee of **0.041492001 gwei**. It deployed TipJar, FeeSplitter, MicDrop,
  V4BuybackAdapter, VaultRegistry, ProducerGateway; no CrowdStaking.
- The app's operator low-gas threshold is **0.005 ETH**.
- Foundry gas report for `MicDrop.setPoolReserve`: **71,516 gas**. If an
  approved route is configured, `sync-chain` refreshes the on-chain reserve no
  more often than every 10 minutes. At 4,320 calls/30 days and the sampled
  0.041492001 gwei max fee, the gas-limit budget is about **0.01282 ETH/month**;
  no reserve writes occur while the route is unset.

**Suggested reserve, not protocol minimum:** hold **0.010 ETH** in the hot
operator/deployer wallet. That is about **21.7×** the simulated foundation
deployment fee and leaves roughly 0.00954 ETH after a deployment at that same
fee. Relative to the observed balance, the top-up to this reserve is about
**0.00801190002964 ETH**. Actual fees vary with base fee and RPC/chain conditions.

Keep the cold admin in a **different address** and pre-fund it with a suggested
**0.005 ETH** for its timelocked configuration/veto transactions. The current
`.env.mainnet` points hot and cold at the **same address**; the deploy script
now rejects that. Do not reuse the hot private key as the cold key. The
recommended prepared balance is therefore **0.010 ETH hot + 0.005 ETH cold**.
Against the observed hot balance, the suggested additional funding is about
**0.00801190002964 ETH hot + 0.005 ETH cold = 0.01301190002964 ETH** if the new
cold wallet starts empty. The cold wallet needs its own key and balance. This is an operational
reserve estimate, not a measured lifetime gas guarantee.

If a buyback route is enabled for a full month, budget another **~0.013 ETH**
for these refresh calls at the sampled fee (about **0.017 ETH** with a 30% gas
buffer), on top of deployment gas. Suggested first month with active route:
**0.027 ETH hot + 0.005 ETH cold = 0.032 ETH total**. Versus the observed hot
balance, that is roughly **0.02501190002964 ETH additional** if the new cold
wallet starts empty. With route unset, the additional monthly reserve-refresh
spend is not incurred.

### USDG for rewards (owner choice)

- Contract deployment requires **$0 USDG** reward seed.
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
| Hot deployment/keeper ETH | 0.010 ETH total | Yes, enough for measured deploy plus buffer; current balance counts toward it |
| Cold admin ETH | 0.005 ETH total | Yes, at a distinct cold address before admin operations |
| Initial USDG reward seed | $0 minimum; $1,000 example | Optional; only for bootstrapping before customer receipts |
| MicDrop buyback seed | $0 | Optional; hold B2B share until verified route/liquidity |
| VPS/R2/MiMo monthly invoice | Not verifiable from repo | Variable; read actual provider/account bills |

No ETH/USD price conversion is shown because the budget is denominated in ETH
and no pricing quote was captured with this measurement.
