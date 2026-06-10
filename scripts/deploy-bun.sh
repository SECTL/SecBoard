#!/usr/bin/env bash
set -euo pipefail

# SecBoard Bun Production Deployment Script
# Usage: ./scripts/deploy-bun.sh [environment]

ENVIRONMENT="${1:-production}"
APP_DIR="${SECBOARD_APP_DIR:-/opt/secboard}"
SERVICE_USER="${SECBOARD_USER:-secboard}"
SERVICE_NAME="secboard"

echo "==> Deploying SecBoard to $ENVIRONMENT at $APP_DIR"

# Pre-flight checks
if ! command -v bun >/dev/null 2>&1; then
  echo "ERROR: bun is not installed. Install from https://bun.sh" >&2
  exit 1
fi

if [ ! -d "$APP_DIR" ]; then
  echo "ERROR: $APP_DIR does not exist" >&2
  exit 1
fi

# Build
cd "$APP_DIR"
echo "==> Installing dependencies"
bun install --frozen-lockfile || pnpm install --frozen-lockfile

echo "==> Building frontend"
bun run build

# Restart service
if command -v systemctl >/dev/null 2>&1; then
  echo "==> Restarting systemd service"
  sudo systemctl restart "$SERVICE_NAME"
  sudo systemctl status "$SERVICE_NAME" --no-pager
elif command -v pm2 >/dev/null 2>&1; then
  echo "==> Reloading PM2"
  pm2 restart ecosystem.config.cjs
  pm2 save
else
  echo "WARNING: No process manager found (systemd or pm2)" >&2
  echo "  Start the server manually: bun run src/elysia/index.ts" >&2
fi

echo "==> Deployment complete"
