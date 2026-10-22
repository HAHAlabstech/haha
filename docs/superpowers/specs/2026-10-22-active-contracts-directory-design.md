# Active Contracts Directory — Design

## Goal

Give users one production page that lists the HAHA contracts currently used by the mainnet product, with accurate network, role, status, explorer, and copy-address information.

## Scope

Show only Robinhood Chain mainnet (chain ID `4663`) contracts actively used as product assets/dependencies:

- HAHA fixed-supply token `0xd2Da320EF90FB76809587C830A33a49512bA90D9`.
- CrowdStaking `0xe861a2c5d2114A76779d91d416c750bE7D3f7d88`.
- TipJar `0xda4762e4205aFf2d8CB9177cDcE6d69A23068bbE`.
- ProducerGateway `0x71826870a70064F0657EF527AFd9d1029Ae950de`.
- VaultRegistry `0x27e5ADf5F3BfEBFA7B7B81619CA68a97CD1866D6`.
- USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`, labeled clearly as an external payment-token dependency, not a HAHA deployment.

Do not list FeeSplitter, MicDrop, V4BuybackAdapter, the retired public-mint MockHAHA, or testnet rehearsal mocks. Those are not part of the current active standalone product path; inactive components must not be visually implied to be operating.

## Approaches considered

1. **Curated typed registry (recommended):** keep the approved current mainnet list in a single typed module and render it from a focused route. This is fast, deterministic, reviewable, and avoids presenting RPC failures as missing deployments.
2. **Discover contracts dynamically at page load:** scan runtime config and call each address for bytecode/state. This adds latency and failure modes, cannot discover contracts not exposed by the current config, and can mislabel operational status.
3. **Inline table in the page component:** shortest initial patch but mixes registry data, status language, and presentation, making future updates easy to miss.

## User experience

- New route: `/contracts`, discoverable from the desktop/mobile navigation and footer.
- Keep the existing dark editorial visual system, with an amber mainnet header, concise cards, responsive two-column desktop / one-column mobile layout, complete addresses, role descriptions, and a status badge.
- Each address has a keyboard-accessible copy button with an announced “Copied”/error state, plus an external Blockscout link opened safely in a new tab.
- Show a visible note that HAHA currently has no market pool and that TipJar rewards require verified funding. Do not show a token price, imply trading, or imply a funded reward balance.
- Use existing `ScrollReveal` for subtle staggered entrance and card interaction feedback; honor `prefers-reduced-motion` through that component. No looping animation, wallet prompts, or transaction actions.

## Architecture and data flow

- `lib/deployed-contracts.ts` exports typed, curated mainnet registry entries and explorer metadata.
- `app/contracts/page.tsx` supplies page metadata and server-rendered route structure.
- `components/contracts/ContractDirectory.tsx` renders the responsive registry and owns the clipboard interaction state.
- `SiteNav.tsx` and `SiteFooter.tsx` add a `/contracts` link.
- No new API, schema, contract deployment, RPC dependency, wallet connection, or mainnet transaction is introduced.

## Failure handling and accessibility

- Clipboard failure leaves the full address visible and displays an inline, screen-reader-announced message.
- Explorer links have descriptive accessible names, `target="_blank"`, and `rel="noopener noreferrer"`.
- Cards use semantic headings, visible network/chain labeling, keyboard-operable controls, and responsive layout.
- Reduced-motion users receive the final visible state without reveal animation.

## Acceptance and tests

- Registry unit tests assert six unique valid addresses, chain ID 4663, and the external dependency classification for USDG.
- Build/typecheck and Node unit suite pass.
- Browser smoke confirms `/contracts` is HTTP 200, each address and explorer link renders, copy feedback appears, nav/footer links work, and mobile layout has no horizontal overflow.
- No wallet signature or transaction is requested by the route.
