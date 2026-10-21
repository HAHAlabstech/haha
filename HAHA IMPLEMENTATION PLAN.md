# HAHA — Master Implementation Plan (VPS Single-Box, Testnet-First & Zero-Touch Spec)

> **Dokumen Pendamping Resmi:** `haha.md` (Developer Brief) & `haha-narrative.md` (Narrative & Video Script)
> **Tagline Produk:** *"Tell a joke that fools the AI and get paid."* (haha.md + haha-narrative.md)
> **Prinsip Arsitektur (satu VPS, Lighthouse Singapore 2vCPU/2GB/40GB `43.134.60.117`):**
> 1. **Docker Compose di VPS (testnet & mainnet sinkron, ganti env):** `app` (Next full SSR + API) + `db` (Postgres 16 + pgvector, tuned 2GB + swap) + `redis` (BullMQ) + `worker` (AI/embed/Merkle/sweep) + `caddy` (TLS + reverse proxy). Serverless-Free DIBUANG total (tanpa Pages/Workers/Hyperdrive/Edge/Actions-cron). Tanpa kuota invocation/CPU/bundle.
> 2. **Dua Key (hot/cold, tanpa multisig — keputusan sadar):** hot di VPS env (keeper harian: PROPOSER + slash-escrow capped); cold OFFLINE = GUARDIAN + admin (veto, param). Delay 24h + Telegram (testnet 10 mnt).
> 3. **Launch via UI Pons oleh tim eksternal (K3):** FeeSplitter deploy + verifikasi dulu, rehearsal dummy, checklist Lampiran A, verifikasi pasca-launch sebelum confirm. Pair USDG, buyback OFF, exempt tambahan kosong, dev-buy dilarang di blok launch.
> 4. **Zero-Touch kecuali gate listed (§4.9):** BullMQ otonom; manual: riset pricing, seed, invoice/KYC, alert gas, veto darurat, patch OS + snapshot.
> 5. **Testnet-First:** 8 skenario di **46630** sebelum **4663**(haha.md).
> 6. **Timeline:** 72 jam = spike TESTNET inti; full = minggu 2–4. VPS: SSH-key only + firewall + auto-renew ON (expiry 2027-10-16).

---

## Daftar Isi

1. Arsitektur VPS Single-Box (Docker Compose)
2. Konfigurasi Jaringan Dual-Stage (Testnet `46630` & Mainnet `4663`) & AI MiMo 2.6 Pro
3. Mekanisme Hot/Cold Key, Launch Pons, & Zero-Touch Automation
4. Ketetapan Final (Locked kecuali beta + pricing BUTUH sign/riset + deviasi §4.11)
5. Spesifikasi Smart Contracts (Production Suite + Testnet Mock Suite)
6. Skema Database (Prisma + pgvector HNSW Docker) + BullMQ Scheduler
7. Pipeline AI, R2 Storage, & Endpoint Next.js (VPS)
8. Protokol Pengujian End-to-End di Robinhood Chain Testnet (`46630`)
9. Timeline Eksekusi 3 Hari (72-Hour Granular Build Plan)
9b. Annex Referensi Comot (kentir / sCRIT / veil)
10. Template `.env.example` Lengkap (Testnet & Mainnet)

---

## 1. Arsitektur VPS Single-Box (Docker Compose)

Kembali ke `haha.md` (§13) yang asli — Redis + BullMQ + Postgres + S3(haha.md) — dijalankan di 1 VPS (tanpa serverless, tanpa kuota):

| Komponen Sistem | Spesifikasi Awal (`haha.md` §13) | Implementasi Final (VPS `43.134.60.117`) | Alasan Teknis & Keunggulan |
|---|---|---|---|
| **Frontend & Backend API** | Next.js + Node.js API + Python FastAPI terpisah(haha.md) | **Next.js 15 full SSR (`output: standalone`) di Docker `app` + Caddy TLS** | SSR + API routes + `next/og` normal. Tanpa batas CPU/bundle/invocation. |
| **Antrean & Worker** | Redis + BullMQ(haha.md) | **Redis 7 + BullMQ di Docker `worker`** (AI MiMo, embed, normalisasi A/B, kartu share, sweep/claim, Merkle) + tabel `CronJobRun` + retry/backoff | Sesuai brief asli. Job berat (Merkle 500+, embed batch 32) jalan normal. |
| **Job Terjadwal (Scheduler)** | Worker BullMQ 24/7(haha.md) | **BullMQ repeatable jobs** (`five-min-ops */5`, settlement harian, vault mingguan, season 14-harian, sync-chain) + systemd fallback. GitHub Actions HANYA CI/CD deploy (bukan cron). | Presisi detik, tanpa slot 5-cron, tanpa delay Actions. |
| **Database & Vector Search** | PostgreSQL + `pgvector`(haha.md) | **Postgres 16 + `pgvector` HNSW di Docker `db`** (volume SSD + tuned 2GB + swap 2GB; PITR: `pg_dump` harian ke R2 + snapshot VPS + drill). Prisma `migrate deploy` dari CI/laptop. | Tanpa pause/IPv6/backup drama Supabase. HNSW `<=>` lokal. |
| **Model Embedding (384-dim)** | Service Python FastAPI(haha.md) | **Transformers.js `Xenova/all-MiniLM-L6-v2` pinned 384 di `worker`** (RAM transient OK di 2GB) + fallback `gte-small` bila OOM | Batch 32 normal, cache `Bit.embedding`. |
| **Object Storage (S3)** | S3-compatible storage(haha.md) | **Cloudflare R2 via S3-API** (kartu share publik + snapshot `.enc` + `pg_dump` + dataset; presigned 24h Producer) | Zero egress, di luar VPS (backup survive box mati). |
| **Verifikasi Manusia & Anti-Bot** | Verifikasi manusia ringan(haha.md) | **Cloudflare Turnstile (free) + Device/Funding Fingerprint (bobot)** | Sama. |
| **Ops VPS (wajib hari-0)** | — | **SSH-key only + UFW + fail2ban + auto-renew ON + snapshot baseline + uptime monitor + logrotate** | Box tembus internet; expiry 2027-10-16 jangan sampai mati. |

---

## 2. Konfigurasi Jaringan Dual-Stage (Testnet `46630` & Mainnet `4663`) & AI MiMo 2.6 Pro

### 2.1 Parameter Jaringan Robinhood Chain (Testnet vs Mainnet)
Aplikasi menggunakan variabel `NEXT_PUBLIC_CHAIN_ENV="testnet" | "mainnet"` untuk memilih jaringan secara dinamis di `viem` (raw, tanpa wagmi) dan script Foundry:

| Parameter | Stage 1: Robinhood Chain Testnet (Uji Wajib) | Stage 2: Robinhood Chain Mainnet (Produksi) |
|---|---|---|
| **Chain Name** | `Robinhood Chain Testnet` | `Robinhood Chain`(haha.md) |
| **Chain ID** | `46630` | `4663`(haha.md) |
| **Native Gas Token** | `ETH` (Saldo Testnet ETH tersedia di wallet dev) | `ETH`(haha.md) |
| **RPC Endpoint (3 lapis: Alchemy → publicnode → public)** | `robinhood-testnet.g.alchemy.com` → `robinhood-sepolia-rpc.publicnode.com` → `rpc.testnet.chain.robinhood.com` | `robinhood-mainnet.g.alchemy.com` → `robinhood-rpc.publicnode.com` → `rpc.mainnet.chain.robinhood.com` |
| **Block Explorer** | `https://explorer.testnet.chain.robinhood.com` (docs.robinhood.com/chain) | `https://robinhoodchain.blockscout.com` |
| **Blockscout API v2** | `https://explorer.testnet.chain.robinhood.com/api/v2` | `https://robinhoodchain.blockscout.com/api/v2` |

> Real-now (docs.robinhood.com/chain/connecting + alchemy.com + verified 16 Okt 2026 via publicnode): Alchemy recommended provider (Data API/Bundler/Gas/AA). Public RPC rate-limited. **Terbukti dari sandbox: official `rpc.*.chain.robinhood.com` TLS-fail + Blockscout CF-403, sedangkan `publicnode.com` OK (`eth_chainId` 0xb626/0x1237 cocok).** Jadi urutan `viem/fallback`: Alchemy → publicnode → public. Wallet deployer `0xAeA6…B651` per 16 Okt: testnet ~0.0021 ETH (nonce 2), mainnet ~0.032 ETH (nonce 0, USDG 0) — tambah dana sebelum deploy 12 kontrak + launch fee.

### 2.2 Alamat Kontrak Kandidat Mainnet (`4663`, WAJIB pre-flight) vs Mock Testnet (`46630`)
> Semua alamat/URL/RPC/chain-ID/model-ID di bawah adalah KANDIDAT belum terverifikasi (kecuali USDG yang pun masih label verifikasi-ulang di haha.md). Jangan broadcast sebelum pre-flight lolos. Tanda (haha.md) hanya berarti konsepnya dari haha.md, bukan alamatnya.
Di Mainnet (`4663`), kontrak HAHA langsung berinteraksi dengan kontrak produksi Pons V2, USDG, dan Uniswap v4(haha.md). Di Testnet (`46630`), script deploy otomatis menggelar **Testnet Mock Suite** agar seluruh aliran uang, klaim fee, swap, dan burn dapat diuji secara riil di atas blockchain sebelum rilis Mainnet:

| Peran Kontrak | Alamat Mainnet Kandidat (`4663`, verifikasi-ulang wajib) | Kontrak Testnet (`46630`) |
|---|---|---|
| **USDG (6 Decimals)** | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` (kandidat, verifikasi-ulang) | `MockUSDG.sol` (`decimals() = 6`, fungsi `mintTest()`) |
| **Pons V2 Launch Factory** | `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e` (kandidat) | `MockPonsFactory.sol` (simulasi event launch `$HAHA`) |
| **Pons V2 Launch Router** | `0xe33E9E479dF8802cb0866d5d05258bEc4cF62948` (kandidat) | — |
| **Pons V2 Fee Escrow** | `0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e` (kandidat) | `MockPonsFeeEscrow.sol` (mendukung `claim()` & `claimToken()`) |
| **Pons V2 Meme Hook** | `0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044` (kandidat) | — |
| **Uniswap v4 PoolManager** | `0x8366a39CC670B4001A1121B8F6A443a643e40951` (kandidat) | — |
| **Uniswap Universal Router** | `0x8876789976dEcBfCbBbe364623C63652db8c0904` (kandidat) | `MockUniversalRouter.sol` (simulasi swap ETH↔USDG & USDG→`$HAHA`) |
| **Sablier Lockup (Vesting)** | Buktikan di dashboard Sablier hari-1; bila Robinhood tak didukung → `VestingWallet` OZ (fallback locked) | Uji tim opsional |

### 2.3 Xiaomi MiMo 2.6 Pro API (kunci + budget realistis)
- **Base:** `https://token-plan-sgp.xiaomimimo.com/v1`, OpenAI-SDK. **Key LOCKED: `tp-` Token Plan (verified 200, 16 Okt 2026; larangan tp- di-waive pemilik).**
- **Tarif real (Okt 2026): pro $0.435 in-miss / $0.87 out; ultraspeed $4.35/$8.7 (10×).** Ultraspeed HANYA jalur latensi (prescreen). Batch API 50% off untuk eval.
- **Reasoning = output berbayar. Pro Stage: budget token reasoning + JSON dipisah; `max_completion_tokens` harus muat reasoning + JSON (600 mepet → uji cutoff, naikkan bila JSON kepotong).**
- **Data: host China. Subtext personal + GDPR/PIPL: catat di `/rules`, opt-out = jangan submit. Baca User Agreement Xiaomi (klausul output) SEBELUM lisensi B2B — jawaban Straight Man = output MiMo yang dilisensikan; tanpa klausul jelas, Vault B2B tidak sah.**
- **Base URL:** `https://api.xiaomimimo.com/v1` (menggunakan `openai` Node SDK).
- **Header:** `Authorization: Bearer process.env.MIMO_API_KEY`.
- **Pengaturan Peran Model:**
  1. **Pre-Screen & Moderasi:** `mimo-v2.6-flash` primary (S2: $0.14/$0.28 vs ultraspeed $4.35/$8.70 — ultraspeed HANYA bila latensi terbukti masalah), fallback `mimo-v2.6-pro`, thinking disabled, temp 0.1, JSON.
  2. **The Straight Man:** Open Mic = `mimo-v2.6-pro` thinking-disabled temp 0.3 (cepat/murah). **Pro Stage = `mimo-v2.6-pro` thinking-enabled temp 0.7, max 600 token, cache-prefix playbook** (kuat, mahal — subs aman). Keduanya JSON `{answer,reasoning,confidence}`. **T13: simpan `model_version` + hash respons per jawaban (`StraightManAnswer.model_version/response_hash`); regresi holdout otomatis bila upstream berubah (V2.5 pensiun 21 Okt 2026 — jadwalkan monitor deprecation).**
  3. **Normalisasi Gaya A/B (Blind Crowd)(haha.md):** `mimo-v2.6-flash` (ultraspeed 10× lipat — HANYA prescreen latensi), thinking disabled, temp 0.2.
  4. **Observability Logger & Season Playbook Compiler(haha.md):** `mimo-v2.6-pro`, `extra_body: { thinking: { type: "enabled" } }`, `temperature: 0.7` (hanya tulis log penalaran banding + ekstrak pola kekalahan AI untuk playbook; tidak memutus banding — banding diputus via Crowd Retrial 7 juri).

