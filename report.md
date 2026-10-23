# HAHA: AI Comedy Lab - Project Report & Architecture Overview

**Autonomous AI Comedy Benchmark & Proof-of-Humor Arena on Robinhood Chain (EVM Mainnet 4663)**

- **Web Application:** https://hahastage.xyz
- **The Stage (Open Mic):** https://hahastage.xyz/app?tab=stage (or `/stage`)
- **The Crowd (Blind Jury):** https://hahastage.xyz/app?tab=crowd (or `/crowd`)
- **TipJar (Merkle Payouts):** https://hahastage.xyz/app?tab=tipjar (or `/tipjar`)
- **The Joke Vault:** https://hahastage.xyz/app?tab=vault (or `/vault`)
- **Enterprise Producers:** https://hahastage.xyz/producers
- **Contracts Registry:** https://hahastage.xyz/contracts
- **GitHub Repository:** https://github.com/HAHAlabstech/haha (branch `main`)
- **X (Twitter):** https://x.com/HAHAstage

---

## 1. Project Description

**HAHA** is the world's first decentralized benchmark for computational humor and human comedic intuition, deployed natively on **Robinhood Chain (EVM mainnet 4663)**. The protocol turns comedy into an objective, incentivized on-chain frontier where human creators test original material against an artificial intelligence, a double-blind crowd decides what is genuinely funny, and verified commercial cashflow rewards the winning human wit.

Two autonomous rails power the protocol:

1. **Proof-of-Humor Arena & Crowd Consensus Rail:**
   Human comedians enter the Open Mic Stage to author original jokes structured across *Premise*, *Setup*, *Punchline*, and *Subtext*. They battle **The AI Straight Man** (powered by high-throughput Opus 5.5), which generates immediate literal explanations or deadpan rebuttals in under 800ms. Both human and AI punchlines undergo automated A/B style normalization to strip syntactic tells, punctuation quirks, and formatting signatures before entering the double-blind crowd pool. Human jurors pass a 10-bit calibration gauntlet (requiring 8/10 accuracy) and review normalized punchlines head-to-head. Bits that decisively beat the machine receive consensus scores and achieve the coveted `killed_it` designation.

2. **Commercial Licensing & Autonomous Settlement Rail:**
   AI research labs and media studios license high-nuance RLHF humor benchmark datasets through `ProducerGateway.sol` ($500 to $2,500 USDG). Contract-enforced fee splits direct 40% to protocol operations, 30% directly to the community TipJar, 10% to original comedian royalties, and 20% to the buyback reserve. The background keeper cluster compiles verified on-chain USDG funding into cumulative double-hashed Merkle trees (`TipJar.sol`). Following a 24-hour verification timelock, rewards are activated permissionlessly, enabling creators and calibrated jurors to claim accumulated USDG directly to their Web3 wallets with a single EIP-712 signature.

All core product contracts are fully deployed and active on Robinhood Chain Mainnet (`4663`).

---

## 2. Core Value Proposition & Problem Solved

### The Problem

- **The Cognitive Frontier of AI Humor:** Sarcasm, cultural subtext, misdirection, and comedic timing represent the highest hurdle for large language models. Existing benchmarks rely on static, memorized academic sets that lack real-time human intuition.
- **Bot-Infested Web3 Governance:** Traditional on-chain curation and token voting are systematically exploited by sybil swarms, click farms, and uncalibrated bot voters.
- **Unbacked Token Ponzi Schemes:** Most SocialFi and gaming protocols rely on inflationary token minting to pay users, inevitably collapsing when secondary market hype fades.
- **Evaluation Fingerprint Bias:** When humans compare human writing against AI, formatting quirks (capitalization, commas, markdown quotes) bias the evaluation regardless of the actual humor.

### The HAHA Solution

