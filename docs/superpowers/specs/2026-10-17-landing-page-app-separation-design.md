# Design Specification: Landing Page & Main App Separation with Cinematic Scroll-Driven UI

**Date:** 2026-10-17  
**Status:** Approved by User  
**Topic:** Architectural separation of the public landing page from the Web3 app, enriched with scroll-driven animations, high-end obsidian visuals, and interactive SVG curves.

---

## 1. Objectives & Overview

Currently, the homepage (`/`) mixes marketing explanation with live interactive submission forms and bit feeds, causing visual overload and unclear user journeys. 

This redesign implements **Option 1 (Cinematic Storytelling Landing + Dedicated Web3 App Shell & Supporting Pages)**:
1. **Public Landing Page (`/`)**: A world-class, cinematic storytelling experience designed to captivate visitors, explain the Straight Man AI adversarial comedy concept, demonstrate the blind crowd jury, showcase the Joke Vault replacement cost data engine, and drive conversion via a prominent "Launch App" CTA.
2. **Main Web3 App (`/stage` / `/crowd` / `/tipjar` / etc.)**: A focused, distraction-free workspace for performers taking the stage, jurors blind-voting on bits, and winners claiming USDG tips via Merkle proofs.
3. **Adaptive Navigation (`SiteNav.tsx`)**: Context-aware floating glass header that shows marketing anchors + "Launch App" when on the landing page, and transforms into an App HUD (Stage, Crowd, Vault, Tip Jar, Leaderboard, Wallet) when inside the app.
4. **Cinematic Visuals & Scroll-Driven Interactions**:
   - Interactive 3D Straight Man robot stage with scroll-driven spotlight and camera perspective.
   - Dynamic SVG `HumorSpectrogram` curve component contrasting human comedic nuance against AI literal rigidity.
   - 3-Step interactive process pipeline with illuminated connectors that light up as the user scrolls.
   - Joke Vault Replacement Cost Live Terminal with animated counters.
   - Obsidian glass cards with subtle radial mouse glow and smooth hover states.

---

## 2. Information Architecture & Routing

```
HAHA Platform
├── Public Landing Page (/)
│   ├── Hero with 3D Robot & Monologue Ticker
│   ├── Interactive Humor Waveform / Spectrogram Curve
│   ├── 3-Step Process Pipeline (Stage → Crowd → Settlement)
│   ├── Joke Vault Replacement Cost Live Terminal & Category Explorer
│   ├── Live Club Telemetry & Spotlight Battle Ticker
│   ├── Box Office FAQ & Social Proof
│   └── Global Obsidian Footer
│
├── Main Web3 App Experience
│   ├── Stage (/stage) — Select Open Mic / Pro, write bit, test AI
│   ├── Crowd Jury (/crowd) — Blind judging queue, fairness vote, stake check
│   ├── Crowd Onboarding (/crowd/join) — 10-question calibration quiz
│   ├── Tip Jar (/tipjar) — Daily USDG settlement, Merkle proof claim, Mic Drop burns
│   └── Leaderboard (/leaderboard) — Comedian & juror standings, win rates
│
└── Research, Enterprise & Documentation
    ├── Joke Vault Archive (/vault) & Methodology (/vault/method)
    ├── Producer Gateway (/producers) — Enterprise API keys & dataset licenses
    ├── House Rules (/rules) & Seasons Lineage (/seasons)
    └── Box Office FAQ (/faq) & Profile Dossier (/u/[handle])
```

---

## 3. Component Architecture & Detailed Design

### 3.1 Adaptive Header (`components/SiteNav.tsx`)
- Detects whether current route is the Landing Page (`pathname === "/"`) or an App route (`pathname.startsWith("/stage")`, `/crowd`, `/vault`, etc.).
- **Landing Mode**:
  - Brand mark: `HAHA` with glowing bronze dot + `AI COMEDY LAB`.
  - Center Navigation: Anchor links (`#how-it-works`, `#vault`, `#telemetry`, `#faq`) + `Rules`.
  - Right Action: Dynamic primary button `<Mic /> Launch App` (links to `/stage`) + `Connect Wallet`.
- **App Mode**:
  - Center HUD: Active tab indicator with Lucide icons (`Mic` Stage, `Users` Crowd, `Database` Vault, `Coins` Tip Jar, `Trophy` Leaderboard).
  - Showtime Clock & Testnet Status badge.
  - Wallet connection pill with truncated address & USDG balance.

### 3.2 Landing Page (`app/page.tsx`) Structure & Modular Components

#### Component 1: `components/landing/LandingHero.tsx`
- Integrates existing `ClubStage3D` component within a full-bleed viewport container.
- Live straight-man monologue ticker floating on top left.
- Bold typography with editorial serif accents: *"The Comedy Club Where You Stump the AI and Get Paid."*
- Subtitle: *"Perform against the deadpan Straight Man on Robinhood Chain. Verified by a blind human crowd. Settle in USDG."*
- Dual CTA buttons:
  - Primary: `<Mic /> Launch App` (molten bronze glow, links to `/stage`).
  - Secondary: `<Database /> Explore Joke Vault` (obsidian glass, links to `/vault`).
