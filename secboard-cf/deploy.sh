#!/bin/bash
# SecBoard Cloudflare 部署脚本

set -e

echo "========================================="
echo "SecBoard Cloudflare 部署脚本"
echo "========================================="

# 检查 pnpm 是否安装
if ! command -v pnpm &> /dev/null; then
    echo "错误: 请先安装 pnpm"
    echo "运行: npm install -g pnpm"
    exit 1
fi

# 检查 wrangler 是否安装
if ! command -v wrangler &> /dev/null; then
    echo "错误: 请先安装 wrangler"
    echo "运行: pnpm add -g wrangler"
    exit 1
fi

cd "$(dirname "$0")"

echo ""
echo "[1/4] 安装依赖..."
pnpm install

echo ""
echo "[2/4] 登录 Cloudflare (如果未登录)..."
wrangler login --no-interactive || true

echo ""
echo "[3/4] 创建 D1 数据库..."
wrangler d1 create secboard-db 2>/dev/null || echo "数据库可能已存在，跳过创建"

echo ""
echo "[4/4] 部署到 Cloudflare..."
pnpm run deploy

echo ""
echo "========================================="
echo "部署完成!"
echo "========================================="
echo ""
echo "接下来需要:"
echo "1. 在 Cloudflare Dashboard 配置 D1 database_id"
echo "2. 运行: pnpm run deploy:d1"
echo "3. 部署前端到 Cloudflare Pages"
echo ""