- **Objective Proof-of-Humor Benchmark:** Creates the first dynamic, adversarial testing ground for humor comprehension, generating authenticated preference pairs for frontier AI post-training.
- **Double-Blind A/B Normalization:** Both human punchlines and AI rebuttals are stripped of formatting fingerprints and normalized into uniform neutral prose before being served to jurors.
- **Calibration Gauntlets & Plant Checks:** Jurors must prove comedic discernment on a 10-question calibration gate (80% score threshold) and are continuously checked against randomized honeypot bits, guaranteeing voting quality without requiring expensive stake barriers.
- **Real Commercial Cashflow Settlement:** Reward pools are backed strictly by verified on-chain USDG revenue from enterprise dataset sales. If the TipJar receives no external funding, no unbacked tokens are printed.
- **Gas-Efficient Cumulative Merkle Distribution:** Instead of expensive individual on-chain transactions, `TipJar.sol` utilizes cumulative Merkle trees (`keccak256(keccak256(account, cumulativeMicro))`) with a 24-hour verification delay, ensuring zero gas waste and permanent claimability.

---

## 3. End-to-End Application Flow

```text
[Human Comedian]                     [Enterprise Producer / AI Lab]
       │                                            │
       ▼                                            ▼
1. The Stage (/stage)                      4. Dataset Licensing (/producers)
   ├── Auth via SIWE (EIP-4361)               ├── Select Snapshot Tier ($500-$2,500)
   ├── Input Premise, Setup, Punchline        ├── Pay USDG via ProducerGateway.sol
   └── Trigger The AI Straight Man            └── Splits: 40% Ops, 30% TipJar, 10% Royalties
       │                                            │
       ▼                                            │
2. Machine Processing (Worker Cluster)              │
   ├── Opus 5.5 Generates Straight Man Take         │
   ├── A/B Style Normalizer Neutralizes Prose       │
   └── Queue Bit for Blind Crowd Pool               │
       │                                            │
       ▼                                            │
3. The Blind Crowd (/crowd)                         │
   ├── Juror Passes 10-Case Calibration Quiz        │
   ├── Evaluates Blind Option A vs Option B         │
   ├── Honeypot / Plant Validation Check            │
   └── Outcome Scored: killed_it vs bombed          │
       │                                            │
       └──────────────────┬─────────────────────────┘
                          │
                          ▼
5. Keeper Settlement Engine (worker/dailySettlement.js)
   ├── Reconcile Verified On-Chain USDG Receipts
   ├── Aggregate Comedian Points + Juror Calibration Weights
   ├── Construct Double-Hashed Cumulative Merkle Tree
   └── Call TipJar.proposeRoot() with 24h Timelock
                          │
                          ▼
6. Autonomous Payout Portal (/tipjar)
   ├── Timelock Expires -> Anyone Calls activateRoot()
   └── Comedians & Jurors Execute One-Click EIP-712 USDG Claims
```

---

## 4. Key Architectural Components

### A. Smart Contracts (`contracts/src/`)

- **`HAHA.sol` (`0xd2Da320EF90FB76809587C830A33a49512bA90D9`):**
  Fixed-supply ERC-20 product token capped permanently at 1,000,000,000 HAHA. Contains zero minting capabilities, zero taxes, and clean standard transfer mechanics.
- **`CrowdStaking.sol` (`0xe861a2c5d2114A76779d91d416c750bE7D3f7d88`):**
  Staking escrow bound to standalone HAHA for future tiered perks and extra-bit submission limits.
- **`TipJar.sol` (`0xda4762e4205aFf2d8CB9177cDcE6d69A23068bbE`):**
  Cumulative Merkle payout engine for verified USDG rewards. Enforces a strict 24-hour challenge delay between root proposal and activation. Verifies claims via double-hashed leaves (`keccak256(keccak256(account, cumulativeMicro))`), eliminating double-spend vulnerabilities while allowing users to claim across multiple epochs in a single transaction.
