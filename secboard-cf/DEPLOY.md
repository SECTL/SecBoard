# Cloudflare 部署指南

## 前置要求

1. **Node.js 18+**
2. **pnpm** (项目使用 pnpm)
3. **Cloudflare 账号**
4. **安装 Wrangler CLI**

```bash
pnpm add -g wrangler
wrangler login
```

## 部署步骤

### 1. 安装依赖

```bash
cd secboard-cf
pnpm install
```

### 2. 创建 D1 数据库

```bash
wrangler d1 create secboard-db
```

将返回的 `database_id` 填入 `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "secboard-db"
database_id = "填入你的-database-id"
```

### 3. 创建 R2 存储桶

```bash
wrangler r2 bucket create secboard-files
```

### 4. 初始化数据库表

```bash
pnpm run deploy:d1
```

### 5. 部署到 Cloudflare

```bash
pnpm run deploy
```

## 开发模式

```bash
# 本地开发 (需要先创建 local D1)
pnpm run dev:d1
pnpm run dev
```

## 前端部署 (Cloudflare Pages)

### 1. 构建前端

```bash
cd ..
pnpm run build
```

### 2. 部署到 Cloudflare Pages

通过 Cloudflare Dashboard:
1. 进入 Pages -> Create new project
2. 选择 Direct upload
3. 上传 `dist` 目录

或使用 CLI:

```bash
wrangler pages deploy dist --project-name=secboard
```

## 配置环境变量

### Workers 环境变量

在 Cloudflare Dashboard -> Workers -> 你的 Workers -> 设置 中添加:

| 变量名 | 值 |
|--------|-----|
| ALLOWED_ORIGIN | * (或你的域名) |

### 前端环境变量

创建 `.env.production`:

```
VITE_LANSTART_API_BASE=https://your-api.your-account.workers.dev
```

然后重新构建前端。

## API 端点

部署后 API 基础 URL: `https://your-workers-name.your-account.workers.dev`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /health | 健康检查 |
| GET | /events?since=N | 获取事件 |
| POST | /rpc/post-command | 执行命令 |
| GET | /kv/:key | 获取 KV |
| PUT | /kv/:key | 设置 KV |
| DELETE | /kv/:key | 删除 KV |
| GET | /ui/:windowId | 获取 UI 状态 |
| PUT | /ui/:windowId/:key | 设置 UI 状态 |
| DELETE | /ui/:windowId/:key | 删除 UI 状态 |
| GET/POST/PUT/DELETE | /cunox/* | CUNOX 文件操作 |

## 注意事项

1. **WebRTC 已移除** - 视频展台的实时通信功能在 Cloudflare 上需要额外配置 TURN 服务
2. **对话框限制** - 文件选择改为直接拖拽上传
3. **CUNOX 导入/导出** - 需要通过 API 或云存储实现
