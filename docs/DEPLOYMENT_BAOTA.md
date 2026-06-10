# 宝塔面板部署

宝塔面板适合管理 Nginx、证书和站点目录。SecBoard 的真实部署步骤仍以 [Bun/Linux 完整部署](./DEPLOYMENT_BUN.md) 为准。

## 推荐拓扑

- 前端静态目录：`/www/wwwroot/secboard/dist/web`
- Bun 后端工作目录：`/www/wwwroot/secboard`
- 后端监听：`127.0.0.1:3131`
- 投屏信令监听：`127.0.0.1:3132`
- Nginx 由宝塔管理，负责 HTTPS、静态文件和反向代理。

## 部署代码

```bash
cd /www/wwwroot
git clone <repo-url> secboard
cd secboard
cp .env.example .env
bun install --frozen-lockfile
bun run typecheck
bun run build
```

`.env` 建议：

```env
LANSTART_BACKEND_HOST=127.0.0.1
LANSTART_BACKEND_PORT=3131
LANSTART_CAST_HOST=127.0.0.1
LANSTART_CAST_PORT=3132
LANSTART_DB_PATH=/www/wwwroot/secboard/data/lanstart.sqlite
LANSTART_ALLOWED_ORIGINS=https://secboard.example.com
```

## 后端进程

优先使用 systemd，参考 [secboard.service](../secboard.service)。如果必须使用宝塔 PM2 管理器，启动命令应是：

```bash
bun run src/elysia/index.ts
```

不要使用 `backend/node/index.ts` 或 `backend/dist/*` 作为生产入口。

## 宝塔站点配置

站点根目录设置为：

```text
/www/wwwroot/secboard/dist/web
```

反向代理路径：

- `/rpc` -> `http://127.0.0.1:3131`
- `/kv` -> `http://127.0.0.1:3131`
- `/ui` -> `http://127.0.0.1:3131`
- `/ui-state` -> `http://127.0.0.1:3131`
- `/events` -> `http://127.0.0.1:3131`
- `/cunox` -> `http://127.0.0.1:3131`
- `/img` -> `http://127.0.0.1:3131`
- `/dialog` -> `http://127.0.0.1:3131`
- `/cs` -> `http://127.0.0.1:3131`
- `/health` -> `http://127.0.0.1:3131`
- `/webrtc` -> `http://127.0.0.1:3132`

URL 重写：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## 验证

```bash
curl -fsS http://127.0.0.1:3131/health
curl -fsS https://secboard.example.com/health
```
