# Docker Compose 部署

Docker 路径用于快速自托管和试运行。当前镜像包含两个进程：

- `src/elysia/index.ts`：完整 Bun 后端，监听 `3131`，SQLite 数据存在 `/app/data/lanstart.sqlite`。
- `scripts/docker-web-server.ts`：静态前端服务器，监听 `8080`，托管 `dist/web` 并同源代理 API 到 `3131`。

## 前置条件

- Docker 20.10+
- Docker Compose v2+

## 快速启动

```bash
cp .env.example .env
# 按需修改 LANSTART_ALLOWED_ORIGINS、LANSTART_API_TOKEN
docker compose up -d --build
```

访问：

- 前端：`http://localhost:8080`
- 后端健康检查：`http://localhost:8080/health`
- 直接后端：`http://localhost:3131/health`

## 环境变量

`docker-compose.yml` 默认设置：

```env
LANSTART_BACKEND_HOST=0.0.0.0
LANSTART_BACKEND_PORT=3131
LANSTART_CAST_HOST=0.0.0.0
LANSTART_CAST_PORT=3132
LANSTART_DB_PATH=/app/data/lanstart.sqlite
LANSTART_ALLOWED_ORIGINS=http://localhost:8080
SECBOARD_WEB_PORT=8080
SECBOARD_BACKEND_ORIGIN=http://127.0.0.1:3131
```

公网部署时，至少修改：

```env
LANSTART_ALLOWED_ORIGINS=https://secboard.example.com
LANSTART_API_TOKEN=<random-token-if-you-protect-api>
```

如果使用公开前端，`LANSTART_API_TOKEN` 不是强秘密，因为浏览器需要携带它。更推荐在反向代理或 Cloudflare Access 层做访问控制。

## 数据持久化

Compose 会把宿主机 `./data` 挂载到容器 `/app/data`。备份时保留：

```bash
tar -czf secboard-data-$(date +%Y%m%d).tar.gz data/
```

## 反向代理

最简单的生产拓扑是反代 `8080`：

```nginx
server {
    listen 443 ssl http2;
    server_name secboard.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

如果你想由 Nginx 直接托管静态文件，也可以改用 [nginx.conf.example](../nginx.conf.example)，但那更适合非 Docker 的 Linux 部署。

## 常用命令

```bash
docker compose logs -f secboard
docker compose ps
docker compose restart secboard
docker compose pull
docker compose up -d --build
```

## 验证清单

```bash
curl -fsS http://127.0.0.1:8080/health
curl -I http://127.0.0.1:8080/
```

浏览器里确认：

- 首页能打开。
- 画笔能写出笔迹。
- 刷新后笔迹仍在。
- 多页面切换后页面内容不串页。

## 已知限制

- 单容器内同时跑后端和静态服务器，适合轻量部署；大规模生产可拆成独立静态服务和后端服务。
- WebRTC 信令是内存态，多容器多副本部署需要 sticky session 或外部信令存储。
- SQLite 不适合多个后端容器同时写同一数据库文件。