---

## 3. Mekanisme Hot/Cold Key, Launch Pons, & Zero-Touch Automation

### 3.1 Alur 1 Wallet Dev (`OPERATOR_WALLET`) + External Pons Deployer
1. **Dua Key (hot/cold, tanpa multisig — keputusan sadar):** hot `OPERATOR_PRIVATE_KEY` (VPS env, keeper BullMQ harian) = **ROOT_PROPOSER + slash-ke-escrow capped** (TIDAK bisa finalisasi root, TIDAK bisa burn slash). Cold OFFLINE = **GUARDIAN (veto `pendingRoot`) + `DEFAULT_ADMIN`**. Konstruktor beri `DEFAULT_ADMIN` ke alamat cold, deployer renounce. Delay 24h + alert Telegram tiap pendingRoot (testnet: 10 mnt). Wallet ini menjadi:
   - Deployer 6 kontrak (`FeeSplitter`, `TipJar`, `MicDrop`, `CrowdStaking`, `VaultRegistry`, `ProducerGateway`)(haha.md), lalu renounce (admin = cold),
   - Hot pegang `ROOT_PROPOSER` + keeper slash-capped; cold pegang `DEFAULT_ADMIN` + veto guardian(haha.md),
   - Penerima langsung **40% pendapatan lisensi B2B Producers** (porsi operasional & compute)(haha.md),
   - Penanda tangan otomatis untuk seluruh cron job harian dan mingguan.
2. **Launch `$HAHA` via UI Pons oleh tim eksternal (K3 — tim SAMA dengan launcher $CRIT `0x3517…724d78f`, verified on-chain: sCRIT/CRIT 18des):** pola persis $CRIT, SATU beda parameter: pair **USDG** ($CRIT vs ETH; HAHA vs USDG agar fee langsung USDG). Creator wallet = **FeeSplitter**, tax = K2, buyback **OFF**, exempt tambahan **KOSONG**, TANPA launch-and-buy. Salah isi permanen — Lampiran A (2 orang + screenshot + rehearsal). Kontrak deploy + verifikasi DULU(haha.md). Pasca-launch cek `getLaunchedToken` + `getLaunchFeePolicy` + exempt nol; cocok -> propose (48h) -> confirm; tidak -> JANGAN confirm.
   - `FeeSplitter` USDG-only: sweep -> klaim USDG, split 70/30 micro-exact(haha.md).
   - `/api/cron/sync-chain` verifikasi `launchTxHash` Pons (feeRecipient==splitter, pool graduated + hook) lalu `propose→confirmHahaToken` 48h. BUKAN auto-detect klaim pertama (anti-spoof). Pre-graduasi MicDrop HOLD.

### 3.2 Matriks 100% Zero-Touch (Penghapusan Seluruh Pekerjaan Manual)
| Proses Operasional | Cara Sistem Menjalankannya Secara 100% Otomatis |
|---|---|
| **Eksekusi Harian (`fee_claim`, `epoch_settlement`, `mic_drop`)(haha.md)** | BullMQ `daily-settlement` 00:00 UTC → stage `CronJobRun` (sweep→claim→split→hitung→Merkle→proposeRoot); tx via hot key VPS env. Guardian veto 24h + Telegram. |
| **Isi Ulang Gas ETH `OPERATOR_WALLET`** | Didanai out-of-band dari porsi operasional 40% B2B (bukan dari creator fee). `FeeSplitter` tidak memotong fee untuk gas agar split 70/30 exact. Monitor saldo via `/api/cron/daily-settlement` (alert jika < 0.005 ETH). |
| **Pembuatan Soal Onboarding & Bank Soal `Plants` (Autonomous 2-Stage)(haha.md)** | Seed: `prisma/seed.ts` (10 onboarding + 50 Plants). Stage-1 kandidat otonom tiap hari via `daily-settlement`: bit final `killed_it/bombed` umur >7 hari, `is_holdout=false`, `is_plant_bank=false`, konsensus 7/7 (atau 5/5 bulat 100% + fair 1.0) → tandai `plant_candidate_at`. Stage-2 validasi otonom via `five-minute-ops`: buat 5 assignment validasi ke juri baru (exclude juri asli + akun terkait); promosi ke `is_plant_bank=true` hanya jika 5/5 setuju outcome asli + fair. Maks 5 promosi/hari, kandidat kedaluwarsa 30 hari. Tanpa klik manusia. |
| **Penanganan Banding (`Appeals`) & Laporan Moderasi (Crowd Retrial Otonom)(haha.md)** | **`POST /appeal` → `five-minute-ops` → retrial 7 juri baru:** Banding (1x per bit, hanya `bombed/heckled_off`) otomatis membuka ronde retrial 7 assignment ke juri baru (exclude juri ronde-1 + akun terkait). Final ikut threshold 60% yang sama. Menang → `Outcome` di-overwrite, reputasi dipulihkan, reward dihitung di epoch berjalan. Kalah → `comedian_rep -1` (anti-spam). AI hanya tulis log observabilitas, bukan hakim. Tanpa klik manusia. |
| **Slashing Juri Curang & Penyesuaian Stake `$HAHA`(haha.md)** | Otonom via `daily-settlement`: warning jika akurasi Plants <70% (min 10), slash escrow jika <60% (min 20 sampel, recoverable 14 hari). Update stake minimum mengikuti harga on-chain. |
| **Season Engine (MiMo-API max, bukan MVP-basah)(haha.md)** | **Compiler BullMQ tiap 14 hari (`season-upgrade`):** retrieval hybrid (HNSW + filter kategori/season + rerank), playbook prefix-statis (prompt-cache hit), canary 10% → full. Gate: holdout val n≥200 + Δ≥+3% + p<0.05 + rollback otomatis. Sampling post-`killed_it` 15%. DPO export tiap epoch (`ai_wrong vs comedian_right`) siap LoRA open-weight kapan pun. Eval berat via Batch API 50% off. |
| **Penjualan Dataset B2B (`/producers`), Pembagian 40/30/20/10, & Pengiriman File(haha.md)** | Pembeli membayar USDG langsung ke `ProducerGateway.sol`. Kontrak langsung mengirim **40% ke wallet kamu**, **30% ke `TipJar`**, **20% ke `MicDrop`**, dan **10% ke pool royalti Comedian di `TipJar`**(haha.md). Backend memverifikasi `tx_hash`, lalu otomatis menerbitkan API Key dan **Cloudflare R2 Presigned Download URL** (berlaku 24 jam). |

---

## 4. Ketetapan Final (Locked kecuali beta + pricing yang BUTUH sign/riset)

1. **Bahasa MVP:** Bahasa Inggris (`en`)(haha.md).
2. **Kuota Bit Gratis Harian, Syarat Kenaikan Tier Comedian, & `tier_mult`(haha.md):**
   - `open_mic`: **5 bit/hari** · `tier_mult = 1.00` (Default akun baru)(haha.md).
   - `opener`: **8 bit/hari** · `tier_mult = 1.07` (Syarat otomatis: ≥ 3 `killed_it` & rata-rata fairness ≥ 0.70)(haha.md).
   - `feature`: **12 bit/hari** · `tier_mult = 1.15` (Syarat otomatis: ≥ 10 `killed_it` & rata-rata fairness ≥ 0.75)(haha.md).
   - `headliner`: **18 bit/hari** · `tier_mult = 1.22` (Syarat otomatis: ≥ 25 `killed_it` & rata-rata fairness ≥ 0.80)(haha.md).
   - `legend`: **25 bit/hari** · `tier_mult = 1.30` (Syarat otomatis: ≥ 60 `killed_it`, fairness ≥ 0.85, mengalahkan ≥ 2 Season)(haha.md).
   - *Regulars Bonus:* Staker `$HAHA` aktif (minimal setara $25 USDG) mendapat **+3 kuota bit/hari**(haha.md).
   - *Referral Bonus (anti-farm):* invitee wajib 1x `killed_it` (bukan sekadar terverifikasi), `bonus_quota` maks 10, referrer↔referee lolos filter akun terkait (device/IP/funding beda), expire 90 hari(haha.md).
3. **Tier The Crowd (Juri), Kuota Penilaian Harian, & Bobot Suara(haha.md):**
   - `walk_in`: Maks **15 vote/hari** · Bobot suara `1.00x` (Lulus 8/10 kuis onboarding)(haha.md).
   - `regular`: Maks **30 vote/hari** · Bobot suara `1.15x` (≥ 20 vote konsensus & akurasi Plants ≥ 85%)(haha.md).
   - `front_row`: Maks **50 vote/hari** · Bobot suara `1.30x` (≥ 60 vote konsensus & akurasi Plants ≥ 90%)(haha.md).
   - `critic`: Maks **80 vote/hari** · Bobot suara `1.50x` (≥ 150 vote konsensus & akurasi Plants ≥ 95%; batas maksimum sesuai brief adalah 1,5x)(haha.md).
4. **Aturan Kuorum Juri (5 ke 7 Juri) & Perhitungan Suara Kanonis (weighted)(haha.md):**
   - Setiap bit `disputed` ditugaskan ke **5 juri** (SLA 30 menit per penugasan)(haha.md). Snapshot `vote_weight` tier saat vote (walk_in 1.00 / regular 1.15 / front_row 1.30 / critic 1.50) ke `CrowdAssignment.vote_weight`.
   - `W_total = Σ w` semua vote masuk. `W_comedian` = Σ w vote posisi Comedian. `W_ai` = Σ w vote posisi AI + Σ w `both_right`. `W_wrong` = Σ w `both_wrong` (masuk denominator, tidak ke pembilang).
   - `win_strength = W_comedian / W_total`. `fair_ratio = W_fair / W_total` (fair/unfair juga weighted; `both_right/both_wrong` tetap dihitung di `W_total` fair).
   - **Urutan evaluasi (kunci):** (1) jika <5 vote → tunggu; (2) jika 5 vote dan (`0.50 ≤ win < 0.65` OR `0.50 ≤ fair < 0.65` OR `0.35 < fair ≤ 0.45` zona-tipis heckled) → buka 2 slot tambahan (total 7, T11: vonis heckled_off 2-vs-3 tidak final di 5 suara) dan JANGAN finalisasi; (3) final hanya setelah 7 vote lengkap atau 5 vote non-tipis.
   - **Keputusan Final(haha.md):**
     - `killed_it`: `win_strength >= 0.60` **DAN** `fair_ratio >= 0.60`(haha.md).
     - `heckled_off`: `fair_ratio <= 0.40`(haha.md).
     - `bombed`: lainnya(haha.md).
   - Contoh thin valid: 3C (w=1.0) vs 2AI → win=0.60 → expand ke 7. Contoh (2C,2AI,1 wrong) win=0.40 → bukan thin dari win (hanya expand jika fair juga thin).
5. **Konversi Poin Beta — BUTUH PERSETUJUAN PEMILIK (jangan anggap locked)(haha.md):**
   - Opsi yang diusulkan: 15% inflow TipJar 7 epoch pertama → pemilik poin, diambil dari pool Comedian 80% (Crowd 20% tidak dipotong), per-akun cap tetap 5%, unclaimed expire 90 hari. Risiko regulasi dicatat. JANGAN implement sampai pemilik sign.
6. **Harga Acuan Replacement Cost (`VaultPricing`) & Price List B2B (preliminary, BUTUH RISET)(haha.md):**
   - `killed_it` = **$12.00 USD** / `bombed` = **$2.50 USD** / `heckled_off|rejected` = **$0.00** — status **PRELIMINARY**, tampil dengan badge "preliminary · methodology →" sampai riset tarif vendor + `source_note` terisi di `/vault/method`(haha.md).
   - Price List `/producers` (enforced on-chain `planPriceMicro[planType]`, backend tolak `amount < price`): **Snapshot $2,500 / Subscription $1,000 / Eval $500 / Theme Night min $500 USDG**(haha.md). **S3: copy publik "get paid" WAJIB kualifikasi variabel (pool dibagi pemenang, bukan janji nominal); kolom `stage` ikut ekspor dataset + harga Vault (killed-it Pro ≠ Open Mic).**
