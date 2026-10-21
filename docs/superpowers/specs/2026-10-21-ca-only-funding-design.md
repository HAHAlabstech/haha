# CA-only funding and token integration

Approved for implementation by the owner's instruction to fix all of the
proposed CA-only design and explain the capital requirements. No launcher
communication or new mainnet broadcast is authorized/required by this task.

## Constraints

- Token CA is the only launcher input. Discover public curve settings; never
  assume creator fees belong to HAHA or force a particular creator tax/pair.
- Reward claims are USDG only, 6 decimals. General funding uses the existing
  80/20 comedian/crowd allocation. B2B keeps 40/30/10/20 and reserves the 10%
  royalty for that purchased snapshot's contributors, not general voters.
- Import successful receipts, not arbitrary TipJar balances. Persist a unique
  chain/transaction/log identity, scope to the active gateway and TipJar, and
  allocate in the same DB transaction as epoch payouts. Retry must not change
  an already-written epoch or double-allocate a receipt.
- Treasury funding has an explicit gateway deposit event and receipt importer.
  It is optional budget supplied by the owner, not guaranteed revenue.
- Creator harvesting defaults OFF. Missing creator entitlement must not block
  B2B/treasury reward settlement or create zero-value harvest transactions.
- Token registration retains role, code/ERC20 and timelock checks. Token changes
  clear graduation/reserve state. The temporary public-mint MockHAHA is a test
  fixture, not a production Pons replacement or fixed-supply asset.
- Buyback uses a dedicated, structured Universal Router 2.1.1 adapter supporting
  direct USDG/HAHA or USDG/native/HAHA exact input. No arbitrary keeper calldata
  or recipient override; exact scoped Permit2 grants, output balance delta,
  minimum output, deadline and route continuity are enforced. Unsupported or
  ungraduated routes HOLD funds. No liquidity is fabricated for an unknown CA.
- Mainnet selects/verifies 4663 and never falls back to testnet. Local dry mode
  cannot sign transactions, including the root-activation keeper.
- Preserve hero/preloader and visual structure. External audit/legal/human work
  is excluded. Budget figures separate measured gas from optional operating
  reserves and unverified vendor invoices.

## Evidence and testing

Node tests cover chain selection/write guards, receipt decoding/deduplication,
royalty separation, no-funds settlement, per-wallet aggregation and accounting.
Foundry tests cover token binding, route construction, min-out, recipient/input
protection, HOLD and treasury deposits. Mainnet checks and cost simulations are
read-only/fork-local. No deployed mock is promoted to production by these tests.