- Quick telemetry ribbon at the bottom: 24h Pool, Comedians Paid, Win Rate, Model Version.

#### Component 2: `components/landing/HumorSpectrogram.tsx`
- Interactive SVG audio/probability visualizer displaying real-time or scroll-driven animated sine & bezier curves.
- Contrasts two distinct waveforms:
  1. **The Comedian (Human Nuance)**: Golden/amber undulating wave with peaks of double-entendre, subtext, and irony.
  2. **The Straight Man (AI Literal)**: Precise, rigid cyan/sapphire square/pulse wave representing literal interpretation.
- Interactive controls / tooltips explaining how LLMs fail at ambiguity and why human jokes hold irreplaceable training value.

#### Component 3: `components/landing/ProcessPipeline.tsx`
- 3-Step visual pipeline with scroll-driven progress:
  - **Step 01: Take the Stage**: Choose Open Mic (1.0x) or Pro Stage (2.5x). Deliver punchlines, irony, or double meanings.
  - **Step 02: Blind Human Quorum**: 5 to 7 verified human jurors judge blind with zero knowledge of comedian or AI labels.
  - **Step 03: On-Chain Settlement**: Merkle tree daily distribution. Comedians claim USDG from the Tip Jar; 20% burns $HAHA via Mic Drop; 10% perpetual data royalty.
- Glowing obsidian cards with connecting timeline track that highlights as you scroll down.

#### Component 4: `components/landing/VaultTerminal.tsx`
- Visual display of the Joke Vault Replacement Cost Terminal.
- Live replacement valuation counter ($105,420+ estimated dataset value based on human verification rates).
- Interactive cards for the 4 core taxonomy categories:
  - `irony_sarcasm`: Tone inversion & deadpan.
  - `cultural_vernacular`: Slang, generational memes, localized double entendres.
  - `anti_humor_absurdist`: Broken setups and deliberate anti-climaxes.
  - `innuendo_subtext`: Multi-layered contextual jokes.
- Direct link to `/vault` and `/vault/method`.

#### Component 5: `components/landing/SpotlightFeed.tsx`
- Showcase of recent high-profile bits:
  - Verdict stamp: `<CheckCircle2 /> Killed It (Human Win)` vs `<Bot /> Bombed (AI Win)`.
  - Comedian setup, Straight Man literal response, and Crowd quorum stats.
  - "Inspect Bit" link taking visitors directly to `/bit/[id]`.

#### Component 6: `components/landing/LandingFaq.tsx`
- Box office FAQ accordion answering core questions:
  - *"How does payout work?"*
  - *"Why is human comedy valuable to AI labs?"*
  - *"Which chain and wallet do I need?"*
  - *"What prevents bots from gaming the jury?"*

---

## 4. Design System & Visual Polish

- **Background & Canvas**: Pure Obsidian void `#060606` with subtle vignette gradient and radial amber spotlight glow.
- **Surfaces**: Deep obsidian glass `#09090c` / `#111115` with `backdrop-blur-md` and `border-white/10`.
- **Accents**:
  - Molten Bronze: `#ffb13b` (primary highlights, badges, CTA button).
  - Sapphire Drift: `#3b82f6` (AI reasoning indicators, technical badges).
  - Emerald Green: `#22c55e` (successful verdicts, claims).
- **Typography**:
  - Display Serif: `Newsreader` / editorial serif font for cinematic headlines.
  - Body Sans: `Geist Sans` / modern neutral geometric sans.
  - Data Mono: `Geist Mono` / uppercase tracking for telemetry, timestamps, code parameters.
- **Icons**: 100% `lucide-react` SVG vector icons. Zero raw unicode emojis.
- **Motion**:
  - Smooth entrance animations using Tailwind & CSS keyframes.
  - Respects `@media (prefers-reduced-motion: reduce)`.

---

## 5. Verification Plan

1. **TypeScript Typecheck**:
   - Run `npm run typecheck` to guarantee 0 type errors across all new and modified components.
2. **Production Build**:
   - Run `npm run build` to confirm all static and dynamic pages prerender without SSR hydration errors.
3. **End-to-End Navigation Test**:
   - Verify clicking "Launch App" / "Take the Stage" smoothly navigates to `/stage`.
   - Verify header transitions cleanly between Landing mode and App HUD mode.
   - Verify all deep links (`/vault`, `/crowd`, `/tipjar`, `/leaderboard`, `/bit/[id]`) remain fully accessible and functional.
4. **Git Commit & Deployment**:
   - Commit changes using Conventional Commits (`feat(landing): separate landing and app shell with scroll-driven animations`).
   - Push to `main` and monitor GitHub Actions CI/CD to completion.
