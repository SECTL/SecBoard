# SecBoard 部署可行性审计

> 审计日期：2026-06-09  
> 范围：前端构建、Bun 主后端、Docker Compose、Cloudflare Workers + Pages、纯前端静态部署、Node 适配器后端

## 结论

| 部署方式 | 当前结论 | 说明 |
| --- | --- | --- |
| Bun 主后端 + Nginx/Caddy | 可作为完整生产路径 | 使用 `src/elysia/index.ts`，功能覆盖最完整 |
| Docker Compose | 可作为轻量自托管路径 | 容器内前端监听 `8080`，后端监听 `3131` |
| Cloudflare Workers + Pages | 可部署 Web 白板，能力有边界 | 不支持桌面 stdio、本机文件选择和 WebRTC 投屏 |
| 纯前端静态部署 | 可部署，数据本地化 | 数据只在当前浏览器 IndexedDB |
| `backend/node` / `backend/bun` | 不建议生产 | 只实现基础 KV/UI State/Events，不是完整产品后端 |

## 已处理的部署阻塞

- 根脚本移除了对 `bunx` 的强依赖，`pnpm`/CI 环境可以调用本地 `vite`、`tsc`、`vitest`。
- 生产前端 API 默认从 `http://127.0.0.1:3131` 改为同源路径，适配 Nginx、Caddy、Docker、Pages 反代。
- Dockerfile 去掉非法 `COPY ... 2>/dev/null || true` 写法，改为 Bun lockfile 安装。
- Docker 镜像增加 `scripts/docker-web-server.ts`，可直接打开 `http://localhost:8080` 使用前端。
- `pnpm-workspace.yaml` 明确只包含根项目，避免根 lockfile 与 `secboard-cf` 子项目 lockfile 混用；同时声明允许构建 `better-sqlite3`、`esbuild`。
- Cloudflare 文档改为 `secboard-cf` 的 D1/R2 Worker，不再混用不完整的 `backend/cf` 路径。
- Node 文档改为状态说明，避免把不完整适配器误导为生产后端。

## 仍需注意的风险

### 1. 单实例假设

主后端使用 SQLite，事件和 WebRTC 信令仍有内存状态。单实例部署是当前推荐拓扑。多实例部署前，需要外置事件队列、信令状态和写入协调。

### 2. 前端可见 token 不是强安全边界

`LANSTART_API_TOKEN` 如果由浏览器前端携带，就会出现在构建产物或网络请求中。公网部署应使用 HTTPS、反向代理鉴权、VPN、Cloudflare Access 或内网访问控制。

### 3. Cloudflare 配额和能力边界

Cloudflare Worker 使用 D1 存储 KV/UI State/Events，频繁操作会消耗 D1 读写配额。Worker 不具备服务器本地文件路径访问能力，也没有手机投屏 WebRTC 信令。

### 4. `/cs/*` 代理需要白名单

公网部署时不要随意开启 `LANSTART_CS_BASE_URL`。如果启用，必须设置 `LANSTART_CS_ALLOW_HOSTS`，避免代理能力被滥用。

### 5. 本机 Windows pnpm shim

本机 PowerShell 执行 `pnpm` shim 可能被执行策略阻止；Windows 验证可以用 `pnpm.cmd` 或 Bun。Linux/CI 推荐 `corepack prepare pnpm@10 --activate`。

## 平台检查清单

## 本轮验证结果

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| 根项目类型检查 | 通过 | `bun run typecheck` |
| 部署脚本类型检查 | 通过 | `bun run typecheck:scripts` |
| 生产前端构建 | 通过 | `bun run build` 生成 `dist/web` |
| 纯前端构建 | 通过 | `bun run build:frontend` |
| 前端适配器测试 | 通过 | `bunx vitest run src/status/__tests__/webLanstartAdapter.test.ts`，3 tests |
| Cloudflare Worker 类型检查 | 通过 | `cd secboard-cf && bun run typecheck` |
| Bun 主后端健康检查 | 通过 | 临时端口 `5931` 返回 `{"ok":true,"port":5931,"pureFrontend":false}` |
| WebRTC 信令健康检查 | 通过 | 临时端口 `3932/webrtc/local-addrs` 返回 200 |
| Docker Web 入口等价验证 | 通过 | `scripts/docker-web-server.ts` 临时端口 `5980`：`/health` 代理 200，`/` 返回 index |
| Docker CLI 验证 | 未执行 | 当前机器没有可用 `docker` 命令 |
| Wrangler 远端部署 | 未执行 | 需要 Cloudflare 登录、真实 D1 `database_id` 和 R2 bucket |

### Linux/Bun

证据要求：

- `bun run typecheck` 通过。
- `bun run build` 生成 `dist/web`。
- `bun run src/elysia/index.ts` 后 `/health` 返回 `ok:true`。
- Nginx/Caddy 能访问 `/` 和 `/health`。

### Docker Compose

证据要求：

- `docker compose config` 通过。
- `docker compose build` 通过。
- `http://127.0.0.1:8080/health` 返回后端健康结果。
- 浏览器访问 `http://localhost:8080` 后画笔可写。

### Cloudflare

证据要求：

- `secboard-cf/wrangler.toml` 中 `database_id` 已替换为真实 UUID。
- `pnpm --dir secboard-cf run typecheck` 通过。
- `wrangler d1 execute ... schema.sql --remote` 成功。
- `wrangler deploy` 成功。
- Pages 前端的 `VITE_LANSTART_API_BASE` 指向 Worker。

### 纯前端

证据要求：

- `VITE_PURE_FRONTEND=true pnpm run build:frontend` 通过。
- 静态托管能回退到 `index.html`。
- 浏览器 IndexedDB 中能保存白板数据。

### Node 适配器

只验证最小接口，不作为完整部署完成标准：

- `pnpm --dir backend run dev:node` 能启动。
- `/health` 返回 ok。
- 不声明完整白板功能可用。

## 文档入口

- [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)
- [docs/DEPLOYMENT_BUN.md](./docs/DEPLOYMENT_BUN.md)
- [docs/DEPLOYMENT_DOCKER.md](./docs/DEPLOYMENT_DOCKER.md)
- [docs/DEPLOYMENT_CF.md](./docs/DEPLOYMENT_CF.md)
- [docs/DEPLOYMENT_FRONTEND.md](./docs/DEPLOYMENT_FRONTEND.md)
- [docs/DEPLOYMENT_NODE.md](./docs/DEPLOYMENT_NODE.md)
