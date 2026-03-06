# SecBoard Cloudflare 部署脚本 (Windows)

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "SecBoard Cloudflare 部署脚本" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 请先安装 pnpm" -ForegroundColor Red
    Write-Host "运行: npm install -g pnpm" -ForegroundColor Yellow
    exit 1
}

# 检查 wrangler
if (-not (Get-Command wrangler -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 请先安装 wrangler" -ForegroundColor Red
    Write-Host "运行: pnpm add -g wrangler" -ForegroundColor Yellow
    exit 1
}

Set-Location $PSScriptRoot

Write-Host "[1/4] 安装依赖..." -ForegroundColor Green
pnpm install

Write-Host "[2/4] 登录 Cloudflare..." -ForegroundColor Green
wrangler login --no-interactive 2>$null

Write-Host "[3/4] 创建 D1 数据库..." -ForegroundColor Green
wrangler d1 create secboard-db 2>$null
Write-Host "数据库已创建或已存在" -ForegroundColor Yellow

Write-Host "[4/4] 部署到 Cloudflare..." -ForegroundColor Green
pnpm run deploy

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "部署完成!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "接下来需要:" -ForegroundColor Yellow
Write-Host "1. 在 Cloudflare Dashboard 配置 D1 database_id"
Write-Host "2. 运行: pnpm run deploy:d1"
Write-Host "3. 部署前端到 Cloudflare Pages"
Write-Host ""
