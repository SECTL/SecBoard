#!/bin/bash
# SecBoard Cloudflare 部署脚本

set -e

echo "========================================="
echo "SecBoard Cloudflare 部署脚本"
echo "========================================="

# Pre-flight checks
echo "==> Checking wrangler installation..."
if ! command -v wrangler >/dev/null 2>&1 && ! pnpm exec wrangler --version >/dev/null 2>&1; then
  echo "ERROR: wrangler is not installed. Run: pnpm install" >&2
  exit 1
fi

echo "==> Checking wrangler authentication..."
if ! pnpm exec wrangler whoami >/dev/null 2>&1; then
  echo "ERROR: Not logged in to Cloudflare. Run: pnpm exec wrangler login" >&2
  exit 1
fi

echo "==> Checking D1 database exists..."
if pnpm exec wrangler d1 list 2>/dev/null | grep -q "secboard-db"; then
  echo "D1 database found."
else
  echo "WARNING: D1 database 'secboard-db' not found." >&2
  echo "  Create it with: pnpm exec wrangler d1 create secboard-db" >&2
  echo "  Then update database_id in wrangler.toml" >&2
fi

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
