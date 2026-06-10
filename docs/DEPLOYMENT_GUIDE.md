# SecBoard 部署指南

本文档按当前代码可验证的部署能力编写。SecBoard 目前有三条推荐路径：

| 场景 | 推荐方式 | 状态 |
| --- | --- | --- |
| Linux/VPS/内网服务器，功能最完整 | Bun 主后端 + 静态前端 + Nginx/Caddy | 推荐 |
| 快速自托管或试运行 | Docker Compose | 推荐 |
| 无服务器 Web 白板 | Cloudflare Workers + Pages | 可用，但不包含本地文件选择和投屏信令 |
| 只要浏览器本地白板 | 纯前端静态部署 | 可用，数据保存在浏览器 IndexedDB |
| `backend/node` / `backend/bun` 模块 | 仅用于适配器实验 | 不作为生产完整后端推荐 |

## 运行时边界

当前完整业务后端入口是 [src/elysia/index.ts](../src/elysia/index.ts)，包含命令处理、白板状态、KV、UI State、CUNOX、图片转换、CS 代理和 WebRTC 信令。`backend/` 目录下的模块化后端只实现基础 KV/UI State/Events，不覆盖完整白板业务，因此部署教程默认不使用它。

生产前端默认使用同源 API，也就是 `/health`、`/rpc/post-command`、`/kv/*` 等路径。如果前端和后端分离在不同域名，才需要在构建前设置：

```env
VITE_LANSTART_API_BASE=https://api.example.com
```

## 快速开始

### 1. 本地验证生产构建

```bash
corepack enable
corepack prepare pnpm@10 --activate
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
```

如果使用 Bun：

```bash
bun install --frozen-lockfile
bun run typecheck
bun run build
```

构建产物在 `dist/web`。

### 2. Linux 服务器

```bash
sudo mkdir -p /opt/secboard
sudo chown "$USER":"$USER" /opt/secboard
git clone <repo-url> /opt/secboard
cd /opt/secboard

cp .env.example .env
# 修改 .env 中的 LANSTART_ALLOWED_ORIGINS、LANSTART_DB_PATH、LANSTART_API_TOKEN

bun install --frozen-lockfile
bun run build
sudo cp secboard.service /etc/systemd/system/secboard.service
sudo systemctl daemon-reload
sudo systemctl enable --now secboard
curl http://127.0.0.1:3131/health
```

前端静态文件由 Nginx 或 Caddy 托管，API 路径反代到 `127.0.0.1:3131`，投屏信令反代到 `127.0.0.1:3132`。示例见 [nginx.conf.example](../nginx.conf.example) 和 [Caddyfile.example](../Caddyfile.example)。

### 3. Docker Compose

```bash
cp .env.example .env
docker compose up -d --build
curl http://127.0.0.1:8080/health
```

浏览器打开 `http://localhost:8080`。容器内置一个轻量静态服务器，负责托管 `dist/web` 并把 API 路径同源代理到后端。

### 4. Cloudflare Workers + Pages

```bash
cd secboard-cf
pnpm install
pnpm exec wrangler login
pnpm exec wrangler d1 create secboard-db
pnpm exec wrangler r2 bucket create secboard-files
```

将 D1 返回的 `database_id` 填入 [secboard-cf/wrangler.toml](../secboard-cf/wrangler.toml)，然后：

```bash
pnpm exec wrangler d1 execute secboard-db --file=./schema.sql --remote
pnpm exec wrangler deploy
```

前端 Pages 构建时设置：

```env
VITE_PURE_FRONTEND=false
VITE_LANSTART_API_BASE=https://<worker-name>.<account>.workers.dev
```

Cloudflare 路径支持白板状态、KV、UI State、事件、部分 CUNOX 文件接口；不支持本机文件选择、桌面 stdio RPC 和手机投屏信令。

### 5. 纯前端静态部署

构建前设置：

```env
VITE_PURE_FRONTEND=true
```

然后运行：

```bash
pnpm run build:frontend
```

将 `dist/web` 部署到任意静态平台即可。此模式所有数据保存在当前浏览器的 IndexedDB，不会跨设备同步。

## 生产环境变量

| 变量 | 用途 | 建议 |
| --- | --- | --- |
| `LANSTART_BACKEND_HOST` | 后端监听地址 | 服务器部署用 `127.0.0.1`，容器用 `0.0.0.0` |
| `LANSTART_BACKEND_PORT` | 主 API 端口 | 默认 `3131` |
| `LANSTART_CAST_HOST` | 投屏信令监听地址 | 默认 `0.0.0.0` |
| `LANSTART_CAST_PORT` | 投屏信令端口 | 默认 `3132` |
| `LANSTART_DB_PATH` | SQLite 数据库路径 | 生产用 `/opt/secboard/data/lanstart.sqlite` |
| `LANSTART_ALLOWED_ORIGINS` | 允许的浏览器 Origin | 公网部署必须设为真实域名 |
| `LANSTART_API_TOKEN` | Bearer token 鉴权 | 适合服务端/API 私有访问；公开前端中不是强秘密 |
| `LANSTART_CS_BASE_URL` | `/cs/*` 代理上游 | 不需要就留空 |
| `LANSTART_CS_ALLOW_HOSTS` | `/cs/*` 主机白名单 | 公网部署必须限制 |
| `VITE_PURE_FRONTEND` | 是否构建纯前端模式 | 静态纯前端设为 `true` |
| `VITE_LANSTART_API_BASE` | 分离 API 域名 | 同源部署留空 |

## 部署后检查

```bash
curl -fsS http://127.0.0.1:3131/health
curl -fsS https://yourdomain.com/health
curl -I https://yourdomain.com/
curl -I https://yourdomain.com/assets/
```

浏览器检查项：

- 白板能切到画笔并写出笔迹。
- 刷新后当前白板页数据仍在。
- 多页面切换后每页笔迹互不串页。
- 设置页、浮动栏、页面缩略栏可以打开和关闭。
- 如果启用投屏，手机打开 `/webrtc/` 能创建会话。

## 安全提示

`LANSTART_API_TOKEN` 会随前端构建暴露给浏览器时，不应被视为强保密凭据。公网生产建议至少使用 HTTPS、外层访问控制、VPN、Cloudflare Access、Basic Auth 或反向代理层鉴权；同时设置 `LANSTART_ALLOWED_ORIGINS` 和 `LANSTART_CS_ALLOW_HOSTS`，不要把 API 裸露给任意来源。

## 详细文档

- [Bun/Linux 部署](./DEPLOYMENT_BUN.md)
- [Docker Compose 部署](./DEPLOYMENT_DOCKER.md)
- [Cloudflare 部署](./DEPLOYMENT_CF.md)
- [纯前端部署](./DEPLOYMENT_FRONTEND.md)
- [部署审计](../DEPLOYMENT_AUDIT.md)