7. **Rumus Reward Epoch (locked, executable):**
   - `score = win_strength × fairness × stage_mult × tier_mult × category_mult`. `stage_mult`: open_mic 1.0 / pro 2.5 (Pro = thinking-on full, masuk holdout + dataset premium). `category_mult` default 1.0 maks 1.25.
   - `raw = pool × score / Σscore` (micro integer, floor). Cap 5% **per akun** (agregat semua bit akun itu): iterasi sampai tidak ada yang >cap (maks 5 iterasi); sisa tak terbagi → rollover ke pool epoch berikut (bukan hangus, bukan ke operator).
   - Klaim user-pays-gas (tanpa paymaster awal; Alchemy Gas Manager = jalur upgrade), dust $1 rollover. **K2 LOCKED 2% (16 Okt 2026, pemilik sign): creator tax = 200bps, 100% ke FeeSplitter (= ke wallet pemilik via split, NOL ke tim launcher). Inflow creator = fee dasar (1%, Pons ~0.30% dulu) + tax. Estimasi TipJar/hari per $100k volume ≈ $1.890 (creator 0.70%+2.00%=2.70%, TipJar 70%). Copy "get paid" + `/tipjar` wajib kualifikasi variabel.**
8. **Keputusan Operasional Locked:** epoch harian, pair USDG-only, gas out-of-band + alert Telegram, SIWE dulu, stake $25 configurable, **vesting tim LOCKED: cliff 12 bln + linear 24 bln via Sablier (fallback VestingWallet), wallet tim diumumkan pra-launch**.
8b. **Wallet Stack Locked (tanpa wagmi/rainbowkit — keputusan sadar):** `viem` mentah + EIP-6963 `wallets.ts` comotan (kentir/veil) + modal sendiri. Alasan: flow cuma connect/sign/vote/klaim, audit mudah, tanpa lock-in. `ethers` dilarang (duplikat viem); Privy/Dynamic post-MVP. Wagmi/rainbowkit hanya bila dApp reaktif kompleks nanti.
9. **Gate Wajib Sebelum Mainnet:** hukum/sanctions/geo, kill-switch, takedown/GDPR 30d, 50 Plants + 10 onboarding terjadwal, invoice/KYC manual, **audit Pons V2 final (belum selesai per Okt 2026 — baca ulang Security→Audits + cocokkan scope sweep/hook; docs bisa usang). UA Xiaomi: DITUTUP/waived pemilik 16 Okt 2026 (proyek ecek-ecek, risiko diterima).** **Backup: `pg_dump` PER JAM ke R2 (30d) + snapshot VPS + Merkle on-chain anchor. Restore = dump + replay. RPO JUJUR ~1 jam (dump per jam) — klaim 5 mnt DICABUT (T4). Drill 1× wajib.** 72h = TESTNET.
10. **Klaim Jujur (VPS):** tanpa kuota invocation/CPU/bundle; MiMo berbayar per token; box tunggal = snapshot + dump + monitor wajib; expiry 2027-10-16 + auto-renew ON.
11. **Register Deviasi Sadar dari `haha.md` (pemilik sudah putuskan, bukan kelalaian):**
    | # | Brief (`haha.md`) | Plan ini | Alasan + risiko diterima |
    |---|---|---|---|
    | D1 | §12: admin multisig + timelock + audit eksternal | Hot proposer + cold guardian + delay 24h + fuzz+coverage+preflight (tanpa audit eksternal di 72h) | Zero-touch + 1 dev. Risiko: hot bocor = propose jahat (bisa diveto); cold bocor = total. Diterima pemilik. |
    | D2 | §6 Fase 2: fine-tune LoRA 2–4 minggu | `mimo_playbook_max` selamanya (MiMo API weight closed, tidak LoRA-able) + DPO export siap open-weight | Tetap MiMo sesuai mau pemilik. Risiko: klaim "belajar" lemah → disclosed `/seasons`. |
    | D3 | §7/§16: banding panel Critic + admin; moderasi manusia | Retrial 7 juri baru otonom + AI cuma log; takedown/GDPR via cron 24h/30d | Tanpa manual sesuai mau pemilik. Risiko: putusan crowd bisa salah 2×. |
    | D4 | Season rilis manual-approve | Auto-rilis jika gate n≥200/Δ+3%/p<0.05 + rollback | Zero-touch. Risiko: regresi lolos → rollback otomatis. |
    | D5 | §13: Redis/BullMQ + FastAPI + S3 | Docker Compose VPS persis brief (app + db + redis + worker + caddy) | Tanpa Paid/kuota; risiko = jaga box (snapshot + dump + monitor). |
    | D6 | Straight Man netral | 2 meja: Open Mic weakened + Pro full ×2.5 | Disclosed di `/stage` (toggle) DAN `/seasons`. Tanpa label Stage = klaim "fool the AI" tidak auditable. |
    | D7 | §11.3: paymaster/AA diputuskan; §7 stake minimum diputuskan | User-pays-gas + dust $1 rollover; SIWE dulu (AA post-MVP); stake $25 configurable | Putuskan minimal agar executable; bisa diubah timelock. |

---

## 5. Spesifikasi Smart Contracts (Production Suite + Testnet Mock Suite)

Seluruh kontrak ditulis dengan **Solidity `0.8.24`** menggunakan **Foundry** dan **OpenZeppelin Contracts v5.0**(haha.md).

### 5.1 Kontrak Produksi Utama (`/contracts/src/`)

#### 1. `FeeSplitter.sol` (USDG-ONLY + SWEEP WAJIB, Keeper + Stale Fallback, 70/30 Exact)
- `feeRecipient` Pons V2, pair USDG, `buybackEnabled=false`. Hanya USDG yang diproses (T10: jalur swap ETH dihapus — dengan pair USDG fee selalu USDG; pintu ETH terpisah bila kelak dibutuhkan). Tidak ada withdraw selain split 70/30.
- **Sweep dulu baru claim (K1 — dependensi eksplisit, BUKAN mandiri; terverifikasi docs Pons 16 Okt 2026): baca `pendingFees` + `pendingCreatorTax` (hook) dan `quoteFeeBalance` + `creatorTaxBalance` (curve); panggil `sweepFees(minBuybackTokensOut=0)` di CURVE pre-graduasi / `sweepPoolFees(poolId, 0, 0)` di HOOK pasca-graduasi (BUKAN di escrow — escrow hanya pegang claimable), lalu `claimToken(USDC)`. Refs curve/hook/poolId diikat via timelock 48h pasca Lampiran-A (`proposeSetLaunchRefs`/`confirmSetLaunchRefs`); nol pra-launch = sweep skip.**
- **Pasca-graduasi bergantung operator Pons (K1, diterima sadar):** bila sweep butuh swap internal (`InternalSwapRequiresOperator`), hanya operator Pons bisa. `sync-chain` bandingkan pending vs claimable tiap jam; pending > 0 dan claimable diam > N jam (default 12) -> alert Telegram + skip epoch (jangan publish root kosong) + test "operator belum sweep". `/tipjar` tampilkan pending-belum-sweep (angka escrow saja menyesatkan).
- `harvestAndSplit(minUsdgOut, deadline)` keeper-only; `harvestStale(max 5k USDG, minOutBps <= 200)` permissionless bila `lastHarvest > 24h`. `setKeeper/setRouter` timelock 48h internal. Emit `FeeSplitExecuted`.

#### 2. `TipJar.sol` (Cumulative Merkle, micro-USDG uint256, OZ StandardMerkleTree double-hash)
- `merkleRoot`, `currentEpoch uint256` (di-bump stage root), `cumulativeClaimed[account] uint256` micro. **Leaf WAJIB double-hash (samakan kedua sisi, jika tidak proof selalu gagal): `keccak256(bytes.concat(keccak256(abi.encode(account, cumulativeMicroUsdg))))`** via `StandardMerkleTree.of()` + `MerkleProof.verify()` OZ (pinned versi sama). DILARANG single-hash. BigInt only.
- `proposeRoot(epoch, newRoot)` hanya hot PROPOSER → `pendingRoot + eta (+24h, testnet 10 mnt)` + alert Telegram. `activateRoot()` siapa pun setelah eta; cold GUARDIAN boleh `vetoRoot()` kapan pun pre-eta. **Verifier independen T14 (host terpisah, read-only): sebelum eta, hitung ulang root dari R2 tree + cek invarian (total ≤ saldo+inflow, kumulatif tak turun, cap 5%/akun); hanya alert — veto tetap guardian. Guardian BUKAN zero-touch (tulis jujur).**
- Cap 5%/akun/epoch = hitung BACKEND (kontrak tak tahu kenaikan per-epoch karena klaim multi-epoch). Kontrak jaga: `activateRoot` tolak bila `totalCumulative > saldo + inflow` dan `claim` dibatasi % saldo per tx.
- EIP-712 domain: `name=HAHA-TipJar, version=1, chainId, verifyingContract=TipJar`. `nonces[account] uint256`, `deadline = block.timestamp + 1h` maks. `claim(account, recipient, cumulativeMicro, deadline, nonce, sig{v,r,s}, proof)`: cek sig + nonce++ (anti-replay), `payout = cumulative - claimed`(haha.md).

