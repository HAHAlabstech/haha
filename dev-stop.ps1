# dev-stop.ps1 — matikan window app + worker (infra WSL dibiarkan jalan).
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
  $_.MainWindowTitle -match "HAHA" -or $true
} | Out-Null

# Sederhana & aman: matikan semua proses node yang parent-nya PowerShell "dev" window
$devProcs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match "next dev|worker/index.js|--env-file=\.env" }
foreach ($p in $devProcs) {
  Write-Host "matikan: $($p.ProcessId) $($p.CommandLine.Substring(0, [Math]::Min(60, $p.CommandLine.Length)))"
  Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
Write-Host "✅ app + worker dimatikan (infra WSL tetap hidup)" -ForegroundColor Green
Write-Host "   infra penuh  : wsl -d Ubuntu-22.04 -- docker stop haha-db-local haha-redis-local"
Write-Host "   pulihkan     : .\dev.ps1"
