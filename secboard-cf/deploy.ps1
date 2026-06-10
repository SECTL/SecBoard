# SecBoard Cloudflare 部署脚本 (Windows)

$ErrorActionPreference = "Stop"

# Pre-flight checks
Write-Host "==> Checking wrangler installation..."
$wranglerOk = $false
try { $null = pnpm exec wrangler --version 2>&1; $wranglerOk = ($LASTEXITCODE -eq 0) } catch { $wranglerOk = $false }
if (-not $wranglerOk) {
  Write-Error "wrangler is not installed. Run: pnpm install"
  exit 1
}

Write-Host "==> Checking wrangler authentication..."
try {
  $null = pnpm exec wrangler whoami 2>&1
  if ($LASTEXITCODE -ne 0) { throw }
  Write-Host "Authenticated."
} catch {
  Write-Error "Not logged in to Cloudflare. Run: pnpm exec wrangler login"
  exit 1
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "SecBoard Cloudflare 部署脚本" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[1/5] 安装依赖..." -ForegroundColor Green
pnpm install

Write-Host "[2/5] 登录 Cloudflare..." -ForegroundColor Green
wrangler login --no-interactive 2>$null

Write-Host "[3/5] 创建 D1 数据库..." -ForegroundColor Green
$createOutput = wrangler d1 create secboard-db 2>&1
Write-Host $createOutput -ForegroundColor Yellow
Write-Host "请将返回的 database_id 填入 wrangler.toml" -ForegroundColor Yellow

Write-Host "[4/5] 初始化数据库表..." -ForegroundColor Green
pnpm run deploy:d1

Write-Host "[5/5] 部署 Worker 到 Cloudflare..." -ForegroundColor Green
pnpm run deploy

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Worker 部署完成!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "部署前端到 Cloudflare Pages:" -ForegroundColor Yellow
Write-Host "  cd .." -ForegroundColor Gray
Write-Host "  bun run build" -ForegroundColor Gray
Write-Host "  wrangler pages deploy dist/web --project-name=secboard" -ForegroundColor Gray
Write-Host ""
