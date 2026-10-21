# Testnet user-flow / UI-UX audit — 21 October 2026

## Verdict

**Available for QA, not UX-final and not ready for a final sign-off.** Successful deployment and HTTP 200 responses do not establish that a new user can finish a journey without confusion.

Baseline: `e0b4cdb` (the deployed style changes were preserved). Target: `https://haha.asifaq.com`, runtime `testnet`, chain **46630**. Desktop 1440×1000; mobile 390×844.

This audit changed no application code, hero/preloader, contract configuration, live user votes, settlement schedule, or mainnet state. Two controlled fictional bits were submitted through the real UI with a dedicated QA wallet, using real SIWE and the live worker. The QA provider denies every transaction method. No on-chain transaction was broadcast in this audit.

## 1. Product understanding: three journeys, not one linear funnel

Sources: `haha.md` §5/§7/§8, `HAHA IMPLEMENTATION PLAN.md` §4, current API routes, and worker transitions. The implementation plan's explicit deviations take precedence over the older brief.

### Comedian

1. Explore the site; connect a wallet and sign in when participating. The juror quiz is **not** a requirement to submit a bit.
2. Pick one of four categories and Open Mic/Pro Stage; write a scenario and a question. The server enforces a rolling daily submission quota.
3. Submit → `screening`. Prescreen can reject with a reason; otherwise the Straight Man generates an answer and reasoning.
4. Once an AI answer actually exists, **the author must act**:
   - **Got it:** concede the AI understood → `bombed`; this does **not** create a Crowd verdict or a ComedianReveal.
   - **Missed it:** provide the intended answer and explanation, lock the reveal → `disputed` → blind Crowd assignments.
5. Wait for the active round's jury. Normally 5 votes; thin results expand to 7. Final results are `killed_it`, `bombed`, or `heckled_off`.
6. An eligible lost Crowd verdict has a one-time fresh-jury review path, subject to the per-user daily appeal limit. The plan/API permit `bombed`/`heckled_off`; self-conceded bits have no reveal, so that case must not be falsely described as an existing Crowd judgment or sent to an empty A/B review.
7. A verdict is **not** a claimable balance. Rewards depend on settlement, score, pool inflow, caps/dust, and an activated root. Do not promise a fixed payout or infer it from the status badge alone.

### Juror

1. Enter Crowd independently of performing a bit.
2. Connect/sign in → pass the 10-case calibration, at least 8/10 including fairness → **save that result to the signed wallet**.
3. Determine actual access/eligibility. Current testnet responses distinguish `staked`/`allowlist`; this should be explained, not presented as an unexplained internal gate name or a fabricated stake requirement.
4. Receive an assigned case; read scenario/question and randomized A/B answers; choose A/B/both-right/both-wrong and separately Fair/Unfair.
5. Lock the ballot before expiry → feedback → next assignment or a genuine empty state. A failed queue request is not an empty queue.
6. Do not judge one's own bit. Any juror reward depends on final consensus and a settled epoch, not on simply clicking Vote.

### Rewards and dataset buyers

- Tip Jar: identify the connected wallet → load allocation and chain state → distinguish lifetime allocation, already claimed, currently claimable, and pending/unavailable → sign the claim authorization → send the transaction → wait for a success/revert receipt → refresh balances.
- Vault/Producers is a separate dataset-buyer journey, not an onboarding requirement for comedians or jurors.
- Preserve the chosen license when going from a Vault card to checkout. A buyer must understand exact price, network/token/gas, approval versus purchase, payment confirmation versus license activation, and download/key delivery.
- Creator-fee 70/30, B2B 40/30/20/10, and Tip Jar's internal 80/20 are **different splits**. They must not be blended into one misleading public percentage.

## 2. Browser evidence and findings

P0 = access-control blocker. P1 = blocks or materially misleads a primary user journey. P2 = clarity/accessibility issue that still needs correction.

