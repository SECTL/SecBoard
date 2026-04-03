#!/bin/bash
# SecBoard Cloudflare 部署脚本

set -e

echo "========================================="
echo "SecBoard Cloudflare 部署脚本"
echo "========================================="

cd "$(dirname "$0")"

echo ""
echo "[1/5] 安装依赖..."
pnpm install

echo ""
echo "[2/5] 登录 Cloudflare..."
wrangler login --no-interactive || true

echo ""
echo "[3/5] 创建 D1 数据库..."
wrangler d1 create secboard-db 2>/dev/null || echo "数据库可能已存在，跳过创建"

echo ""
echo "[4/5] 初始化数据库表..."
pnpm run deploy:d1

echo ""
echo "[5/5] 部署 Worker 到 Cloudflare..."
pnpm run deploy

echo ""
echo "========================================="
echo "Worker 部署完成!"
echo "========================================="
echo ""
echo "部署前端到 Cloudflare Pages:"
echo "  cd .."
echo "  bun run build"
echo "  wrangler pages deploy dist/web --project-name=secboard"
echo ""
