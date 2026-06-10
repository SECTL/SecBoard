# Cloudflare Workers + Pages 部署

Cloudflare 路径适合部署 Web 白板和跨设备同步。当前使用 [secboard-cf](../secboard-cf) 目录中的 Worker，而不是 `backend/cf/index.ts`。

## 能力边界

支持：

- `/health`
- `/rpc/post-command` 和 `/commands` 中的白板/设置/页面/工具类命令
- `/kv/*`
- `/ui/*` 和 `/ui-state/*`
- `/events`
- `/cunox/:path*` 文件读写
- `/img/file-to-data-url` 中的 data URL 处理

不支持或降级：

- 本机文件选择对话框
- 桌面 stdio RPC
- 手机投屏 WebRTC 信令
- 服务器本地文件路径读取

## 前置条件

- Node.js 22+ 或已安装 pnpm
- Cloudflare 账号
- Wrangler 3.95+

## 1. 安装依赖

```bash
cd secboard-cf
pnpm install
pnpm exec wrangler login
```

## 2. 创建 Cloudflare 资源

```bash
pnpm exec wrangler d1 create secboard-db
pnpm exec wrangler r2 bucket create secboard-files
```

把 D1 命令返回的 UUID 填入 [secboard-cf/wrangler.toml](../secboard-cf/wrangler.toml)：

```toml
[[d1_databases]]
binding = "DB"
database_name = "secboard-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

R2 bucket 默认名是 `secboard-files`：

```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "secboard-files"
```

生产请设置准确的来源：

```toml
[vars]
ALLOWED_ORIGIN = "https://secboard.example.com"
```

## 3. 初始化数据库

```bash
pnpm exec wrangler d1 execute secboard-db --file=./schema.sql --remote
```

本地开发可以使用：

```bash
pnpm exec wrangler d1 execute secboard-db --local --file=./schema.sql
pnpm exec wrangler dev
```

## 4. 部署 Worker

```bash
pnpm exec wrangler deploy
curl -fsS https://<worker-name>.<account>.workers.dev/health
```

如果 `wrangler deploy` 报 D1 binding 错误，通常是 `database_id` 仍是占位符，或数据库不属于当前账号。

## 5. 部署前端到 Pages

在项目根目录构建：

```bash
cd ..
VITE_PURE_FRONTEND=false \
VITE_LANSTART_API_BASE=https://<worker-name>.<account>.workers.dev \
pnpm run build
```

Pages 项目配置：

- Build command: `pnpm run build`
- Build output directory: `dist/web`
- Environment variables:
  - `VITE_PURE_FRONTEND=false`
  - `VITE_LANSTART_API_BASE=https://<worker-name>.<account>.workers.dev`

也可以手动上传：

```bash
pnpm exec wrangler pages deploy dist/web --project-name=secboard
```

## 6. 自定义域名

推荐：

- `https://secboard.example.com` 指向 Pages 前端。
- `https://secboard-api.example.com` 指向 Worker API。
- `ALLOWED_ORIGIN=https://secboard.example.com`。
- 前端 `VITE_LANSTART_API_BASE=https://secboard-api.example.com`。

如果把 Worker 作为 Pages Function 或同域反代使用，可以留空 `VITE_LANSTART_API_BASE`，但需要保证 `/rpc`、`/kv`、`/ui`、`/events` 等路径能到达 Worker。

## 7. 验证

```bash
curl -fsS https://secboard-api.example.com/health
curl -fsS https://secboard.example.com/
```

浏览器确认：

- 画笔能写出笔迹。
- 新建页面后每页内容独立。
- 刷新后页面状态能恢复。
- Network 面板中 `/rpc/post-command`、`/kv/*`、`/ui/*` 请求成功。

## 8. 配额和风险

- D1 负责 KV、UI State 和事件，频繁绘写会产生较多读写；生产需要关注 D1 配额。
- R2 负责 CUNOX 文件内容。
- Worker 不适合承载本地桌面能力和局域网投屏。
- `ALLOWED_ORIGIN="*"` 只适合开发测试。