- **`ProducerGateway.sol` (`0x71826870a70064F0657EF527AFd9d1029Ae950de`):**
  Enterprise payment gateway for B2B dataset purchases. Automatically splits incoming USDG payments into 40% operations treasury, 30% TipJar reward pool, 10% comedian royalty reserve, and 20% buyback reserve.
- **`VaultRegistry.sol` (`0x27e5ADf5F3BfEBFA7B7B81619CA68a97CD1866D6`):**
  Immutable on-chain anchor recording SHA256 and keccak256 hash roots of published dataset snapshots and canonical joke vaults.
- **`USDG` (`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`):**
  Canonical native stablecoin dependency (6 decimals) on Robinhood Chain Mainnet utilized for all commercial purchases and reward payouts.

### B. Distributed Worker & Keeper Engine (`worker/`)

- **Redis 7 + BullMQ Queue Architecture:**
  - `straightman.js`: Dispatches prompt execution to the low-latency AI Straight Man engine.
  - `prescreen.js`: Immediate content safety, PII detection, and policy filter gate.
  - `normalize.js`: A/B style normalization eliminating punctuation and stylistic hints.
  - `dailySettlement.js`: Autonomous daily keeper validating on-chain receipts, calculating pro-rata comedian and juror allocations, and generating the cumulative Merkle tree.
  - `fiveMinuteOps.js`: Continuous chain listener checking for B2B payment events, pool balances, and queue health.
  - `seasonUpgrade.js`: Bi-weekly season compiler running holdout evaluations (n>=200, delta>=+3%, p<0.05) to upgrade AI Straight Man playbooks.
- **Data Persistence:**
  - PostgreSQL 16 database with `pgvector` indexing for HNSW cosine similarity semantic deduplication, anti-plagiarism checks, and prompt holdout sets.

### C. Web Application & Frontend (`app/`, `components/`)

- **App Router & Client Architecture:**
  - Next.js 16 App Router with React 19, Turbopack, and TypeScript strict mode.
  - Custom EIP-6963 multi-wallet connector supporting MetaMask, Rabby, Coinbase Wallet, Rainbow, and WalletConnect with automatic account switching and balance telemetry.
  - SIWE (EIP-4361) cryptographic session management with anti-bot protection.
  - Dedicated interactive views for The Stage, The Crowd, TipJar, Joke Vault, Contracts Registry, and B2B Producers.
  - Strict zero-deception copy: rewards explicitly tied to verified USDG inflows, with transparent notices that payouts require active funded epochs.

---

## 5. Technology Stack

- **Smart Contract Language:** Solidity `0.8.24` (Cancun EVM, Foundry Forge test suite, 80/80 tests passing)
- **Blockchain Network:** Robinhood Chain Mainnet (`Chain ID: 4663`)
- **Mainnet RPC Endpoint:** `https://rpc.robinhoodchain.com`
- **Block Explorer:** `https://robinhoodchain.blockscout.com`
- **Web3 EVM Client:** Viem 2.x, Wagmi, EIP-712 typed data hashing, EIP-4361 (SIWE)
- **Frontend Framework:** Next.js 16.4.2 (App Router), React 19, TypeScript 5 (Strict)
- **Styling & UI:** Tailwind CSS v4, Radix UI primitives, Lucide Icons, Canvas Visualizers
- **AI Straight Man Engine:** Low-latency Opus 5.5 model execution with thinking enabled for Pro Stage
- **Database & Vector Engine:** PostgreSQL 16 with `pgvector` (HNSW cosine similarity)
- **Queue & Worker Engine:** Redis 7 + BullMQ distributed background workers
- **Decentralized Storage:** Cloudflare R2 (S3-compatible immutable storage for dataset snapshots and share cards)
- **Production Server:** Self-hosted Ubuntu 24.04 LTS VPS (`43.134.60.117`), Docker Compose, Caddy TLS reverse proxy
- **Automated CI/CD:** GitHub Actions (linting, 45 unit/regression tests, typecheck, Docker build-push, SSH deploy)

---

## 6. Live Mainnet Contract Addresses (Robinhood Chain 4663)

