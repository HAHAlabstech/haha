# Active Contracts Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polished `/contracts` directory for the six currently active/configured mainnet protocol addresses and USDG dependency.

**Architecture:** Put verified registry metadata in one typed module; render it from a server route using a focused client directory for copy feedback and existing reduced-motion-aware `ScrollReveal`; add navigation links. The page makes no RPC discovery calls, wallet prompts, database writes, or transactions.

**Tech Stack:** Next.js 16.4.2 App Router, TypeScript, React, Tailwind CSS v4, Lucide icons, Node test runner with `tsx`.

## Global Constraints

- Mainnet only: chain ID is `4663` and explorer is `https://robinhoodchain.blockscout.com`.
- Show only HAHA, CrowdStaking, TipJar, ProducerGateway, VaultRegistry, and external USDG.
- Do not show FeeSplitter, MicDrop, V4BuybackAdapter, retired MockHAHA, or testnet deployments.
- State that USDG is external; deployed contracts are not implied to have funding or a market pool.
- Reuse `ScrollReveal`; respect reduced-motion and keyboard-accessible copy/explorer controls.
- Do not add wallet connections, transaction buttons, private keys, or an RPC requirement.

---

### Task 1: Define and test the deployed-contract registry

**Files:**
- Create: `lib/deployed-contracts.ts`
- Test: `tests/contracts-registry.test.ts`
- Modify: `package.json`

**Interfaces:**
- Export `ACTIVE_MAINNET_CONTRACTS` as a readonly list of entries with `{ name, address, role, category, status }`.
- Export `MAINNET_CONTRACTS_CHAIN` with `{ id: 4663, name: "Robinhood Chain Mainnet", explorerUrl: "https://robinhoodchain.blockscout.com" }`.
- Registry order: HAHA, CrowdStaking, TipJar, ProducerGateway, VaultRegistry, USDG.

- [x] Add tests proving exactly six entries, unique valid `0x` addresses, correct chain ID, and USDG category `external_dependency`.
- [x] Run `node --import tsx --test tests/contracts-registry.test.ts`; confirm failure because the registry module is not present.
- [x] Add the typed registry with these addresses:
  - HAHA `0xd2Da320EF90FB76809587C830A33a49512bA90D9`.
  - CrowdStaking `0xe861a2c5d2114A76779d91d416c750bE7D3f7d88`.
  - TipJar `0xda4762e4205aFf2d8CB9177cDcE6d69A23068bbE`.
  - ProducerGateway `0x71826870a70064F0657EF527AFd9d1029Ae950de`.
  - VaultRegistry `0x27e5ADf5F3BfEBFA7B7B81619CA68a97CD1866D6`.
  - USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` (external dependency).
- [x] Add the test command to `test:unit`, rerun the new test, and confirm pass.

### Task 2: Build the contracts directory page and interactions

**Files:**
- Create: `app/contracts/page.tsx`
- Create: `components/contracts/ContractDirectory.tsx`
- Modify: `components/SiteNav.tsx`
- Modify: `components/SiteFooter.tsx`

**Interfaces:**
- `ContractDirectory` consumes `contracts: typeof ACTIVE_MAINNET_CONTRACTS` and `explorerUrl: string`.
- Copy control copies exactly the card address and exposes an `aria-live="polite"` status of `Copied address` or `Copy failed`.
- Explorer link uses `${explorerUrl}/address/${address}` with safe new-tab attributes.

- [x] Add `/contracts` server page metadata and a page hero showing Mainnet / 4663.
- [x] Render a responsive 1-column mobile / 2-column desktop card grid; each card displays name, role, status tag, full address, copy control, and explorer link.
- [x] Add a concise disclosure: HAHA has no market pool; TipJar reward claims depend on verified USDG funding/root activation; USDG is external.
- [x] Add a `Contracts` route link to primary desktop/mobile navigation and footer navigation.
- [x] Add tasteful staggered card reveal using `ScrollReveal` with staggered `delayMs`; rely on its existing `prefers-reduced-motion` support. Avoid perpetual animation.
- [x] Run `npm run typecheck` and `npm run build`.

### Task 3: Production browser verification and release

**Files:**
- Test in production browser: `/contracts`, navigation, clipboard feedback, explorer link target, mobile layout.
- No additional contract or database writes.

- [x] Run `npm test`, `npm run typecheck`, and `npm run build`.
- [x] Commit only the contracts registry/page/navigation/tests; leave unrelated local modifications untouched.
- [x] Push `main`; CI test/build/deploy/healthcheck/read-only preflight succeeded.
- [x] In production browser verify `/contracts` returns 200, six cards render, desktop/mobile/footer `Contracts` navigation works, copy feedback is announced, explorer URLs have safe target attributes, and mobile width has no horizontal overflow.
- [x] Verify `/api/config` returns chain ID 4663 and the existing HAHA/CrowdStaking addresses; no mainnet transaction is sent.
