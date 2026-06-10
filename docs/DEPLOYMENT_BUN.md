# Bun/Linux 完整部署

这是 SecBoard 当前推荐的生产路径。完整后端入口是 `src/elysia/index.ts`，运行在 Bun 上；前端用 Vite 构建到 `dist/web`，由 Nginx/Caddy 托管。

## 前置条件

- Ubuntu 22.04+ / Debian 12+ / CentOS Stream 9+
- Bun 1.1+
- Git
- Nginx 或 Caddy
- 512 MB 以上内存

## 1. 准备目录和用户

```bash
sudo useradd -r -s /usr/sbin/nologin secboard || true
sudo mkdir -p /opt/secboard
sudo chown "$USER":"$USER" /opt/secboard
git clone <repo-url> /opt/secboard
cd /opt/secboard
```

## 2. 安装和构建

```bash
bun install --frozen-lockfile
bun run typecheck
bun run build
```

`dist/web` 是前端静态文件目录。

## 3. 配置环境

```bash
cp .env.example .env
mkdir -p data logs
```

生产建议：

```env
NODE_ENV=production
LANSTART_BACKEND_HOST=127.0.0.1
LANSTART_BACKEND_PORT=3131
LANSTART_CAST_HOST=127.0.0.1
LANSTART_CAST_PORT=3132
LANSTART_DB_PATH=/opt/secboard/data/lanstart.sqlite
LANSTART_ALLOWED_ORIGINS=https://secboard.example.com
LANSTART_API_TOKEN=
LANSTART_CS_BASE_URL=
LANSTART_CS_ALLOW_HOSTS=
```

如果你通过公开前端访问 API，`LANSTART_API_TOKEN` 会暴露在浏览器侧，不能替代反向代理层鉴权。

## 4. systemd

编辑 [secboard.service](../secboard.service) 中的路径和 Bun 路径，确认：

```ini
WorkingDirectory=/opt/secboard
EnvironmentFile=/opt/secboard/.env
ExecStart=/usr/local/bin/bun run src/elysia/index.ts
```

安装服务：

```bash
sudo chown -R secboard:secboard /opt/secboard/data /opt/secboard/logs
sudo cp secboard.service /etc/systemd/system/secboard.service
sudo systemctl daemon-reload
sudo systemctl enable --now secboard
sudo systemctl status secboard
curl -fsS http://127.0.0.1:3131/health
```

## 5. Nginx

复制 [nginx.conf.example](../nginx.conf.example)，替换域名和证书路径：

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/secboard
sudo ln -s /etc/nginx/sites-available/secboard /etc/nginx/sites-enabled/secboard
sudo nginx -t
sudo systemctl reload nginx
```

关键路径：

- `/` 托管 `/opt/secboard/dist/web`
- `/rpc`、`/kv`、`/ui`、`/ui-state`、`/events`、`/cunox`、`/img`、`/dialog`、`/cs`、`/health` 反代到 `3131`
- `/webrtc` 反代到 `3132`

## 6. Caddy

也可以使用 [Caddyfile.example](../Caddyfile.example)：

```bash
sudo cp Caddyfile.example /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 7. 更新

```bash
cd /opt/secboard
git pull --ff-only
bun install --frozen-lockfile
bun run build
sudo systemctl restart secboard
curl -fsS http://127.0.0.1:3131/health
```

## 8. 备份

```bash
tar -czf /backup/secboard-$(date +%Y%m%d).tar.gz /opt/secboard/data
```

## 已知限制

- SQLite 和内存事件/WebRTC 状态适合单实例部署。
- 多实例部署必须先外置事件、WebRTC 信令和写入协调。
- `/cs/*` 是代理能力，公网部署时必须设置 `LANSTART_CS_ALLOW_HOSTS` 或保持禁用。