#### 3. `MicDrop.sol` (Graduation-Gated Buyback & Burn, fee-aware)
- `usdg/router/hahaToken/poolGraduated`. Pre-graduasi: HOLD USDG (cap 50k, overflow revert + alert). `poolGraduated` hanya via `sync-chain` + bukti graduasi.
- `proposeHahaToken(token, poolKey, launchTxHash)` → `confirmHahaToken()` 48h; validasi: `feeRecipient==splitter` + pool graduated + hook cocok + **`pairToken==USDG` + `creatorTaxBps==200` + `buybackEnabled==false` (syarat sweep mandiri; jika true, sweep butuh operator Pons) + exempt list KOSONG (bukti tanpa-exempt, maks 32)** + `expectedEconomics` pin. Anti-spoof via launchTx.
- **Router Robinhood dimodifikasi: struct swap v4 ada `minHopPriceX36` — calldata SDK Uniswap standar REVERT. Pool $HAHA kena hook fee (1% + creator tax). Mock tidak menangkap ini → wajib fork-test mainnet lawan pool Pons graduasi + rancang `minHahaOut` setelah fee hook.**
- `executeBuyback(amountUsdg, minHahaOut, deadline)`: **cap proporsional, bukan nominal (T9): `amountUsdg <= 2% reserve pool ATAU price-impact <= 1%** (mana lebih kecil), `minHahaOut` dihitung SETELAH fee hook (1% + 2% kembali ke splitter). Uji di fork mainnet lawan pool Pons graduasi. Burn `0xdead`. Emit `MicDropBurned/Held`(haha.md).

#### 4. `CrowdStaking.sol` (Juror Staking, Cooldown 3 Hari, Auto-Slash Escrow & Extra Bit Stake)
- Mengelola `stake(uint256 amount)`, `initiateUnstake()`, `completeUnstake()` (cooldown 3 hari), dan `slash(address juror, uint256 amount, string calldata reason)` oleh `OPERATOR_WALLET` (`SLASHER_ROLE`)(haha.md). Slash masuk escrow (recoverable 14 hari via retrial menang), bukan burn langsung; auto-slash hanya jika akurasi Plants <60% dengan min 20 sampel + warning 1x.
- Mengelola `stakeForExtraBit(bytes32 bitId)` untuk Comedian di atas kuota; bisa ditarik kecuali `heckled_off` → sitaan dikirim ke `TipJar` (bukan burn)(haha.md).

#### 5. `VaultRegistry.sol` & `ProducerGateway.sol` (On-Chain Proof & B2B Checkout)
- `VaultRegistry.sol`: `publishSnapshot(entryCount, replacementMicroUsd uint256, merkleRoot, r2ManifestUri)` (micro, bukan dollars)(haha.md).
- `ProducerGateway.sol`: `purchasePlan(planType, amountMicroUsdg, orderId, batchId)` + `planPriceMicro[planType]` micro-USDG. UI: `approve(Gateway, amount)` dulu baru `purchasePlan`. `batchId = keccak(orderId, buyer, block.timestamp)` jika kosong. 40/30/10/20. Emit `ProducerPurchase`.
  - **40%** → `coldTreasury` (alamat cold/treasury, BUKAN hot wallet — T1: hot hanya float gas; USDG tidak menumpuk di key yang ada di VPS)(haha.md),
  - **30%** → `TipJar` (reward umum epoch berjalan)(haha.md),
  - **10%** → `TipJar` (royalti khusus Comedian kontributor batch `orderId`, dicatat sebagai `Reward.role = royalty`) — ditransfer dalam call terpisah agar terpisah di event, atau satu transfer 40% + breakdown di event,
  - **20%** → `MicDrop`(haha.md).
  - Emit `ProducerPurchase(orderId, batchId, operatorShare, tipJarGeneralShare, royaltyShare, micDropShare)`. Backend `/api/producers/activate` membaca event ini untuk alokasi Merkle: 30% ke pool umum, 10% pro-rata ke kontributor batch.

### 5.2 Mock Testnet (`46630`) + Pre-flight Mainnet Gate
Hanya testnet: `MockUSDG` (6 des) + `MockHAHA` (18 des 1B) + `MockPonsFeeEscrow` (`balanceOf/balanceOfToken/claim/claimToken/sweepFees/sweepPoolFees/pendingFees/pendingCreatorTax/simulateTradingFees`) + `MockPonsFactory` (launch event + `canLaunch`) + `MockUniversalRouter` (struct `minHopPriceX36` + hook-fee) + `MockPoolManager/MockPonsHook` (stub + failure injection). Mock membuktikan akuntansi SAJA — path v4-hook wajib fork-test mainnet.
**Pre-flight `DeployMainnet` (abort jika mismatch; stack diganti full-set, alamat bisa basi):** baca ulang docs terbaru + on-chain: `USDG.decimals()==6`, escrow `claim` selector + sweep fns, `quoteAsset`/pair approval, Router + PoolManager + hook + factory/deployer/executor/guard, Sablier (atau fallback `VestingWallet` OZ bila Robinhood tak didukung — buktikan di dashboard Sablier hari-1); bukti "exempt 2 = 0 tambahan + 2 otomatis" di `/tipjar`.

---

## 6. Skema Database (Prisma + pgvector HNSW Docker) + BullMQ Scheduler

### 6.1 Postgres Docker (`db` service: `pgvector/pgvector:pg16`, volume `pgdata`, lean-box tuned, swap 2GB)

```yaml
# docker-compose.yml (VPS 43.134.60.117) — testnet & mainnet ganti env file
services:
  # T1+T2+T5: HANYA caddy publish 80/443; app expose internal (Docker publish melewati UFW). Image DIBUILD DI CI + registry (jangan build di VPS 2GB — OOM). Memory limit/container; Redis AOF + `maxmemory-policy noeviction`.
  app: { image: registry/haha-app:${TAG}, env_file: [.env.app], expose: ["3000"], depends_on: [db, redis] }
  worker: { image: registry/haha-app:${TAG}, command: "node worker/index.js", env_file: [.env.worker], depends_on: [db, redis] }
  db: { image: pgvector/pgvector:pg16, volumes: [pgdata:/var/lib/postgresql/data], command: "lean tuned (128MB shared_buffers, 20 conns — lihat docker-compose.yml)", mem_limit 384m }
  redis: { image: redis:7-alpine, volumes: [redisdata:/data] }
  caddy: { image: caddy:2-alpine, ports: ["80:80", "443:443"], volumes: [./Caddyfile:/etc/caddy/Caddyfile, caddydata:/data] }
volumes: { pgdata:, redisdata:, caddydata: }
```
Prisma langsung (tanpa pooler/Hyperdrive/Edge): `DATABASE_URL=postgresql://haha:***@db:5432/haha`. Migrasi: `migrate deploy` dari CI/laptop. HNSW via migration. Backup: `pg_dump` PER JAM → R2 + snapshot VPS. **Pin Prisma 6.x (T7: v7 hapus url/directUrl/middleware — jangan v7 tanpa migrasi sadar).**

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [vector]
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}
```

```prisma
// (datasource/generator sudah di §6.1 atas — jangan duplikat; lanjut skema)

enum Category {
  punchline
  subtext
  irl
  double_meaning
}

enum BitStatus {
  screening
  answered
  disputed
  in_crowd
  killed_it
  bombed
  heckled_off
  rejected_prescreen
}

enum ComedianTier {
  open_mic
  opener
  feature
  headliner
  legend
}

enum CrowdTier {
  walk_in
  regular
  front_row
  critic
}

enum VoteChoice {
  A
  B
  both_right
  both_wrong
}

enum FairnessChoice {
  fair
  unfair
}

model User {
  id                String            @id @default(cuid())
  wallet            String            @unique
  email             String?           @unique
  handle            String            @unique
  country           String?
  comedian_tier     ComedianTier      @default(open_mic)
  comedian_rep      Int               @default(0)
  crowd_tier        CrowdTier         @default(walk_in)
  crowd_rep         Int               @default(0)
  onboarding_passed Boolean           @default(false)
  plant_total       Int               @default(0)
  plant_correct     Int               @default(0)
  referral_code     String            @unique @default(cuid())
  referred_by_id    String?
  bonus_quota       Int               @default(0)
  device_hash       String?
  ip_subnet         String?
  funding_source    String?
  human_verified_at DateTime?
  created_at        DateTime          @default(now())

  bits              Bit[]
  assignments       CrowdAssignment[]
  rewards           Reward[]
  appeals           Appeal[]
}

model Season {
  id                String              @id @default(cuid())
  name              String              @unique
  base_model        String              @default("mimo-v2.6-pro")
  system_playbook   String              @db.Text
  kind              String              @default("mimo_playbook_max")
  training_dataset_hash String?
  holdout_set_id    String?
  holdout_n         Int                 @default(0)
  holdout_score     Float               @default(0)
  eval_harness      String              @default("crowd_retrial_blind_v1")
  trained_at        DateTime            @default(now())
  is_active         Boolean             @default(false)
  released_at       DateTime            @default(now())
  notes             String?

  bits              Bit[]
  ai_answers        StraightManAnswer[]
}

model Bit {
  id                String                       @id @default(cuid())
  user_id           String
  category          Category
  language          String                       @default("en")
  scenario          String                       @db.VarChar(600)
  question          String                       @db.VarChar(200)
  status            BitStatus                    @default(screening)
  reject_reason     String?
  season_id         String
  // Seed/onboarding/plants wajib season S1 (disiapkan sebelum bit pertama).
  stage             String              @default("open_mic")
  is_holdout        Boolean                      @default(false)
  is_plant_bank     Boolean                      @default(false)
  plant_correct_pos String?
  plant_candidate_at DateTime?
  plant_validation_count Int                 @default(0)
  retrial_round       Int                        @default(0)
  share_public      Boolean                      @default(true)
  share_card_r2_url String?
  content_hash      String                       @unique
  embedding         Unsupported("vector(384)")?
  created_at        DateTime                     @default(now())

  user              User                         @relation(fields: [user_id], references: [id])
  season            Season                       @relation(fields: [season_id], references: [id])
  ai_answer         StraightManAnswer?
  comedian_reveal   ComedianReveal?
  assignments       CrowdAssignment[]
  outcome           Outcome?
  appeals           Appeal[]

  @@index([status, category])
  @@index([user_id, created_at])
  @@index([is_holdout, status])
  @@index([plant_candidate_at])
}

model StraightManAnswer {
  id                String   @id @default(cuid())
  bit_id            String   @unique
  season_id         String
  answer            String   @db.VarChar(300)
  reasoning         String   @db.VarChar(300)
  normalized_text   String?  @db.VarChar(450)
  confidence        Float
  model_version     String   @default("mimo-v2.6-pro")
  response_hash     String?
  latency_ms        Int
  created_at        DateTime @default(now())

  bit               Bit      @relation(fields: [bit_id], references: [id])
  season            Season   @relation(fields: [season_id], references: [id])
}

model ComedianReveal {
  id                String   @id @default(cuid())
  bit_id            String   @unique
  answer            String   @db.VarChar(200)
  explanation       String   @db.VarChar(400)
  normalized_text   String?  @db.VarChar(450)
  created_at        DateTime @default(now())
  // App-level: tolak create kedua untuk bit_id sama (prisma middleware + Test 3). GDPR-erasure: null-kan teks, pertahankan hash.

  bit               Bit      @relation(fields: [bit_id], references: [id])
}

model CrowdAssignment {
  id                String          @id @default(cuid())
  bit_id            String
  juror_id          String
  is_plant          Boolean         @default(false)
  is_validation     Boolean         @default(false)
  is_retrial        Boolean         @default(false)
  round             Int             @default(1)
  vote_weight       Float           @default(1.0)
  position_ai       String          // "A" | "B"
  vote              VoteChoice?
  fairness          FairnessChoice?
  expires_at        DateTime
  voted_at          DateTime?
  created_at        DateTime        @default(now())

  bit               Bit             @relation(fields: [bit_id], references: [id])
  juror             User            @relation(fields: [juror_id], references: [id])

  @@unique([bit_id, juror_id])
  @@index([juror_id, voted_at])
  @@index([bit_id, expires_at])
}

model Outcome {
  id                String    @id @default(cuid())
  bit_id            String    @unique
  result            BitStatus
  comedian_votes    Float
  ai_votes          Float
  total_weight      Float     @default(0)
  both_wrong_weight Float     @default(0)
  juror_count       Int       @default(0)
  fair_ratio        Float
  win_strength      Float
  decided_at        DateTime  @default(now())

  bit               Bit       @relation(fields: [bit_id], references: [id])
}

model Epoch {
  id                 String   @id @default(cuid())
  epoch_number       Int      @unique
  start_at           DateTime
  end_at             DateTime
  fee_in_base_units  BigInt   @default(0)
  fee_in_asset       String   @default("USDG")
  tipjar_micro_usdg  BigInt   @default(0)
  comedian_micro_usdg BigInt  @default(0)
  crowd_micro_usdg   BigInt   @default(0)
  merkle_root        String?
  merkle_r2_url      String?
  tx_hash            String?

  rewards            Reward[]
}

model CronJobRun {
  id           String    @id @default(cuid())
  job_name     String
  stage        String
  epoch_number Int?
  status       String    @default("started")
  idempotency_key String @unique
  attempt      Int       @default(1)
  max_attempts Int       @default(5)
  last_error   String?
  updated_at   DateTime  @updatedAt
  created_at   DateTime  @default(now())

  @@unique([job_name, epoch_number, stage], map: "cronjobrun_job_epoch_stage_unique")
  // S5: epoch_number Int? nullable — NULL tidak dedup di Postgres; dedup LEPAS via idempotency_key (unique). Isi epoch_number SELALU (0 bila tak relevan).
  @@index([job_name, status])
}

model Reward {
  id                 String   @id @default(cuid())
  epoch_id           String
  user_id            String
  role               String   // "comedian" | "crowd" | "royalty"
  is_beta_point      Boolean  @default(false)
  points_earned      Float    @default(0)
  amount_micro_usdg  BigInt   @default(0)
  cumulative_micro_usdg BigInt @default(0)
  // S6: leaf TipJar = AGREGAT lintas epoch+role per wallet (dijumlah di settlement); baris Reward per (epoch,role) untuk audit. Jangan samakan keduanya.
  merkle_proof       Json?
  claimed_tx         String?
  created_at         DateTime @default(now())

  epoch              Epoch    @relation(fields: [epoch_id], references: [id])
  user               User     @relation(fields: [user_id], references: [id])

  @@index([user_id, epoch_id])
  @@index([epoch_id, role])
}

model MicDropEvent {
  id                 String   @id @default(cuid())
  asset_in           String   @default("USDG")
  amount_in_base_units BigInt @default(0)
  haha_bought_wei    BigInt   @default(0)
  haha_burned_wei    BigInt   @default(0)
  tx_hash            String   @unique
  executed_at        DateTime @default(now())
}

model VaultPricing {
  id                 String    @id @default(cuid())
  category           Category
  outcome            BitStatus
  ref_price_micro_usd BigInt
  source_note        String
  effective_from     DateTime  @default(now())

  @@unique([category, outcome])
}

model VaultSnapshot {
  id                   String   @id @default(cuid())
  entry_count          Int
  by_category_json     Json
  replacement_micro_usd BigInt @default(0)
  merkle_root          String
  r2_dataset_key       String?
  dek_wrapped          String?
  tx_hash              String?
  created_at           DateTime @default(now())
}

