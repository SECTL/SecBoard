# SecBoard Production Deployment

For the full current guide, start with [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md).

## Recommended Paths

| Path | Use case | Status |
| --- | --- | --- |
| Bun backend + Nginx/Caddy | Full Linux/VPS production deployment | Recommended |
| Docker Compose | Quick self-hosting and trial deployments | Recommended |
| Cloudflare Workers + Pages | Serverless web whiteboard | Supported with feature limits |
| Static frontend only | Browser-local whiteboard | Supported |
| `backend/node` | Adapter experiments | Not recommended for production |

## Bun + systemd Quick Start

```bash
curl -fsSL https://bun.sh/install | bash
sudo mkdir -p /opt/secboard
sudo chown "$USER":"$USER" /opt/secboard
git clone <repo-url> /opt/secboard
cd /opt/secboard

cp .env.example .env
# Edit LANSTART_ALLOWED_ORIGINS, LANSTART_DB_PATH, and optional LANSTART_API_TOKEN.

bun install --frozen-lockfile
bun run typecheck
bun run build

sudo chown -R secboard:secboard /opt/secboard/data /opt/secboard/logs
sudo cp secboard.service /etc/systemd/system/secboard.service
sudo systemctl daemon-reload
sudo systemctl enable --now secboard
curl -fsS http://127.0.0.1:3131/health
```

Serve `dist/web` through Nginx or Caddy and proxy API paths to `127.0.0.1:3131`; proxy `/webrtc` to `127.0.0.1:3132`.

## Docker Quick Start

```bash
cp .env.example .env
docker compose up -d --build
curl -fsS http://127.0.0.1:8080/health
```

Open `http://localhost:8080`. The container serves `dist/web` on `8080` and proxies API paths to the Bun backend on `3131`.

## Security Checklist

- Set `LANSTART_ALLOWED_ORIGINS` to real production origins.
- Use HTTPS at the reverse proxy.
- Keep only 80/443 public where possible.
- Back up the SQLite file under `data/`.
- Treat frontend-visible API tokens as weak protection; use reverse-proxy auth, VPN, or Cloudflare Access for public deployments.
- Keep `/cs/*` disabled unless `LANSTART_CS_ALLOW_HOSTS` is tightly scoped.

## Health Checks

```bash
curl -fsS http://127.0.0.1:3131/health
curl -fsS https://secboard.example.com/health
```

The expected backend response includes `{"ok":true,"port":3131,"pureFrontend":false}`.
