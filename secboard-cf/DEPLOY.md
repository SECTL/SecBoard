# SecBoard Cloudflare Worker 部署

完整文档见 [../docs/DEPLOYMENT_CF.md](../docs/DEPLOYMENT_CF.md)。

## 快速步骤

```bash
pnpm install
pnpm exec wrangler login
pnpm exec wrangler d1 create secboard-db
pnpm exec wrangler r2 bucket create secboard-files
```

将 D1 返回的 `database_id` 写入 `wrangler.toml` 后：

```bash
pnpm exec wrangler d1 execute secboard-db --file=./schema.sql --remote
pnpm exec wrangler deploy
```

Worker 健康检查：

```bash
curl -fsS https://<worker-name>.<account>.workers.dev/health
```

能力边界：Cloudflare Worker 支持 Web 白板状态、KV、UI State、Events 和部分 CUNOX 文件接口；不支持桌面 stdio、本机文件选择和手机投屏 WebRTC 信令。