| Contract Name | Symbol / Role | Deployed Address | Explorer Link | Status |
|---|---|---|---|---|
| **HAHA Token** | `HAHA` | `0xd2Da320EF90FB76809587C830A33a49512bA90D9` | [Blockscout](https://robinhoodchain.blockscout.com/address/0xd2Da320EF90FB76809587C830A33a49512bA90D9) | Active · Standalone fixed 1B supply |
| **CrowdStaking** | `STAKING` | `0xe861a2c5d2114A76779d91d416c750bE7D3f7d88` | [Blockscout](https://robinhoodchain.blockscout.com/address/0xe861a2c5d2114A76779d91d416c750bE7D3f7d88) | Active · Bound to standalone HAHA |
| **TipJar** | `USDG CLAIMS` | `0xda4762e4205aFf2d8CB9177cDcE6d69A23068bbE` | [Blockscout](https://robinhoodchain.blockscout.com/address/0xda4762e4205aFf2d8CB9177cDcE6d69A23068bbE) | Active · 24h timelocked Merkle claims |
| **ProducerGateway** | `B2B GATEWAY` | `0x71826870a70064F0657EF527AFd9d1029Ae950de` | [Blockscout](https://robinhoodchain.blockscout.com/address/0x71826870a70064F0657EF527AFd9d1029Ae950de) | Active · 40/30/10/20 USDG fee split |
| **VaultRegistry** | `VAULT` | `0x27e5ADf5F3BfEBFA7B7B81619CA68a97CD1866D6` | [Blockscout](https://robinhoodchain.blockscout.com/address/0x27e5ADf5F3BfEBFA7B7B81619CA68a97CD1866D6) | Active · Snapshot root anchoring |
| **USDG** | `USDG` | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` | [Blockscout](https://robinhoodchain.blockscout.com/address/0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168) | Active · Canonical 6-decimal stablecoin |

*Note: Auxiliary contracts (FeeSplitter, MicDrop, V4BuybackAdapter) remain deployed on mainnet but are currently kept in HOLD state until automated DEX liquidity cutover.*

---

## 7. Security, Trust & Risk Controls

1. **Non-Custodial Payouts:**
   User funds and reward claims are never held in custodial server wallets. All payouts are executed directly from `TipJar.sol` to the claimant's connected address via cryptographic EIP-712 proofs.
2. **Verified Inflow Gate:**
   Reward epochs cannot be manufactured out of thin air. The keeper requires real, verified on-chain USDG transfer events emitted by `ProducerGateway.sol` before allocating funds to any Merkle tree.
3. **24-Hour Challenge Timelock:**
   Every proposed Merkle root must wait out a full 24-hour on-chain delay before activation. This allows the community and participants to challenge or inspect any discrepancy before claims open.
4. **Cumulative Double-Hashed Leaves:**
   Leaves are structured as `keccak256(keccak256(account, cumulativeMicro))`. Because earnings are cumulative, earlier unclaimed amounts are preserved across epochs without risk of double-claiming or expired funds.
5. **Anti-Fingerprint Evaluation Integrity:**
   Double-blind normalization strips syntactic markers, markdown artifacts, and characteristic AI formatting before bits reach jurors, ensuring pure evaluation of comedic content.
6. **Calibration Quizzes & Plant Detection:**
   Juror quality is continuously guarded by a mandatory 10-bit calibration onboarding gauntlet and randomized honeypot bits, mitigating click-farm farming without introducing paywalls.
7. **Fixed Supply & Zero Inflation:**
   `HAHA.sol` is capped at 1,000,000,000 tokens with zero minting functions, zero tax mechanisms, and no hidden owner backdoors.
8. **Automated Verification:**
   Continuous integration mandates 100% pass rates across 80 Foundry smart contract test suites, 45 full-stack Node.js/TypeScript regression suites, strict TypeScript typechecking, and automated Docker healthcheck probes before any deployment.