model Producer {
  id                 String         @id @default(cuid())
  org_name           String
  contact            String
  wallet_address     String?
  plan               String         // "snapshot" | "subscription" | "eval" | "theme_night"
  api_key_hash       String?        @unique
  r2_download_url    String?
  status             String         @default("active")
  expires_at         DateTime?
  created_at         DateTime       @default(now())

  revenue_events     RevenueEvent[]
}

model RevenueEvent {
  id                 String   @id @default(cuid())
  producer_id        String
  amount_micro_usd   BigInt   @default(0)
  type               String
  split_json         Json
  tx_hash            String?  @unique
  created_at         DateTime @default(now())

  producer           Producer @relation(fields: [producer_id], references: [id])
}

model Appeal {
  id                 String    @id @default(cuid())
  bit_id             String
  user_id            String
  reason             String    @db.VarChar(500)
  status             String    @default("pending")
  ai_judge_verdict   Json?
  retrial_round      Int       @default(2)
  retrial_outcome    String?
  resolved_by        String    @default("CROWD_RETRIAL")
  resolved_at        DateTime?
  created_at         DateTime  @default(now())

  bit                Bit       @relation(fields: [bit_id], references: [id])
  user               User      @relation(fields: [user_id], references: [id])
}

model Report {
  id                 String    @id @default(cuid())
  bit_id             String?
  reporter_id        String
  reason             String    @db.VarChar(500)
  status             String    @default("open")
  action_taken       String?
  created_at         DateTime  @default(now())
  erased_at          DateTime?

  @@index([status, created_at])
}

model SiweSession {
  id                 String    @id @default(cuid())
  wallet             String
  nonce              String    @unique
  issued_at          DateTime  @default(now())
  expires_at         DateTime
  revoked_at         DateTime?

  @@index([wallet, expires_at])
}

model ProducerKeyToken {
  id                 String    @id @default(cuid())
  producer_id        String
  batch_id           String
  token_hash         String    @unique
  used_at            DateTime?
  expires_at         DateTime
  created_at         DateTime  @default(now())

  @@index([producer_id, expires_at])
}
```

### 6.2 Indeks HNSW + Scheduler (BullMQ repeatable, di VPS)
HNSW via migration. Scheduler = BullMQ repeatable jobs di `worker`: `five-minute-ops */5`, `daily-settlement 0 0 *`, `weekly-vault`, `season-upgrade`, `sync-chain`. Actions HANYA CI/CD deploy. Berat (Merkle/dump/eval) jalan normal di worker.

```sql
-- Ekstensi + indeks via migration (TANPA pg_cron/pg_net)
CREATE EXTENSION IF NOT EXISTS vector;
-- HNSW: kolom `embedding vector(384)`; uji `<=>` p95
CREATE INDEX IF NOT EXISTS bit_embedding_hnsw_idx
ON "Bit" USING hnsw (embedding vector_cosine_ops);
```

### 6.3 GitHub Actions = CI/CD deploy saja (bukan cron)
`haha.yml`: `migrate deploy` → build → `docker compose up` via SSH → healthcheck → `preflight` on-demand. Cron/keeper 100% BullMQ di VPS.

### 6.4 Embed di `worker` (Node Transformers.js, pinned 384-dim)
Model `Xenova/all-MiniLM-L6-v2` pinned 384, batch 32 + backoff + cache; fallback `gte-small`. RAM transient OK di VPS 2GB. Dimensi tidak boleh berubah tanpa migrasi. **T8: kalibrasi threshold 0.88 di contoh nyata (teks pendek); Mandarin butuh model multibahasa SEBELUM Fase 2 (ganti dimensi = migrasi).**

```typescript
// src/lib/embed.ts (worker) — T8: `@huggingface/transformers` (pengganti @xenova), dtype q8 di Node, fallback gte-small
import { pipeline } from "@huggingface/transformers";
const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out = [];
  for (const t of texts.slice(0, 32)) {
    const e = await embedder(t.slice(0, 800), { pooling: "mean", normalize: true });
    out.push(Array.from(e.data.slice(0, 384)));
  }
  return out;
}
```

---

## 7. Pipeline AI, R2 Storage, & Endpoint Next.js (VPS)

### 7.1 R2 (S3-API; backup survive box mati)
Bucket `haha-storage`: kartu publik + snapshot `.enc` + DEK (KMS/env) + `pg_dump` harian 30d versioned. Upload via `@aws-sdk/client-s3` dari `app`/`worker`. Presigned 24h untuk Producer.
1. **`public/cards/{bitId}.png` (custom domain prod; `r2.dev` test):**
   - Begitu bit final `killed_it`, BullMQ job render `1200x675` (`next/og` normal di VPS) lalu R2(haha.md). Holdout wajib sembunyi isi.
   - Jika `bit.is_holdout === true`, kartu share **wajib menyembunyikan isi skenario dan jawaban** (hanya menampilkan badge kategori, Season yang dikalahkan, estimasi reward USDG, dan kode referral)(haha.md).
   - Buffer PNG langsung di-upload ke R2 via `PutObjectCommand` dan URL-nya disimpan di `Bit.share_card_r2_url`.
   - **? IMPLEMENTED 19 Okt 2026 (deviasi yang direkam):** render via `worker/lib/shareCard.js` (sharp+librsvg SVG→PNG 1200x675, font `fonts-dejavu-core` + fontconfig di image; TANPA next/og) — anti-clip terbukti stress all-caps (wrap 46 char @fs30, ellipsis `… +N words`); hook menembak di **setiap jalur final** — cron `fiveMinuteOps.settleBit` (render inline) DAN settle kuorum inline di app `POST /api/crowd/[id]` (enqueue job BullMQ `share-card`, retry 5x backoff 30s); **URL deterministik** `https://helios.asiff.live/public/share/bit-{id}.png` (konvensi `cardKey`, TANPA kolom DB — retrial overwrite key sama, `Cache-Control max-age=300` anti-stale CDN); backfill **7/7 bit final historis ok 0 fail**; `card_url` diekspos di `GET /api/bits` spotlight via `lib/shareUrl.ts`. E2E live 19 Okt: bit `cmvf1za1i…aysu` final `killed_it` → kartu `200 image/png` IHDR **1200x675** TANPA sentuhan manual (app settle → BullMQ → sharp → R2 publik). **Sisa wajib pra-mainnet:** branch `is_holdout` BELUM menyembunyikan isi di kartu (rubrik b. §4.6). Catatan cache 19 Okt: edge CDN menyimpan art pra-fix (`public/share/`, CF memaksa TTL 4h) → key di-**bump ke `public/share/v2/`** — URL fresh di semua sisi (innerHTML UI, API, worker); retrial overwrite tetap menulis key yang sama → propagasi art baru ≤4h edge (browser ≤5mnt via origin max-age=300). UI live: landing spotlight feed (3 tile kartu v2 real + `View Bit →`) + blok kartu di `/bit/[id]` dengan tombol `Copy Card Link` — screenshot live 19 Okt.
2. **`private/vault/snapshot-{epoch}.jsonl.enc` (Private Only — Presigned URL):**
   - Setiap minggu (`/api/cron/weekly-vault`), seluruh entri terverifikasi (`killed_it` & `bombed`, kecuali `is_holdout = true`)(haha.md) diekspor dalam format JSONL, dienkripsi dengan AES-256-GCM, dan diunggah ke R2.
   - Saat seorang Producer menyelesaikan pembayaran on-chain di `ProducerGateway.sol` (`/api/producers/activate`), backend menghasilkan **Presigned GetObject URL** menggunakan `@aws-sdk/s3-request-presigner` (masa berlaku 86.400 detik / 24 jam).
3. **`private/merkle/epoch-{epochNumber}.json` (Backup Merkle Tree):**
   - Menyimpan struktur lengkap Merkle tree setiap epoch di R2 sehingga tabel database tetap ringan dan data proof selalu memiliki cadangan permanen(haha.md).

### 7.2 Endpoint Next.js API Routes (`src/app/api/` — di VPS, tanpa serverless)

| Endpoint | Method | Fungsi & Perilaku Serverless |
|---|---|---|
| `/api/auth/verify` | `POST` | SIWE + Turnstile (anti-bot, BUKAN personhood — click-farm tetap bisa; disclosed). Sinyal sybil: `device_hash` exact / `ip_/24` (rawan CGNAT, hanya bobot) / `funding_source` (rawan CEX/bridge sama, hanya bobot). Gate keras hanya: `juror != author` + stake-check. Retensi 180 hari + consent lintas-negara (GDPR/PIPL: data Subtext ke MiMo/Xiaomi dicatat di `/rules`, opt-out = jangan submit). |
| `/api/bits` | `POST` | Dedup SEMUA `sim>=0.88` tolak; retrieval non-holdout; prescreen flash; Straight Man: Open Mic thinking-off / Pro Stage thinking-on temp 0.7 (disclosed `/seasons`)(haha.md). |
| `/api/bits/[id]` | `GET` | Detail bit + Straight Man + progres Crowd + kartu R2(haha.md). |
| `/api/bits/[id]/verdict` | `POST` | `got_it` → `bombed`. `missed_it` → Reveal sekali tulis, tahan assignment sampai `normalized_text` terisi (retry BullMQ worker), filter related + log(haha.md). |
| `/api/bits/[id]/appeal` | `POST` | Banding 1x per bit DAN maks 1x/hari per user (gabungan kedua aturan), hanya `bombed/heckled_off`. 7 retrial baru(haha.md). |
| `/api/bits/[id]/report` | `POST` | Laporan pengguna (§16): takedown request → unlist carousel/share dalam 24h via cron, antre GDPR-erasure 30 hari. |
| `/api/crowd/stake-check` | `GET` | Baca `CrowdStaking.stakeOf` on-chain; blok `/crowd/next` jika < minimum. Pre-launch (belum ada token): mode allowlist. |
| `/api/crowd/onboarding` | `POST` | 10 soal, lulus ≥8/10(haha.md). |
| `/api/crowd/next` | `GET` | Fetch 1 assignment milik juri (dibuat di verdict/retrial/validasi, BUKAN di next). `SKIP LOCKED` anti-race. Tahan jika belum normalized. |
| `/api/rpc` | `POST` (server-only) | Proxy RPC allowlist (chain 4663/46630, method read-only + `eth_sendRawTransaction` via worker) — kunci Alchemy HANYA server (T3: DILARANG `NEXT_PUBLIC_*` berisi key; bundle klien tak boleh bocor). Chain/env dibaca runtime `/api/config` (T3: `NEXT_PUBLIC_*` beku saat build — JANGAN ganti env via restart; build image per env ATAU config runtime). |
| `/api/crowd/[assignmentId]` | `POST` | Vote weighted §4.4. Thin→7. `killed_it`→holdout lottery + share(haha.md). |
| `/api/vault/summary` | `GET` | Replacement Cost (hanya verified, badge preliminary sampai riset), Revenue Earned, per kategori (`revalidate=30`)(haha.md). |
| `/api/vault/history` | `GET` | Grafik + penanda Season(haha.md). |
| `/api/vault/pricing` | `GET` | Harga acuan per kategori/outcome + `source_note` + riwayat (backing `/vault/method`). |
| `/api/vault/snapshots` | `GET` | Daftar Merkle root Vault + tx + `r2ManifestUri`. |
| `/api/tipjar/summary` | `GET` | Escrow (cache 60s) + TipJar + burn + "exempt 2 = 0 tambahan + 2 otomatis" + takeover/freeze. **Indexing via Blockscout API / Alchemy Webhooks — DILARANG `eth_getLogs` fallback RPC. Catatan jujur: sandbox 403 ≠ vonis prod; uji dari VPS hari-1.** |
| `/api/rewards/me` | `GET` | `cumulative_micro_usdg` (string BigInt) + `merkle_proof` (hex[]) + TipJar addr + chainId untuk `claim()`(haha.md). |
| `/api/producers/activate` | `POST` | Verifikasi `tx_hash` + event, split micro 40/30/20/10, API Key 256-bit (prefix `haha_`), subscription `expires_at` + revoke cron, presigned 24h + `key_token` 15 mnt single-use. |
| `/api/producers/key` | `GET` | Tukarkan `key_token` (sekali pakai) dengan DEK ter-unwrap untuk `batchId` miliknya. Log akses + revokasi. |
| `/api/cron/sync-chain` | `POST` | Deteksi graduasi Pons + `feeRecipient` takeover + USDG pause/freeze. Aktifkan `MicDrop` hanya post-graduasi. Bukan deteksi token palsu via klaim pertama. |
| `/api/cron/five-minute-ops` | `POST` (internal, BullMQ repeatable `*/5`) | Re-entrant: (1) expire SLA, (2) retry normalisasi A/B, (3) Plants validasi, (4) retrial banding, (5) lanjutkan `CronJobRun` stage tertunda. Tanpa batas 10s. |
| `/api/cron/daily-settlement`| `POST` (internal, BullMQ `0 0 * * *`) | Sweep→claim→split 70/30 → reward micro (cap/akun iteratif + rollover) → Merkle BigInt → R2 → proposeRoot → buyback/hold(haha.md). |
| `/api/cron/weekly-vault` | `POST` | Export JSONL → DEK acak per snapshot → AES-GCM → R2; wrap DEK via KMS/Vault; `publishSnapshot(entryCount, microUsd, root, r2uri)`(haha.md). |
| `/api/cron/season-upgrade` | `POST` (internal, BullMQ 14-harian) | Compile playbook MiMo-max + canary/rollback. Gate n≥200/Δ+3%/p<0.05. `kind=mimo_playbook_max`. |

