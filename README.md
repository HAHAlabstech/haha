# HAHA — AI Comedy Lab

Human comedians hold the mic against an AI Straight Man. The Crowd juries
blind, the results settle with real Merkle payouts (TipJar), and every
settled bit is hashed into The Joke Vault.

- **Prod (testnet 46630):** https://haha.asifaq.com
- **Chain:** Robinhood Chain — testnet `46630`, mainnet `4663` (prepared,
  NOT deployed — see `docs/MAINNET-HANDOFF.md`)
- Stack: Next.js (App Router) + Prisma/Postgres + BullMQ worker + Foundry
  suite + Cloudflare R2 + MiMo 2.6.

## Lokal dev (WSL docker)

```powershell
# 1) stack lokal: db pg16 (pass di .env) + redis 6380
wsl -d Ubuntu-22.04 -- docker start haha-db-local haha-redis-local

# 2) app + worker
npm run dev            # http://localhost:3000
npm run dev:worker     # BullMQ — laptop WAJIB: WORKER_CHAIN_WRITES=off di .env
```

## Cluster (VPS 43.134.60.117)

CI pipeline `haha-ci-deploy` (GitHub main push): migrasi → build/push →
compose up + healthcheck + preflight. Kontainer: `haha-app-1`,
`haha-worker-1`, `haha-db-1`, `haha-redis-1`, `haha-caddy-1`.

```powershell
# cepat cek kontainer / psql / job state
ssh -i "$env:USERPROFILE\.ssh\hadeh.pem" ubuntu@43.134.60.117 "docker ps"
... "docker exec -i haha-db-1 psql -U haha -d haha -c 'SELECT ...'"
```

## Cron pekerjaan (worker)

| Job | Jadwal | Fungsi |
| --- | --- | --- |
| `five-minute-ops` | `*/5` | SLA expire + re-seat, thin 5→7 top-up, plant stage-2, appeal retrial, **TipJar keeper (activate pending root)** |
| `daily-settlement` | `00:00` | harvest FeeSplitter → distribusi hadiah → Merkle + R2 → `proposeRoot` (epoch = chain `currentEpoch`+1) |
| `normalize` | event | A/B teks normalisasi |
| `weekly-vault` | mingguan | root VaultRegistry |

Status job: tabel `CronJobRun` (kolom `job_name/stage/status/last_error`).

## TipJar payout loop (penting saat QA)

1. Setiap 00:00 UTC settlement membangun tree (leaf = `keccak(keccak(account,
   cumulativeMicro))` — HARUS lewat `worker/lib/merkle.js`).
2. `proposeRoot(epoch, root, total)` + veto window `rootDelay` (600s
   testnet).
3. **Keeper** di tick 5-menit meng-`activateRoot()` otomatis setelah eta.
4. Klaim via UI: EIP-712 (`HAHA-TipJar`, contract `verifyingContract`) →
   `/api/rewards/claim` → `eth_sendTransaction` `TipJar.claim()`.

Klaim gagal `InvalidProof()` ⇒ root on-chain ≠ DB (cek `Epoch.merkle_root`
vs chain `merkleRoot()`), bukan bug UI.

## QA wallet bridge (uji end-to-end tanpa memegang MetaMask)

`initScript` CDP menginjeksi provider EIP-6963 per navigasi (hilang saat
reload; `initScript` harus dipasang ulang). Rantai:
`eth_requestAccounts → wallet_switchEthereumChain(null) → eth_chainId →
personal_sign`. Tanda tangan via `sign-bridge.cjs` (stdin JSON; kunci
operator dari `.env.worker`, key juri di pool temporer — jangan pernah
print/commit). ChainId jawab `0xb626`.

## Kontrak (testnet alamat aktif)

| Kontrak | Alamat |
| --- | --- |
| TipJar | `0x03f26784cFE5808DC4A669bbB6D410d08765a675` |
| FeeSplitter | `0xC79D6Bc6955844cB396cF67a66eD7f084fA19C7d` |
| MicDrop | `0xCEc9922655BCfFD4cec6A6aA1b9e992C1dfa1d28` |
| USDG (mock) | `0x6b72879a2144049a10b176a827f1603bdb0b72ab` |

## DILARANG

- broadcast mainnet tanpa lulus `docs/MAINNET-HANDOFF.md` §2. Gate
  `claimToken` sudah diperbaiki (claim-ledger + selector scan); interface
  escrow live sudah diverifikasi read-only di 4663, tetapi full fork dry-run
  masih butuh RPC archive-capable dan deploy nyata tetap menunggu
  audit/legal/sanctions/geo. Tidak ada broadcast dalam sesi ini.
- commit `.env*`, `next-env.d.ts`, gambar hasil QA di root repo.
- membangun Merkle tree manual untuk klaim (punya server yang menulis).
