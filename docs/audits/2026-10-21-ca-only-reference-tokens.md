# CA-only launch: reference token observations

## Scope and method

Owner supplies only HAHA's eventual CA. No launcher communication, control of
launch settings, or recipient reassignment is available. External audit/legal
and human-approval work is excluded from this task. No mainnet broadcast.

Read-only `eth_chainId`, `eth_blockNumber` and getter `eth_call` requests used
`https://robinhood-rpc.publicnode.com` on 21 Oct 2026. No private key or wallet
client was used. Calls used the latest tag, not an atomic historical snapshot;
the heads below identify observation time, not a pinned block for every field.

## Observations

| Field | TATA | CRIT |
| --- | --- | --- |
| Token | `0x96003d7d4f6b8d7466ce423fcecc916f7f901c90` | `0x351776b6fba6a910c32e46f3775aa946a724d78f` |
| Symbol | `TATA` | `CRIT` |
| Name | Not queried | `sCRIT` |
| Decimals | 18 | 18 |
| Total supply (raw) | Not queried | `1000000000000000000000000000` (1 billion at 18 decimals) |
| Curve | `0x04b57f99b3023e949eb2fce73dc1764e7524681d` (supplied; `curve.token()` matched) | `0x0705808f8A3b4F297f91Ee34a3cD31100e005533` (resolved by `token.curve()`; reverse `curve.token()` matched) |
| `pairToken()` | Zero address (native ETH) | Zero address (native ETH) |
| `creatorTaxBps()` | 192 (1.92%) | 199 (1.99%) |
| `buybackEnabled()` | false | false |
| `buybackCreatorRecipient()` | `0x8B7B1E50549036f060855887d5eBcD3cE220CF1b` | `0x082dC70eD39bC9004ffabcc6fE271B50Fb6B3CA8` |
| `factory()` | Not queried in this pass | `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e` |
| `feeEscrow()` | Not queried in this pass | `0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e` |
| `graduated()` | Not queried in this pass | false |
| Observed head | 94357808 | 94360230 |

CRIT `pendingCreatorFeeRecipient()` and `poolId()` probes reverted. The
explorer API returned HTTP 403, so this pass used direct RPC getters instead.
Neither failure establishes the absence of equivalent functionality elsewhere.

## Conclusions and limits

- The supplied `0x3517...d78f` address is the CRIT token contract, not evidence
  of a launcher EOA. The two recipient addresses above are observed settings;
  ownership by a particular person/team has not been established here.
- Both examples use native ETH. Their creator taxes differ (192 vs 199 bps),
  so neither exact 200 bps nor exact 192 bps may be assumed for future HAHA.
- CRIT was not graduated at observation time. These getter reads do not prove
  a live post-graduation swap path, pool liquidity, output amounts or burn.
- The presence of a setter selector alone would not establish who can invoke
  it. Setter access control was not tested, and no setter was invoked.
- Receiving a token CA does not confer creator-fee entitlement. If the HAHA
  suite is not the actual recipient, native-asset support cannot redirect
  another recipient's fees. Future HAHA settings remain unknown until its CA
  can be inspected.

## Current source implications (design pending approval)

1. `FeeSplitter._claim()` catches escrow reverts, including the native claim;
   lack of a payable receiver is not proof that the entire outer harvest
   always reverts. It still does not make ETH claimable/convertible by HAHA.
2. Token registration must be separated from creator-fee eligibility. A
   concurrent change to `MicDrop.sol` already relaxes registration; it was not
   authored or verified by this investigation and is not a completed swap fix.
3. `MicDrop` currently calls the project-specific `swapExactUsdgForHaha` ABI.
   Current mocks do not establish compatibility with the live Universal Router
   or an actual USDG -> ETH -> HAHA route.
4. `dailySettlement` allocates FeeSplitter event inflow plus rollover. It does
   not consume B2B `RevenueEvent` records, so B2B transfers alone do not prove
   new claimable allocations. Preserve the distinct 30% general / 10% royalty
   pools and ingest actual receipts exactly once, not arbitrary TipJar balance.
5. `CrowdStaking.resolveSlash()` transfers HAHA, not USDG. A slash is not
   automatically USDG reward funding. Do not describe staking as a guaranteed
   USDG revenue source or make all comedians stake by implication.
6. `worker/lib/chain.js` currently selects testnet RPC/46630 unconditionally.
   A future mainnet configuration must select and verify 4663, fail closed on
   mismatch, and never fall back to testnet.

Candidate approaches:
- Registration-only patch: smallest diff, but leaves accounting/router gaps.
- CA-only with optional creator-fee integration: recommended; reward accounting
  remains independent of launch settings, with explicit USDG receipts and a
  verified route before any buyback. HOLD when no supported route exists.
- Full native creator-fee conversion: additional adapter/routing work, useful
  only if HAHA is actually entitled to those fees; not an ownership workaround.

No contract implementation, deployment, or broadcast was performed by this
investigation. Owner approval of the funding basis/design is still required
before implementation.