| ID | Priority | Observed behavior / reproduction | Expected behavior | Source cause |
|---|---|---|---|---|
| AUTH-01 | P0 | After the QA account signed in once, a separate request with **no Cookie, Authorization or session header** to onboarding status still returned its session-gated `onboarded: true`. Only the owned QA account was used; no unauthorized mutation was attempted. | Browser must supply a valid, wallet-bound credential. A server-side active session row alone is not proof that this browser owns that wallet. | `lib/server.ts:114–143`: `requireWalletSession` falls back to a lookup by caller-supplied wallet when no token is supplied. This affects mutation endpoints using the same helper. |
| FLOW-01 | P1 | Write a Stage draft → click Crowd/Tip Jar → return to Stage: setup is empty. | Preserve an unsubmitted draft across navigation, with explicit discard and wallet-aware isolation. | `AppShell.tsx:85–90` unmounts views; Stage draft exists only in component state. |
| FLOW-02 | P1 | On the owned QA bit, Got it returned 200 and `bombed`, with **no Outcome**; UI still said “Disagree with the Crowd? Appeal.” and showed 0/5 votes/awaiting reveal. | Explain that the author conceded the AI understood. Do not imply a jury voted. Show the next appropriate action and truthful review eligibility. | `app/bit/[id]/page.tsx` renders generic jury/verdict/appeal panels; `verdict/route.ts:83–91` only changes status for Got it. |
| FLOW-03 | P1 | A new anonymous visitor to the second QA bit could open **Missed it** and type a reveal as though they were the author. No guest submission was made. | Author-only controls should be author-only in the UI as well as protected on the server; spectators get an explanatory read-only view. | `app/bit/[id]/page.tsx:263–264`: `canVerdict` checks status only; the connected account is discarded from rendering state. |
| FLOW-04 | P1 | Real author Lock Reveal request returned 200, `has_reveal: true`, status `disputed`; page still said **“Awaiting comedian reveal or verdict below.”** | “Reveal locked. Waiting for the Crowd.” Never reopen/edit the reveal or leak its hidden content to jurors. | API correctly hides reveal text pre-settlement but supplies `has_reveal`; BitPage ignores that flag and interprets null text as not submitted. |
| FLOW-05 | P1 | Follow the author's profile after sending the second bit to Crowd: total bits = 2, but the pending bit is absent; only the older `bombed` bit is listed. Wallet menu has no My Bits entry. | A returning author can recover their own pending work without remembering a raw URL. Preserve blind/holdout boundaries with an authenticated owner list, not a new public reveal feed. | `app/api/u/[handle]/route.ts:66–72` excludes `disputed`; `WalletMenu.tsx` exposes copy/explorer/disconnect only. |
| QUIZ-01 | P1 | Anonymous preview scored 10/10. UI simultaneously offered Connect Wallet to Save Pass **and** Enter Crowd. Following Enter Crowd leads to an unconnected console displaying Not passed. | Save/confirm the wallet-bound pass first; offer Enter Crowd as the next primary action only after persistence succeeds. | `app/crowd/join/page.tsx:376–400`: Enter Crowd is unconditional on `savedServer`. |
| QUIZ-02 | P1 | Injected one failed preview POST after completing the quiz. The visible page showed no useful error; the only detected alert was empty. Retrying against the real endpoint succeeded (200, 10/10). | Visible error beside Submit, retain answers, announce progress, disable duplicate submission while saving. | Error rendering is inside the graded-result branch; the ungraded submit button ignores `saving` for both label and disabled state. |
| QUIZ-03 | P1 | The QA wallet remains passed on the server. A controlled expired-token credential on that same wallet caused all 10 cases to reappear instead of a sign-in recovery action. Missing browser credentials were separately found accepted because of AUTH-01; removing only localStorage is **not** a true expiry test because cookies/DB fallback exist. | Distinguish unknown/needs-sign-in from not calibrated. Recover authentication and check saved status before asking the user to retake. | Join page treats absent gated status as ordinary quiz state and has no session-recovery state. |
| ERROR-01 | P1 | With a deliberately injected 503 on Crowd next, a calibrated user saw **“no cases waiting right now.”** With 503 on rewards, Tip Jar said **“No claimable rewards yet.”** | Separate loading, genuine empty/404, failed fetch/503, and retry. Never convert backend uncertainty into a claim about a user's queue or money. | `CrowdView.tsx:85–95` and `TipJarView.tsx:130–138` collapse every non-OK response into empty state. |
| CLAIM-01 | P1 | Negative return-user case: remember a public wallet address in a fresh browser with **no provider/auth**. UI displayed lifetime allocation $220.15 and an enabled Claim button. Independent read-only chain check showed already claimed = $220.15, **unclaimed = $0**. Clicking Claim produced no message and no reconnect dialog. This was not presented as a connected/authenticated wallet or a successful claim test. | Require/recover a provider; never silently return. Display claimable delta, not a lifetime amount as apparent new money. Unknown chain-read state is not permission to claim. | `TipJarView.tsx:148–149` returns silently without provider; `fullyClaimed` depends on a wallet-provider read that can stay null; CTA is enabled meanwhile. |
| MOBILE-01 | P1 | At 390px the header clips the wallet/connect area off the right edge. Its five icon-only workspace buttons have **empty accessible names**. Screenshot retained. | Wallet action remains reachable; named/touch-sized workspace navigation, visible active location, no clipped controls. | `AppHeader.tsx` single-row layout plus hidden tab labels and no `aria-label`/current-state semantics. |
| NOTFOUND-01 | P1 | Open a nonexistent bit: API 404, yet page shows SCREENING, Loading setup, computing response, and an active waiting stage. | Explicit not-found screen and a route back. Transient failures need Retry, not an invented processing state. | `BitPage.loadBit` silently returns on non-OK; default rendering treats null bit as screening. |
| BUYER-01 | P1 | Click Checkout on **Holdout Eval Run ($500)** in Vault. `/producers` opens with **Snapshot License ($2,500)** selected. No payment was attempted. | Preserve validated plan selection across the link; explain any price change before purchase. | All Vault Checkout links use the same `/producers` URL; Producers defaults to snapshot. |
| COPY-01 | P2 | Live Stage and Vault say **7–9 jurors**; plan, API and worker use **5 → 7**. Vault says **50% TipJar / 25% MicDrop / 25% Ops**, contradicting 40/30/20/10. Tip Jar says 70% of producer revenue enters it; B2B actually routes 30% general + 10% royalty. | One source-consistent rulebook and per-inflow split copy. The Crowd's 20% is shared among qualifying jurors, not an individual guaranteed share. | `StageView.tsx:267–268`, `VaultView.tsx:201,330`, `TipJarView.tsx:309–313`; landing pipeline also mixes splits. |
| ROUND-01 | P2 | Public final Round-2 dossier `cmvhhda6d0001qi016f86i6y6` shows **10/12 votes**, not the active jury's 5/7 progress. | Progress and target refer to the active round. Previous rounds can be separate history, never the current quorum denominator. | `app/api/bits/[id]/route.ts:30–37,84–87` aggregates assignments/votes from all rounds. |

