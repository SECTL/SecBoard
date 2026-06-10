#!/usr/bin/env sh
set -eu

bun run src/elysia/index.ts &
backend_pid="$!"

cleanup() {
  kill "$backend_pid" 2>/dev/null || true
  wait "$backend_pid" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

bun run scripts/docker-web-server.ts