---

## 8. Protokol Pengujian End-to-End di Robinhood Chain Testnet (`46630`)

Sebelum melakukan deploy ke Mainnet (`4663`), kedelapan skenario pengujian ini **wajib dijalankan dan lulus 100%** menggunakan saldo ETH Testnet Robinhood Chain (`46630`) milikmu:

1. **Test 1 — Deploy Kontrak Testnet & Mock Suite (`46630`):**
   - Jalankan dengan Alchemy endpoint (fallback public bila perlu): `forge script script/DeployTestnet.s.sol --rpc-url https://robinhood-testnet.g.alchemy.com/v2/$ALCHEMY_API_KEY --broadcast`.
   - Pastikan 12 kontrak (6 utama + 6 mock: USDG, HAHA, Escrow, Factory, Router, PoolManager/Hook) ter-deploy dan terverifikasi di explorer testnet.
2. **Test 2 — Uji Pre-Screen, Duplikat `pgvector`, & Deteksi Krisis (`Subtext`)(haha.md):**
   - Duplikat 17 contoh → tolak `sim>=0.88`. Budget <3s: embed p95 <800ms + MiMo prescreen <1500ms + pgvector <200ms; cold-start Edge dikecualikan warming. Flake → retry 1x lalu antre.
   - Kirim kalimat berindikasi *self-harm* di kategori `Subtext` → pastikan modal dukungan krisis muncul dan bit tidak diproses(haha.md).
   - ✅ PASS (scriptable) 19 Okt 2026 LIVE — near-dupe varian tolak otomatis `duplicate sim=0.937 of …` (threshold 0.88 hidup, p95 gate jalan di worker); kalimat self-harm Subtext → `crisis_support` + bit tidak pernah diproses. **GAP follow-up: 17 contoh seed belum punya `Bit.embedding`** (seed tidak backfill) → dupe persis ke seed masih lolos prescreen; buat backfill embedding seed di worker sebelum QA penuh — **✅ GAP TERTUTUP 19 Okt 2026**: `scripts/backfill-embed.mjs` sukses di kontainer worker (76 bits terisi), dupe persis seed #39 dire-print verbatim oleh author → **DITOLAK** `duplicate sim=0.971 of cmvb5b7nz…`.
3. **Test 3 — Uji Straight Man (`mimo-v2.6-pro`) & Normalisasi Gaya A/B(haha.md):**
   - Kirim bit baru yang orisinal → pastikan Straight Man menjawab dengan JSON `{answer, reasoning, confidence}`(haha.md).
   - Klik **"Missed it 😂"** → cek `normalized_text` terisi via BullMQ worker + retry (tanpa serverless)(haha.md).
   - ✅ PASS (scriptable) 19 Okt 2026 LIVE — bit orisinal → `mimo-v2.6-pro` JSON (answer 256c, conf 0.92, latency ~4.4s); `missed_it` API → reveal sekali-tulis + 5 assignment blind (reveal disembunyikan pre-settle) + `normalized_text` AI terisi (288c) via worker; normalisasi Comedian menyusul di tick `five-minute-ops`. NOTE: konsolidasi prescreen + straightman realtime ≈9s (budget doc harap diulang saat kalibrasi T8).
4. **Test 4 — Uji Blind Crowd (5 Juri, Eskalasi 7 Juri, Retrial Banding & Plants 2-Stage)(haha.md):** ✅ **PASS 19 Okt 2026 (12 juri fresh E2E)** — BIT-K `killed_it` 5/5 consensus (win 1.0, fair 1.0, rep +1); BIT-T thin zone (fair 2/5 →​ 0.40) **auto-expand 5→7** (`waiting_extension` → final dinilai 7 juri → `bombed` 3/7); BIT-H `heckled_off` di 6 vote (fair 2/6, rep −1); BIT-B2 bombed → appeal → 7 juri retrial → final `killed_it` `resolved_by=CROWD_RETRIAL` (rep −1 author). Plants lihat bawah. Seed `0x000…` dikecualikan dari juri (verdict + appeal fix `6a10620`).
   - Gunakan 5 akun uji di Testnet untuk memberi vote `Fair` dan memilih jawaban Comedian → pastikan status berubah menjadi `killed_it`(haha.md).
   - Uji thin heckled: 2 fair vs 3 unfair (fair=0.40) → HARUS expand ke 7 (T11), bukan final di 5.
   - Uji banding: ajukan appeal atas bit `bombed` → pastikan 7 assignment retrial ke juri baru terbuat, final overwrite `Outcome` + `resolved_by=CROWD_RETRIAL` tanpa klik manusia.
   - Uji Plants: gunakan flag time-travel testnet (`plant_candidate_at = now()-8d`) → 5 validasi → promosi hanya jika 5/5. Tanpa flag, test skip (butuh umur 7 hari). — **✅ PASS 19 Okt 2026: Plants 2-tahap live** — stage-1 otomatis oleh settlement (bitK `cmverkx1j…` & bitB2 `cmveshlyi…` ditandai `plant_candidate_at`); time-travel bitK −8d → tick `five-minute-ops` topUp 7 tugas validasi (is_validation, round 1) → 7 juri vote `A/fair` (0 `both_wrong`) → tick berikutnya otomatis `is_plant_bank=true`, `plant_validation_count=7`. bitB2 menyusul otomatis (umur ke-8 hari).
   - Pastikan kartu share `1200x675` otomatis ter-upload ke bucket publik **Cloudflare R2** dan bisa dibuka lewat URL R2(haha.md). — ✅ **PASS 19 Okt 2026**: route share-card (`share-card` queue + canvas render worker + upload R2) hidup; bukti ganda — prod bit E2E UI `cmvfen5830002qq01qmhmvn0u` kartunya **200 image/png** di `https://helios.asiff.live/public/share/v2/` (71 KB), plus E2E lokal penuh (UI onboarding kuis → submit → MIMO → verdict → 5 juri vote → `killed_it` → kartu **200** 73.516 B; konsumen lokal `WORKER_CHAIN_WRITES=off`). Catatan fix sesi ini: SIWE verify respons `ok:true` (`4a55de5`) + klien kirim `nonce` (`dd93a5c`), onboarding UI kirim `correct/total` sesuai kontrak route (dulu `{score}` → 400 diam-diam, `7e2cca6`).
5. **Test 5 — Aliran Uang (split dua sub-tes, tidak campur)(haha.md):**
   - **5a USDG-only:** `simulateTradingFees(splitter, 1000_000000)` tanpa ETH → settlement stages → assert 700.000000 TipJar + 300.000000 MicDrop (micro exact). ✅ PASS 17 Okt 2026 di set deploy FINAL (TipJar `0x03f2…a675`, MicDrop real `0xdfB0…0466`, FeeSplitter `0xC79D…9C7d`) — 700/300 exact + splitter kosong, re-cek saldo on-chain 19 Okt identik. Sweep refs (curve/hook) terpasang; **rotasi `MicDrop.hahaToken`: ✅ DONE 19 Okt 2026** — jalur cepat testnet atas izin owner (redeploy MicDrop v2 `0xCEc9…1d28` dengan `confirmDelay=10 mnt` sebagai parametrik konstruktor; mainnet deploy script tetap 48 jam — tanpa divergensi kode): `proposeHahaToken` (tx `0xfa6afcad…cb60`) → **10 mnt** → `confirmHahaToken` (tx `0x2e0425e8…284f81`) → `hahaToken = MockHAHA 0xE0f8…4ec5` ✓; FeeSplitter `proposeSetMicDrop→confirmSetMicDrop` (tx `0x454a6f9c…`, `0x3e382d37…`) + ProducerGateway `setRecipients` (tx `0x78153b88…`); bukti routing: `harvestAndSplit` 5.000 USDG (tx `0x527d0a7a…2606`) → TipJar +3.500e6 / MicDrop-v2 +1.500e6 / splitter 0 persis. Catatan: MicDrop v1 `0xdfB0…0466` pensiun (1.800e6 USDG legacy tak-rescueable — tanpa fungsi rescue) dan pending lama (ETA 21 Okt) tidak relevan lagi; `.env` app+worker di-switch ke v2. Guard prematur `TimelockNotReady (0x7378c19d)` terbukti live saat trial confirm sebelum ETA (19 Okt).
   - **5b ETH-only:** 0.02 ETH tanpa USDG → assert total = swap(ETH) ±2%, lalu 70/30 dari total itu. Pre-graduasi MicDrop HOLD, post-graduasi burn. ⛔ OBSOLETE per T10 (FeeSplitter USDG-only, jalur swap ETH dihapus) — keluarkan dari ceklis kecuali jalur ETH dibuka lagi.
   - Trigger `/api/cron/daily-settlement`.
   - Verifikasi explorer: 5a exact micro; 5b rangebound slippage.
6. **Test 6 — Klaim Merkle + delay guardian (testnet 10 mnt)(haha.md):** ✅ **PASS 19 Okt 2026 di set FINAL (timelock aktif 10 mnt dicoba sebagai rootDelay 600 dtk)**
   - Setelah Test 5 selesai, pastikan `TipJar.merkleRoot()` di Testnet ter-update. — ✅ epoch-3 root di-activate (delay 600 dtk penuh; aktivation permissionless oleh EOA biasa).
   - Login sebagai Comedian pemenang di `/tipjar`, klik **Claim USDG**, juga uji fitur **Claim to Alternate Address** → pastikan saldo `MockUSDG` bertambah sesuai perhitungan rumus reward(haha.md). — ✅ klaim **on-chain EIP-712 + MerkleProof** via encoded calldata: author bitB2 dapat **140.000000 USDG** (tx `0xbf09660b…ca737`, TipJar 4.200→4.060), juri crowd 1x **28.000000 USDG** (tx `0x1aab0f3b…92f29`, 4.060→4.032). Saldo wallet keclaim naik exact.
   - **BUG FIX ditemukan & terselesaikan di jalur ini:** worker tree OZ `StandardMerkleTree` memasukkan `keccak(abi.encode(account,cum))` sebagai nilai → `standardLeafHash` mengeccak **sekali lagi** → leaf *tripple*-hash, sedangkan kontrak klaim dari `TipJar.leafHash` (double-hash) → semua klaim revert `InvalidProof` walau root "match" (root on-chain dibangun dari leaf salah itu juga). Fix `worker/lib/merkle.js` = `SimpleMerkleTree` (leaf verbatim), **self-verify fail-loud per proof** (sorted-pair fold harus hit root) + tolak leaf duplikat (commit `53b39ac`, CI hijau). Perbaikan data: one-off rebuild → 15 baris reward `merkle_proof` + cumulative di-REWRITE, root baru `0xfa440da3…0a9b` di-propose epoch 4 (tx `0x03c9a051…2c6`) → activate (tx `0x56fd877a…1f65`, `currentEpoch=4`). Resistensi terbukti: DUPLICATE-proof dari endpoint `/api/rewards/me` memakai proof DB → klaim langsung lulus.
