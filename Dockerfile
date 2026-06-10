# --- Build stage ---
FROM oven/bun:1.1.38 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# --- Runtime stage ---
FROM oven/bun:1.1.38-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/src /app/src
COPY --from=builder /app/scripts /app/scripts
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/bun.lock /app/bun.lock

RUN mkdir -p /app/data /app/logs
RUN chmod +x /app/scripts/docker-entrypoint.sh
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD bun -e "fetch('http://127.0.0.1:8080/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" || exit 1

ENV NODE_ENV=production
ENV LANSTART_BACKEND_HOST=0.0.0.0
ENV LANSTART_BACKEND_PORT=3131
ENV LANSTART_CAST_HOST=0.0.0.0
ENV LANSTART_CAST_PORT=3132
ENV LANSTART_DB_PATH=/app/data/lanstart.sqlite
ENV SECBOARD_WEB_HOST=0.0.0.0
ENV SECBOARD_WEB_PORT=8080
ENV SECBOARD_BACKEND_ORIGIN=http://127.0.0.1:3131

EXPOSE 8080 3131 3132

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "/app/scripts/docker-entrypoint.sh"]
