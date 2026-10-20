# dev.ps1 — nyalain seluruh HAHA stack lokal dalam sekali klik.
#
#   .\dev.ps1        -> infra (pg/redis di WSL) + app :3000 + worker, 2 window baru
#   .\dev-stop.ps1   -> matikan app + worker window, skip infra
#
# Prasyarat (sudah disetel):
#   - WSL Ubuntu-22.04 dengan docker engine aktif (systemd enabled)
#   - Container: haha-db-local (pgvector pg16 @ 127.0.0.1:5432)
#                haha-redis-local (redis 7 @ 127.0.0.1:6380)
#   - root .env (merganjan .env.app + kredensial lokal)
#   - Migrations & seed sudah dijalankan (npx prisma migrate deploy && npx prisma db seed)

$wslDistro = "Ubuntu-22.04"

# 0. Tambah WSL → pastikan VM hidup + container nyala (restart-leftover case)
$Keep = Get-Process -Name "wsl" -ErrorAction SilentlyContinue
if (-not $Keep) {
  Start-Process wsl -ArgumentList "-d", $wslDistro, "--", "sleep", "100000000" -WindowStyle Hidden
}
wsl -d $wslDistro -- docker start haha-db-local haha-redis-local *> $null
Start-Sleep -Seconds 4

# 1. App (Next dev) di window sendiri
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$PWD'; Write-Host 'HAHA app -> http://localhost:3000' -ForegroundColor Yellow; npm run dev"
) -WindowStyle Minimized

# 2. Worker (BullMQ + cron + AI jobs) di window sendiri
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$PWD'; Write-Host 'HAHA worker (env=.env)' -ForegroundColor Yellow; npm run dev:worker"
) -WindowStyle Minimized

Write-Host ""
Write-Host "✅ HAHA lokal dinyalakan" -ForegroundColor Green
Write-Host "   App    : http://localhost:3000"
Write-Host "   Worker : jalan di window minimized (BullMQ: bits, epochs, fiveMinuteOps, share-card)"
Write-Host "   DB     : 127.0.0.1:5432 (pg local) · Redis : 127.0.0.1:6380"
Write-Host "   Matin  : .\dev-stop.ps1"
