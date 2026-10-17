# Landing Page & Main App Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cleanly separate the public storytelling landing page (`/`) from the dedicated Web3 comedy app (`/stage`), enriched with scroll-driven animations, an interactive SVG humor spectrogram curve, 3-step illuminated pipeline, and obsidian aesthetics.

**Architecture:** 
- Route `/` becomes a pure cinematic landing page with modular landing sections.
- Route `/stage` (and `/app` redirect) acts as the focused, distraction-free performer and Web3 app cockpit.
- `SiteNav.tsx` adapts between Landing Mode (storytelling anchor links + "Launch App" CTA) and App Mode (modular HUD tabs + wallet status).
- New visual components under `components/landing/` handle interactive curves, 3-step pipelines, replacement cost terminal, and FAQ.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS, Lucide React, Three.js (for `ClubStage3D`).

## Global Constraints
- Strictly follow the Obsidian Laocoon theme (`#060606`, `#09090b`, `#111115`, `border-white/10`, text `#f4f4f5`, molten bronze `#ffb13b`, sapphire `#3b82f6`).
- Zero unicode emojis. Only use Lucide SVG icons.
- Single floating glass header with adaptive mode (Landing vs App HUD).
- Zero TypeScript or lint errors (`npm run typecheck` must pass).
- Production build (`npm run build`) must succeed with 0 errors.

---

### Task 1: Adaptive Navigation (`components/SiteNav.tsx`)

**Files:**
- Modify: `components/SiteNav.tsx`

- [ ] **Step 1: Update `SiteNav.tsx` to detect Landing vs App mode**
  - Check `const isLanding = pathname === "/";`
  - When `isLanding`:
    - Show anchor links: `#how-it-works` (How it works), `#waveform` (The Science), `#vault` (Joke Vault), `#faq` (FAQ).
    - Show Primary CTA button: `<Link href="/stage" className="btn-take-stage"><Mic className="w-4 h-4" /> Launch App <ArrowUpRight className="w-3.5 h-3.5" /></Link>`.
  - When in App mode (`/stage`, `/crowd`, `/vault`, `/tipjar`, `/leaderboard`, etc.):
    - Show full App HUD (Stage, Crowd, Vault, Tip Jar, Leaderboard) with active route indicator.
  - Preserve wallet connection modal and address pill in both modes.

---

### Task 2: Create Landing Visual Components (`components/landing/`)

**Files:**
- Create: `components/landing/HumorSpectrogram.tsx`
- Create: `components/landing/ProcessPipeline.tsx`
- Create: `components/landing/VaultTerminal.tsx`
- Create: `components/landing/SpotlightFeed.tsx`
- Create: `components/landing/LandingFaq.tsx`

- [ ] **Step 1: Create `HumorSpectrogram.tsx`**
  - Interactive SVG spectrogram curve component.
  - Animated bezier wave for "Human Comedic Nuance" (molten bronze `#ffb13b`, unpredictable oscillations, subtext peaks).
  - Contrasted with "Straight Man AI Literalism" (sapphire `#3b82f6` step function / square wave).
  - Interactive mode toggles (Irony, Innuendo, Absurdity) showing how probability distributions shift.

- [ ] **Step 2: Create `ProcessPipeline.tsx`**
  - 3-step illuminated pipeline:
    - Step 01: Stump the AI (Take the Stage, Open Mic vs Pro).
    - Step 02: Blind Crowd Quorum (5-7 verified human jurors, 60% agreement threshold).
    - Step 03: On-Chain Settlement (USDG Tip Jar claim, $HAHA Mic Drop burn, 10% data royalty).
  - Vertical/horizontal connecting line with glowing gradient track and numeric HUD badges.

- [ ] **Step 3: Create `VaultTerminal.tsx`**
  - Replacement Cost live terminal display ($105,420+ valuation metric).
  - 4 Category cards with obsidian glass styling, Lucide icons, and hover glows (`irony_sarcasm`, `cultural_vernacular`, `anti_humor_absurdist`, `innuendo_subtext`).
  - Direct CTA button to `/vault`.

- [ ] **Step 4: Create `SpotlightFeed.tsx`**
  - Live club battle cards with real-time status badges (`Killed It` / `Bombed`).
  - Shows setup quote, Straight Man deadpan response, jury vote split, and "Inspect Bit" link.

- [ ] **Step 5: Create `LandingFaq.tsx`**
  - Clean obsidian FAQ accordion with box office essentials (payouts, replacement cost, anti-bot crowd verification, Robinhood Chain testnet 46630).

---

### Task 3: Assemble Public Landing Page (`app/page.tsx`) & App Redirect (`app/app/page.tsx`)

**Files:**
- Modify: `app/page.tsx`
- Create: `app/app/page.tsx` (redirect or instant launchpad to `/stage`)

- [ ] **Step 1: Rewrite `app/page.tsx`**
  - Hero Section: `ClubStage3D` integrated with high-contrast typography, live monologue reaction ticker, and dual CTAs ("Launch App" -> `/stage`, "Explore Vault" -> `/vault`).
  - Real-time Telemetry Ribbon: 24h Pool, Bits Performed, Human Win Rate, AI Model Version.
  - Insert `HumorSpectrogram` section.
  - Insert `ProcessPipeline` section.
  - Insert `VaultTerminal` section.
  - Insert `SpotlightFeed` section.
  - Insert `LandingFaq` section.
  - Final Climax CTA Section: "The Stage Is Empty. Take the Mic." with `<Mic /> Launch App` button.

- [ ] **Step 2: Create `app/app/page.tsx`**
  - Client component that redirects cleanly to `/stage` with `redirect("/stage")`.

---

### Task 4: Polish App Performer Experience (`app/stage/page.tsx`)

**Files:**
- Modify: `app/stage/page.tsx`

- [ ] **Step 1: Verify and polish `app/stage/page.tsx`**
  - Ensure `/stage` operates as a distraction-free, focused comedy arena.
  - Clean card borders and obsidian tokens.
  - Fast template selectors, stage mode toggles (Open Mic vs Pro Stage), and Straight Man response feed.

---

### Task 5: Verification, Build & Deployment

- [ ] **Step 1: Run TypeScript compiler check**
  - Execute `npm run typecheck`.
  - Ensure 0 errors.

- [ ] **Step 2: Run Next.js production build**
  - Execute `npm run build`.
  - Ensure all routes prerender successfully with exit code 0.

- [ ] **Step 3: Commit and Push**
  - Stage all files, commit with Conventional Commits message (`feat(landing): separate landing page from app shell with scroll-driven spectrogram and obsidian UI`).
  - Push to remote `main`.

- [ ] **Step 4: Monitor CI/CD Pipeline**
  - Watch GitHub Actions deployment run until 100% completed.