### Additional source-verified risks / not claimed as completed runtime tests

- Prescreen writes `answered` **before** the Straight Man answer is stored (`worker/jobs/prescreen.js:72`); BitPage enables verdict based only on that status and stops polling answered bits. The real worker's intermediate `answered`/no-answer state was observed in both QA cases. **Both natural UI runs eventually showed the AI answer**, so this report does not claim a reproduced permanent spinner. The guard/polling contract still needs a regression test for the intermediate state.
- The backend verdict route permits `screening` and does not require an actual AI answer. UI alignment must not leave a server race accepting an author call before there is anything to judge.
- Heckled-off appeals are permitted by plan/API but absent from the rendered appeal panel, which checks only `bombed`.
- Rejected-prescreen reason exists in the payload but is not rendered as a meaningful terminal/recovery state. Crisis support is checked only on the synchronous create response even though rejection happens asynchronously in the worker. This needs a controlled rejection test before sign-off.
- Claim UI stops at a broadcast hash; it does not wait for a success/revert receipt or refresh the claimed balance after confirmation. No paid claim transaction or fresh daily epoch was executed in this audit.
- A newly written DB allocation/proof is not automatically the active on-chain root. Pending activation needs explicit representation before enabling Claim.
- Vault renders an invented eight-week curve when fewer than four snapshots exist. Public replacement estimate, actual revenue, and price list need visibly separate labels per `haha.md` §8; the API's revenue value is currently unused by this view.
- Actual juror quota/access enforcement, full royalty attribution, and buyer/payment-identity binding need separate backend checks. A UI audit cannot certify them simply because their labels are present.