7. **Test 7 - Uji Checkout B2B `/producers` (Split 40/30/20/10 & R2 Presigned URL)(haha.md):** ✅ PASS live 16 Okt 2026 — Snapshot $2.500: TipJar +1.000 (750 umum + 250 royalti), MicDrop real +500, cold +1.000. ✅ **RE-RUN SET FINAL PASS 19 Okt 2026 — dua kali pembelian** (`ProducerGateway 0x29B6…812c`): mintTest 10k USDG → approve → `purchasePlan(0, 2_500_000_000, orderId, 0)`: **#1** tx `0x57cc46de…499a` split on-chain verifikasi delta saldo exact — cold +1.000e6 / TipJar +1.000e6 (750 umum + 250 royalti) / MicDrop +500e6 (40/30/10/20); **#2** tx `0xabcc9e85…7d5c3` setelah snapshot fresh. `POST /api/producers/activate {tx_hash, plan, orderId, batchId}` → **verified:true** (cek receipt on-chain + replay-tx ditolak), `producerId` + `apiKey` + `keyToken` 1x + `downloadUrl` presigned R2.
   - Gunakan `MockUSDG` di halaman `/producers` untuk membeli paket *Snapshot License* ($2,500 USDG)(haha.md).
   - Pastikan **40% ($1,000 USDG) langsung masuk ke wallet pribadimu (`OPERATOR_WALLET`)**, 40% ke `TipJar` (30% umum + 10% royalti batch `orderId`, cek event `ProducerPurchase`), 20% ke `MicDrop`(haha.md), dan layar langsung menampilkan link unduhan dataset terenkripsi dari **Cloudflare R2**. — ✅ rantai data penuh teruji: `GET /api/producers/key?token=` (1x, expires 24h) → `dekBase64` fresh + `r2DatasetKey` snapshot TERBARU (`snapshot-1792395744097.jsonl.enc`, weekly-vault dibuat manual: **2 entry = hasil Test 4**, replacement 14.500.000 micro, `merkle_root 0x76d4e0…f6711`) → download presigned **200** (910 B) → **AES-256-GCM decrypt memakai DEK BERHASIL**: bitT `bombed` @2.500 micro, bitB2 `killed_it` @12.000 micro, total = 14.500.000 == output job. Catatan: aktivasi pertama memakai snapshot lama kosong (0 entry) — mekanisme tetap sahih; snapshot #2 menuntaskan isi data.
8. **Test 8 — Pre-flight DRY-RUN (TANPA broadcast, 72h):** ✅ **GATE DIEKSEKUSI 19 Okt 2026 (read-only, NOL broadcast — stop di preflight per perintah owner):** re-verify 6 kandidat chain 4663 (block 92.490.653, RPC Alchemy + publicnode): **USDG `0x5fc5…d168` ✅** (Global Dollar/USDG, decimals 6, proxy ke `0x6818…66f8F`); factory 24.177B, hook 15.167B, PoolManager 24.009B, UniversalRouter 24.546B, escrow 1.932B — semua live code. **Gate resmi `forge script DeployMainnet.s.sol` → ABORT di `PreflightFailed("escrow.claimToken")`** — trace: `claimToken` escrow kandidat `0xd3AF…Ac9e` BUKAN view-safe (`StateChangeDuringStaticCall` — fungsi ini memutasi saldo escrow nyata) + custom error `0xc2caa2a6` (tak-ada di 4byte DB) saat eth_call `claimToken`/`claim`, dan `owner()` revert kosong → **permukaan klaim escrow kandidat TIDAK sesuai asumsi gate = mismatch terdeteksi tepat seperti desain 72h** (abort, TIDAK ada workaround on-chain). Catatan CLI: forge nightly menjadikan dry-run default — flag `--dry-run` dihapus (`--broadcast` eksplisit baru menulis). Fork-test graduasi (anvil `--fork-url` + broadcast lokal) **DEFERRED ke fase pasca-gate**.
   - Pre-flight: `decimals==6`, selector claim, router/poolmanager/factory/hook, Sablier (Safe N/A — single-EOA sadar). Abort mismatch. ✅ dieksekusi (verdict di atas; re-verify ulang sebelum launch bila escrow diganti/upgrade).
   - Jalankan dry-run via Alchemy: `forge script script/DeployMainnet.s.sol --rpc-url https://robinhood-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY --dry-run` + fork-test graduasi. DILARANG `--broadcast` di 72h. *(forge nightly: dry-run default — tanpa flag.)*
   - Broadcast mainnet = fase POST-GATE terpisah (setelah Test 1–7 hijau + audit + legal + drill restore): baru `--broadcast`, ganti `CHAIN_ENV`, serahkan `FeeSplitter` ke deployer Pons(haha.md).

### 8.1 Rekaman audit UI & sesi kedua (19 Okt 2026, bukti segar)
- **UI sweep 10 halaman** (landing, 5 tab app, producers/rules/faq/seasons): semua render, konsol + jaringan bersih (tanpa 4xx/5xx; hanya warning dev-mode React DevTools/HMR/THREE.js). Fix a11y producers (`65800cd`).
- **E2E UI dgn wallet env (prod testnet)**: submit → MIMO answered → verdict MISSED IT + reveal → 7 juri vote via UI (bridge) → `killed_it` WIN 71% / FAIR 100% → kartu share otomatis **200** di R2 (bit `cmvfen5830002qq01qmhmvn0u`).
- **E2E UI lokal end-to-end** (stack lokal penuh, worker lokal `WORKER_CHAIN_WRITES=off`, testnet 46630): onboarding kuis 10 kasus via UI → `onboarding_passed=true`; submit via UI `POST /api/bits` 200 → MIMO `answered` → verdict+reveal → **5 seat juri tanpa seed** → 5 vote blind via UI semua 200 → inline final `killed_it` (5/0/5, fair 1.0) → kartu upload **200** (73.516 B) → render bit page utuh.
- **Fix sesi ini**: onboarding `{score}`→`correct/total` sesuai kontrak route (`7e2cca6`), SIWE `ok:true` (`4a55de5`) + nonce klien (`dd93a5c`), tipjar `dailyPoolUSDG`/`latestEpoch` dari chain (`dbc6ca7`), leaderboard juri dari agregasi votes (`cf33b12`,`733092b`), quorum round semantics + re-seat need-based (`7a38204`,`3b21f5b`), gate `WORKER_CHAIN_WRITES` (`efe897e`,`adb01b3`,`ada2059`).
- **Bukti prod pasca-deploy** (`15024ff`, CI SUCCESS 4m56s): health 200, config `chain=46630`, bits/leaderboard/tipjar/vault 200, kartu prod 200 image/png. Kosmetik tersisa: label `CASE 010 / 10` di kuis (padding digit ganda). Mainnet **TIDAK disentuh** (Test 8 stop di preflight sesuai perintah owner).

### 8.2 Rekaman sesi ketiga (20–21 Okt 2026, PRODUCTION, hasil uji penuh + prep mainnet)
- **Wallet-menu gaya veil LIVE di prod** (katalog 2 kolom, saldo server-side via `/api/wallet/balances`, disconnect penuh) — bukti di sesi kedua.
- **Onboarding kuis via UI prod** (operator, gaya klik nyata): score lulus → SIWE → `onboarding_passed=t` (bukti psql `User` operator). Label kosmetik `CASE 010 / 10` → diperbaiki `padStart(2,"0")`.
- **Jalur THIN→EXTRA seats→FINAL via UI prod** (bit `cmvgznbn50002mj01mozvhjgs`): reveal+lock → 5 vote (3C/2AI, fair 5/5) → win 0.6 zona tipis → tick 5-menit **auto-expansion 5→7 kursi** → 2 juri tambahan vote → **final `killed_it`, comedian 5, ai 2, jurors 7, win 0.714, fair 1.0** (bukti `Outcome` psql) + kartu share 200 (77.551 B).
- **TipJar klaim penuh via UI prod DITEMUKAN BUG lalu FIXED**: klik Claim → EIP-712 OK server-side, tapi transaksi `claim()` **revert on-chain `InvalidProof()` (0x09bde339)**. Rantai akar: (a) interval Oct-19 07:13Z: worker `proposeRoot` memakai nomor epoch **DB latest+1 (=4)** padahal pohon berisi akumulasi — chain pun `currentEpoch` melompat ke 4; (b) settlement tengah malam Oct-20 00:00Z (pohon baru `0x98a794…`, keluaran $119.00 operator) memanggil `proposeRoot(4,…)` → **revert EpochNotIncreasing**, `CronJobRun` gagal, tidak pernah re-try → root on-chain tertinggal (root lama `0xfa440da3…`) → proofs DB tak pernah cocok (walk proof node: root `0x98a794…` ≠ active). **Remediasi on-chain manual + fix kode**: `proposeRoot(5, 0x98a794…, 1_279_833_326)` (`0x9171b9f1…`) → veto window 600s → `activateRoot()` (`0xe121f2dc…`) → **merge activeRoot=0x98a794…, currentEpoch=5**; klaim diulang via UI → **broadcast `0x19e45d25…` SUCCESS**, log Transfer USDG (`0x6b72879a…`, symbol USDG) + `cumulativeClaimed(operator)=119000000` → **saldo USDG operator 7.000 → 7.119 on-chain** — loop klaim penuh PAS. Fix durabel: `dailySettlement.propose_root` memakai **nomor epoch dari CHAIN** (`target = max(chainEpoch, dbEpoch)+1`) + **keeper TipJar baru** di `fiveMinuteOps` yang meng-`activateRoot()` pending setelah eta (tidak ada pelaku lain yang meng-aktivasi).
- **Prep mainnet (TANPA deploy)**: `.env.example` blok §10 (suite alamat mainnet + `WORKER_CHAIN_WRITES`), `docs/MAINNET-HANDOFF.md` (runbook gate preflight escrow `claimToken` — tetap harus abort bila mismatch; delta env; urutan deploy; bring-up worker; verifikasi 24 jam; lesi desinkronisasi epoch). Mainnet TIDAK disentuh.

### 8.3 Rekaman sesi keempat (21 Okt 2026, bukti prod segar — penggenapan 1-putaran)
- **Pro Stage pun diklik e2e**: toggle `Pro Stage · 2.5×` di UI → POST `/api/bits` 200 → **auto-navigasi `/bit/<id>`** (bukti fix `bitId` `cbe0871` hidup dgn jelas dirittual) → DB baris `stage='pro'`, `status='answered'` (MIMO pro full-thinking) → bit page badge **"PRO STAGE (2.5×)"**. Catatan: biaya $0.10 kredit BELUM dienforce API (deskripsi UI saja) — gap kecil pre-mainnet.
- **BOMBED + APPEAL + RETRIAL penuh (round 2)**: bit PHOTON6 `cmvhhda6d0001qi016f86i6y6` 5 vote AI (UI) → `outcome= bombed` (c0/a5/j5) → operator **File Round 2 Appeal** → POST `/appeal` 200 → DB `status=retrial_open` + **7 kursi round-2** muncul → 5-7 vote UI (3C/0A konsisten) → **outcome OVERWRITE ke `killed_it` + `appeal.status=resolved`** — jalur majelis di sisi claim+reseat tampak normal; catatan behavior: juri dgn antrian bisa menunggu ballot bit LEBIH DEWASA lebih dahulu (desain claim-server `next`).
- **Plant bank validation (cron + UI)**: kandidat disemai (backdate) → tick membuat **8 kursi validasi** (is_validation, ditengah juri fresh/rest duplicate) → 3/5 vote via UI backend → honest 3/5 (sisanya re-seat cron menunggu juri fresh; logic `every(vote !== both_wrong)` hidup).
- **Mobile sweep 9 halaman (iframe 390px)**: `hscroll: false` = SEMUA (landing, producers, 5 tab app, bit page, crowd/join); "penunggang cursor-custom/fixed-gradient" bukan overflow nyata. Harness limit: window nyata min ~1446px, iframe memfasilitasi media-query membaca 390px.
- **README.md dibangkitkan** (runbook ops: lokal, VPS cron table, TipJar payout loop, QA bridge, alamat kontrak, larangan).
- Mainnet tetap TIDAK disentuh (untuk laporan keputusan di atas).

## Lampiran A — Checklist form launch Pons (2 orang verifikasi + screenshot pra-submit)
Pra-submit: nama/simbol/logo/deskripsi/tautan final; pair **USDG** (`0x5fc5…d168`, 6 des); creator wallet = **FeeSplitter terverifikasi Blockscout** (cocokkan awal+akhir+checksum); tax = **200bps (2%, LOCKED)**; buyback **OFF**; exempt tambahan **KOSONG**; TANPA launch-and-buy; fee-sharing lain = default ke recipient.
Pasca-launch (skrip read-only): simpan tx hash; `getLaunchedToken` (recipient=splitter, pair=USDG, tax cocok, buyback=false); nol event exempt + listing Pons tampil exempt 0 tambahan; `getLaunchFeePolicy` (catat share); `pendingCreatorFeeRecipient==0`. Cocok → propose (48h) → confirm; tidak → JANGAN confirm. `sync-chain` cek berkala buyback+recipient.

---

## 9. Timeline Eksekusi 3 Hari (72-Hour Granular Build Plan)

