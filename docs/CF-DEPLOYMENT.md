# Cloudflare 部署入口

此文件保留用于兼容旧链接。当前 Cloudflare 部署请阅读：

- [Cloudflare Workers + Pages 部署](./DEPLOYMENT_CF.md)

快速命令摘要：

```bash
cd secboard-cf
pnpm install
pnpm exec wrangler login
pnpm exec wrangler d1 create secboard-db
pnpm exec wrangler r2 bucket create secboard-files
# 将 D1 database_id 写入 wrangler.toml
pnpm exec wrangler d1 execute secboard-db --file=./schema.sql --remote
pnpm exec wrangler deploy
```

前端 Pages 构建变量：

```env
VITE_PURE_FRONTEND=false
VITE_LANSTART_API_BASE=https://<worker-name>.<account>.workers.dev
```