## 3. Evidence boundaries

### Exercised through the real UI / live endpoints

- Anonymous landing → Launch App; draft → wallet picker → close; Stage/Crowd/Tip Jar navigation.
- Fresh dedicated QA wallet → EIP-6963 connect → real SIWE verify **200** → Pro Stage submit **200** → actual AI worker answer → Got it **200**.
- Anonymous 10-case quiz preview → real grading **200, 10/10** → unsaved pass exit.
- Same QA wallet → full quiz → real persisted pass **200, 10/10** → Crowd → returning calibrated-user screen.
- Controlled expired credential, queue/reward API failure injection, and negative remembered-wallet/no-provider case. These are explicitly negative cases, not mocked happy-path evidence.
- Second fictional QA bit → actual AI answer → author reveal **200** → `disputed`, `has_reveal: true` → recovery through profile.
- Public settled dossier and read-only on-chain `cumulativeClaimed` inspection.
- Vault Eval checkout link → actual selected plan in Producers.

QA bit IDs: `cmvhx4obo0004lh01x5erxhh4` (self-conceded `bombed`) and `cmvhxinpp000blh01mg6mu8m4` (sent to Crowd). No juror vote was cast on unrelated cases; no final jury result, payout, or B2B purchase was manufactured for this report.

Diagnostic scripts, JSON reports and screenshots are retained under `C:/Users/sifaq/AppData/Local/Temp/opencode/` with prefix `haha-flow-`. Test-wallet key files are **not** included in this report or committed. Two diagnostic harness issues (an option-label selector and a screenshot timeout) were corrected/resumed; neither is counted as an application defect.

## 4. Repair approaches

1. **State-aware repair of existing screens — recommended.** Preserve the current visual design, contracts, reward math, routes and product rules. Fix role/auth boundaries, action/wait/error transitions, draft/pending-work recovery, mobile navigation, monetary state, and plan-preserving checkout. Add regression tests at those boundaries. This addresses causes rather than adding more explanatory links to broken states.
2. **Copy-only polish.** Smaller diff, but leaves lost drafts, inert claims, incorrect action visibility and AUTH-01. Not acceptable as a finalization pass.
3. **A new onboarding wizard / redesign.** Can be clearer but adds scope and risks inventing a new mandatory funnel. Not required and not recommended.

## 5. Proposed UI-state contract (for design approval, not yet implemented)

- **Shared:** network explicitly says Testnet/46630; wallet connection, SIWE authorization and participation eligibility are distinct states. Restore/sign-in requests have visible feedback. No credentials means no privileged mutation.
- **Stage:** comedian submission stays independent of juror calibration. Preserve drafts across tabs; offer an authenticated My Bits recovery path. Explain that after the AI response the author must make the next call. Do not make quiz enrollment the performer screen's dominant action.
- **Bit:** one contextual next-action region above secondary dossier/history. Processing → author decision → reveal lock → waiting jury → final result/review → reward lookup. Author, spectator and juror views must differ appropriately. Missing/rejected/error are explicit, not waiting states. Preserve hidden reveal content and active-round-only progress.
- **Crowd:** connect/sign-in → actual calibration status → saved pass → eligibility → ballot. Choices and fairness are separate; submit has visible busy/success/error states. Passed users are not sent back through ten questions because authentication expired. Queue errors are not empty queues.
- **Tip Jar:** show allocated, already claimed and available-to-claim amounts. Unknown/unavailable/pending activation is not zero or claim-ready. Claim goes through sign → submit → pending → receipt-confirmed/reverted → refreshed amount, with a clear reconnect path.
- **Vault/Producers:** clearly distinguish preliminary replacement cost from actual revenue and licensing prices; use real snapshot history only; preserve the selected plan; separate approval/payment/activation/key-delivery states and keep recovery possible without another purchase.
- **Mobile/accessibility:** reachable wallet control, named workspace tabs, active-tab semantics, usable targets, associated form labels and errors near the action. Keep the existing obsidian/amber identity; do not redesign the hero/preloader.

Implementation and deployment are intentionally pending design review. **Do not mark the testnet UX final based on this audit; it identified the work needed to reach that point.**