### HARI 1 (Jam 0–24): Infra + DB + Kontrak Testnet (`46630`)
> Scope 72h = inti dulu (FeeSplitter + TipJar + loop bit→crowd→reward + QA). Full 12 kontrak/20+ endpoint = minggu 2–4.
- **Jam 0–4 (Setup Monolith & Cloud Services):**
  - Inisialisasi Next.js 16 (Active LTS; 15 EOL 21 Okt 2026 — T6) + `viem` mentah — TANPA `wagmi`/rainbowkit, comot `wallets.ts`)(haha.md).
  - Siapkan VPS hari-0: bind SSH key + UFW + fail2ban + swap 2GB + auto-renew ON + snapshot baseline. Lalu: `docker compose up -d` (db + redis + caddy), `migrate deploy`, deploy app + worker.
  - Buat bucket **Cloudflare R2** (`haha-storage`) + 2 token (public-write / private-read), custom domain prod, dan simpan data-key AES di env/KMS.
- **Jam 4–10 (Database Schema & Autonomous Seeding):**
  - Jalankan `npx prisma migrate dev --name init` untuk 16 model (§6.1) + ekstensi `vector` + HNSW index(haha.md), lalu `npx prisma generate`.
  - Jalankan `npx prisma db seed` batch (≤32/batch + backoff): `Season S1`, `VaultPricing` preliminary ($12/$2.50 + source_note kosong), 17 inspirasi + 4 bad bits, 10 onboarding, 50 Plants(haha.md).
- **Jam 10–18 (Smart Contracts Foundry & Deploy ke Robinhood Chain Testnet `46630`):**
  - Tulis unit+fuzz Foundry 6+6 mock (target ≥80% branch + 10k fuzz run) + load test epoch 500 reward + fork-test graduasi (haha.md). **Urutan: FeeSplitter + TipJar + verifier DULU (rehearsal K3 butuh alamat final), sisanya menyusul.**
  - Deploy seluruhnya ke **Robinhood Chain Testnet (`46630`)** menggunakan saldo ETH Testnet milikmu dan simpan ABI + alamatnya di `src/lib/contracts/config.ts`.
- **Jam 18–24 (AI Engine MiMo 2.6 Pro & Cloudflare R2 Client):**
  - Bangun `src/lib/ai/mimo.ts` (Pre-screen, Straight Man, A/B normalizer, observability logger, Playbook Compiler)(haha.md).
  - Bangun `src/lib/storage/r2.ts` (upload kartu share PNG, upload snapshot `.jsonl.enc`, dan generator Presigned URL).

### HARI 2 (Jam 25–48): Core Loop API, The Stage, The Crowd, & Cron Otonom
- **Jam 25–30 (Auth SIWE/Wallet, Turnstile, & Sybil Filter):**
  - Bangun autentikasi wallet untuk Chain ID `46630` (Testnet) dan `4663` (Mainnet)(haha.md).
  - Integrasikan Cloudflare Turnstile dan pelacak pendana gas pertama via Blockscout API untuk mencegah kolusi Comedian–Crowd(haha.md).
- **Jam 30–38 (The Stage `/stage`, Halaman Bit `/bit/[id]`, & Kartu Share R2):**
  - Bangun `/stage` lengkap dengan 4 kartu kategori (`Punchline`, `Subtext`, `IRL`, `Double Meaning`), batas karakter 600/200, panel *"Need ideas?"* dengan tombol *Shuffle* & template isian dari `haha.md` (§10)(haha.md).
  - Bangun Next API `bits` + `verdict` + BullMQ retry serta share card `1200x675` ke R2(haha.md).
- **Jam 38–44 (The Crowd `/crowd`, `/crowd/join` & Logika Kuorum 5/7 Juri):**
  - Bangun kuis onboarding 10 soal di `/crowd/join`(haha.md).
  - Blind `/crowd` + Plants 2-stage (kandidat 7/7 & >7 hari → 5 validasi → bank), eskalasi 5→7(haha.md).
- **Jam 44-48 (BullMQ live):**
  - Repeatable jobs + retry + `CronJobRun` re-entrant (§6.2–6.3).

### HARI 3 (Jam 49–72): Vault, Producers, Full Testnet QA (BUKAN mainnet)
- **Jam 49–56:** Intro + Vault + kill-switch + disclaimer.
- **Jam 56–62:** `/tipjar` (micro + "exempt 2 = 0+2"), `/producers` (presigned + DEK), `/seasons` (disclose playbook + 2 meja), `/stage` (toggle + label weakened), `/report` + GDPR.
- **Jam 62–72:** 8 skenario Testnet dari VPS (Test 1–7 + pre-flight dry-run, TANPA broadcast mainnet).

---

## 9b. Annex Referensi Comot (kentir / sCRIT / veil — verifikasi lisensi/utilitas sebelum copy; skeleton BELUM diaudit, bug ikut pindah)
Fondasi (copy + rename):

Fondasi (copy + rename): `veil/lib/chains.ts` (+`.mjs`, canonical v4) → `lib/haha-chains.ts`; `veil/lib/contracts.ts` → `lib/haha-contracts.ts`; `kentir|veil/lib/wallets.ts` → `lib/wallets.ts` (EIP-6963, tanpa wagmi); `veil|sCRIT/scripts/compile.mjs` → `lib/haha-artifact.ts`; `sCRIT/app/api/rpc/route.ts` + `veil/lib/rpc-guard.ts` → proxy RPC + allowlist; `sCRIT/lib/attestation.ts` → vote EIP-712 `haha-crowd`; `veil/app/contracts|burn|status` → `/tipjar`+`/vault`; `veil/deployments/*.json` → `haha/deployments/` manifest.
Skeleton (logika ganti): `sCRIT/contracts/TradingTaxHook.sol` → FeeSplitter (sumber dana sweep→claim); `veil/contracts/VeilTreasury.sol` → TipJar/MicDrop (ganti burn→split); `sCRIT/app/api/treasury/route.ts` → verifikasi `ProducerPurchase`; `sCRIT/app/api/copilot/route.ts` → Straight Man MiMo; `sCRIT/scripts/index-events.mjs` + cron + `kentir/lib/shielded-indexer.ts` → indexer game.
Jangan ditiru: kontrak Pons jadi, Merkle distributor, staking/slashing, loop game, Auth dialihkan ke SIWE sendiri (tanpa Supabase Auth), circuits/privacy-pools (tulis baru).

---

## 10. Template `.env.example` Lengkap (Testnet & Mainnet)

```env
# ==========================================================
# 1. ENVIRONMENT & NETWORK MODE
# ==========================================================
# Isi "testnet" untuk Robinhood Chain Testnet (46630)
# Ubah ke "mainnet" setelah 8 skenario Testnet lulus (4663)
NEXT_PUBLIC_CHAIN_ENV="testnet"
NEXT_PUBLIC_APP_URL="https://haha.YOURDOMAIN.com"

# ==========================================================
# 2. ROBINHOOD CHAIN RPC & BLOCKSCOUT (TESTNET 46630 & MAINNET 4663)
# ==========================================================
NEXT_PUBLIC_TESTNET_CHAIN_ID="46630"
# Alchemy primary + publicnode + public fallback — SEMUA DI SERVER (/api/rpc). T3: DILARANG NEXT_PUBLIC berisi key; chain dibaca runtime /api/config (NEXT_PUBLIC beku saat build).
NEXT_PUBLIC_TESTNET_EXPLORER_URL="https://explorer.testnet.chain.robinhood.com"

NEXT_PUBLIC_MAINNET_CHAIN_ID="4663"
NEXT_PUBLIC_MAINNET_EXPLORER_URL="https://robinhoodchain.blockscout.com"
# Server-only (JANGAN NEXT_PUBLIC): urutan viem/fallback Alchemy -> publicnode -> public
RPC_TESTNET_ALCHEMY="https://robinhood-testnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
RPC_TESTNET_PN="https://robinhood-sepolia-rpc.publicnode.com"
RPC_TESTNET_PUBLIC="https://rpc.testnet.chain.robinhood.com"
RPC_MAINNET_ALCHEMY="https://robinhood-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
RPC_MAINNET_PN="https://robinhood-rpc.publicnode.com"
RPC_MAINNET_PUBLIC="https://rpc.mainnet.chain.robinhood.com"
ALCHEMY_API_KEY="your_alchemy_api_key"

# ==========================================================
# 3. SINGLE DEV OPERATOR WALLET (1 WALLET UNTUK SEMUA ROLE)
# ==========================================================
OPERATOR_PRIVATE_KEY="isi_via_cast_wallet_import_atau_env_lokal_JANGAN_paste_di_chat"
ADMIN_COLD_ADDRESS="0xYOUR_COLD_ADMIN_ADDRESS"
NEXT_PUBLIC_OPERATOR_ADDRESS="0xAeA64dd878A8F1746e920e5725E41dcA0057B651"
NEXT_PUBLIC_DEPLOYER_ADDRESS="0xAeA64dd878A8F1746e920e5725E41dcA0057B651"

# ==========================================================
# 4. MAINNET VERIFIED EXTERNAL CONTRACTS (CHAIN ID 4663)
# ==========================================================
NEXT_PUBLIC_MAINNET_USDG_ADDRESS="0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"
NEXT_PUBLIC_MAINNET_PONS_FACTORY="0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e"
NEXT_PUBLIC_MAINNET_PONS_FEE_ESCROW="0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e"
NEXT_PUBLIC_MAINNET_PONS_MEME_HOOK="0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044"
NEXT_PUBLIC_MAINNET_UNISWAP_V4_POOL_MANAGER="0x8366a39CC670B4001A1121B8F6A443a643e40951"
NEXT_PUBLIC_MAINNET_UNIVERSAL_ROUTER="0x8876789976dEcBfCbBbe364623C63652db8c0904"

# ==========================================================
# 5. DEPLOYED HAHA CONTRACTS (DIISI OTOMATIS OLEH SCRIPT DEPLOY FOUNDRY)
# ==========================================================
NEXT_PUBLIC_FEE_SPLITTER_ADDRESS=""
NEXT_PUBLIC_TIP_JAR_ADDRESS=""
NEXT_PUBLIC_MIC_DROP_ADDRESS=""
NEXT_PUBLIC_CROWD_STAKING_ADDRESS=""
NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS=""
NEXT_PUBLIC_PRODUCER_GATEWAY_ADDRESS=""
NEXT_PUBLIC_HAHA_TOKEN_ADDRESS=""

# ==========================================================
# 6. VPS + DOCKER (POSTGRES + REDIS)
# ==========================================================
VPS_HOST="43.134.60.117"
VPS_USER="ubuntu"
# DB lokal Docker (service db:5432, luar via SSH tunnel saja)
DATABASE_URL="postgresql://haha:${DB_PASSWORD}@db:5432/haha"
DIRECT_URL="postgresql://haha:${DB_PASSWORD}@db:5432/haha"
REDIS_URL="redis://redis:6379"

# ==========================================================
# 7. XIAOMI MIMO 2.6 PRO API (BIAYA PER TOKEN — bukan zero-cost murni)
# ==========================================================
# Estimasi kasar: 1 bit = 3-4 call (prescreen + straightman + 2x normalisasi).
# Wajib budget + rate-limit/kuota harian di /stage sebelum mainnet.
MIMO_API_BASE_URL="https://token-plan-sgp.xiaomimimo.com/v1"
MIMO_API_KEY="your_xiaomi_mimo_2_6_pro_api_key"
MIMO_MAIN_MODEL="mimo-v2.6-pro"
MIMO_FAST_MODEL="mimo-v2.6-flash"

# ==========================================================
# 8. CLOUDFLARE R2 (S3-COMPATIBLE) & TURNSTILE (FREE TIER)
# ==========================================================
R2_ACCOUNT_ID="your_cloudflare_account_id"
R2_ACCESS_KEY_ID="your_r2_access_key_id"
R2_SECRET_ACCESS_KEY="your_r2_secret_access_key"
R2_BUCKET_NAME="haha-storage"
# r2.dev hanya testnet; prod wajib custom domain + cache
NEXT_PUBLIC_R2_PUBLIC_URL="https://pub-xxxxxxxxxxxx.r2.dev"

NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x4AAAAAA..."
TURNSTILE_SECRET_KEY="0x4AAAAAA..."

# ==========================================================
# 9. SECURITY SECRETS (SESSION + OPS)
# ==========================================================
SESSION_SECRET="generate_random_32_byte_hex_for_siwe_jwt"
BULLMQ_BOARD_PASSWORD="generate_random_for_bullmq_dashboard"
TELEGRAM_BOT_TOKEN="ops_alert_token"
TELEGRAM_CHAT_ID="ops_chat_id"
```