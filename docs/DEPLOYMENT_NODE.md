# Node.js 后端状态说明

当前不推荐把 `backend/node` 作为 SecBoard 生产后端。

## 原因

完整产品后端位于 [src/elysia/index.ts](../src/elysia/index.ts)，依赖主业务命令处理、SQLite KV、UI State、CUNOX、图片处理、CS 代理和 WebRTC 信令。

`backend/node/index.ts` 运行的是 [backend/core/app.ts](../backend/core/app.ts)，只包含基础接口：

- `/health`
- `/events`
- `/kv/:key`
- `/ui/:windowId`
- `/ui-state/:windowId`
- `/rpc/post-command` 和 `/commands` 的事件转发

它缺少完整命令执行逻辑，默认 `NodeStorageAdapter` 也不是生产级持久化方案。因此它适合后端适配器实验，不适合作为正式部署教程。

## 推荐替代

- 完整 Linux/VPS 部署：使用 [Bun/Linux 完整部署](./DEPLOYMENT_BUN.md)。
- 容器部署：使用 [Docker Compose 部署](./DEPLOYMENT_DOCKER.md)。
- 无服务器部署：使用 [Cloudflare Workers + Pages](./DEPLOYMENT_CF.md)。

## 如果只想验证 Node 适配器

```bash
corepack enable
corepack prepare pnpm@10 --activate
pnpm install --frozen-lockfile
pnpm --dir backend run dev:node
curl http://127.0.0.1:3131/health
```

预期只证明最小 Elysia 服务启动，不代表完整白板功能可用。

## 后续要成为生产路径需要补齐

- 让 Node 入口复用 `src/elysia/index.ts` 的完整业务能力，或把完整业务迁移到 `backend/core`。
- 为 Node 存储提供 SQLite 持久化并复用现有 LeavelDB 行为。
- 补齐命令处理、CUNOX、图片处理和 WebRTC 信令。
- 增加和 Bun 主后端一致的部署验证测试。
