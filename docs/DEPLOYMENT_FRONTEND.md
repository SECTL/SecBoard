# 纯前端静态部署

纯前端模式不需要后端，适合演示、离线白板或个人浏览器本地使用。数据保存在当前浏览器的 IndexedDB 中，不会自动同步到其他设备。

## 前置条件

- Node.js 22+ 或 Bun 1.1+
- pnpm 10 或 Bun
- 任意静态托管平台

## 1. 配置

创建或修改 `.env.production`：

```env
VITE_PURE_FRONTEND=true
```

不要设置 `VITE_LANSTART_API_BASE`，除非你想连接远端 API。

## 2. 构建

```bash
corepack enable
corepack prepare pnpm@10 --activate
pnpm install --frozen-lockfile
pnpm run build:frontend
```

或使用 Bun：

```bash
bun install --frozen-lockfile
bun run build:frontend
```

构建产物位于 `dist/web`。

## 3. Nginx 静态部署

```nginx
server {
    listen 80;
    server_name secboard.example.com;
    root /var/www/secboard/dist/web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|webp|gif|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}
```

## 4. Cloudflare Pages

Pages 配置：

- Build command: `pnpm run build:frontend`
- Build output directory: `dist/web`
- Environment variables:
  - `VITE_PURE_FRONTEND=true`

如果手动上传：

```bash
pnpm exec wrangler pages deploy dist/web --project-name=secboard
```

## 5. Netlify

`netlify.toml` 示例：

```toml
[build]
  command = "pnpm run build:frontend"
  publish = "dist/web"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

环境变量：

```env
VITE_PURE_FRONTEND=true
```

## 6. Vercel

`vercel.json` 示例：

```json
{
  "buildCommand": "pnpm run build:frontend",
  "outputDirectory": "dist/web",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

环境变量：

```env
VITE_PURE_FRONTEND=true
```

## 7. 连接远端 API

如果要让静态前端连接 Bun 后端或 Cloudflare Worker：

```env
VITE_PURE_FRONTEND=false
VITE_LANSTART_API_BASE=https://api.secboard.example.com
```

重新构建前端。此时 `/rpc`、`/kv`、`/ui`、`/events` 等请求会发送到 `VITE_LANSTART_API_BASE`。

## 8. 验证

浏览器确认：

- 白板能写字。
- 刷新后本浏览器的数据还在。
- 开发者工具 Application 面板中可以看到 IndexedDB。
- 换浏览器或清理站点数据后，白板数据会消失。

## 限制

- 无跨设备同步。
- 无服务器端导入导出。
- 本地文件选择和投屏能力会降级。
- 不适合多人共享同一块白板。
