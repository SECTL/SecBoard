# SecBoard Cloudflare 部署指南

本指南将帮助你把 SecBoard 部署到 Cloudflare 上，包括后端 API (Workers) 和前端 (Pages)。

---

## 准备工作

### 1. 安装必要工具

```bash
# 安装 pnpm (如果没有)
npm install -g pnpm

# 安装 Wrangler (Cloudflare CLI)
pnpm add -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器窗口，请使用你的 Cloudflare 账号登录并授权。

---

## 部署后端 (Cloudflare Workers)

### 步骤 1: 进入目录并安装依赖

```bash
cd secboard-cf
pnpm install
```

### 步骤 2: 创建 D1 数据库

```bash
wrangler d1 create secboard-db
```

执行后会返回类似这样的输出：

```
┌─────────────────────────────┐
│ 🎉  Created database 'secboard-db'! │
│                             │
│ Database ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx │
│ ...
└─────────────────────────────┘
```

**复制 `Database ID`，稍后会用到。**

### 步骤 3: 配置 wrangler.toml

打开 `secboard-cf/wrangler.toml`，将 `database_id` 替换为你刚才复制的 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "secboard-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # 替换这里
```

### 步骤 4: 创建 R2 存储桶

```bash
wrangler r2 bucket create secboard-files
```

### 步骤 5: 初始化数据库表

```bash
pnpm run deploy:d1
```

### 步骤 6: 部署 Workers

```bash
pnpm run deploy
```

部署成功后，会显示类似这样的地址：

```
https://secboard-api.your-account.workers.dev
```

**请记录下这个 URL，后续配置前端需要用到。**

---

## 部署前端 (Cloudflare Pages)

### 步骤 1: 配置前端环境变量

在项目根目录创建 `.env.production` 文件：

```bash
# 根目录
cd ..
```

创建文件 `.env.production`：

```
VITE_LANSTART_API_BASE=https://你的-workers-地址.workers.dev
```

例如：

```
VITE_LANSTART_API_BASE=https://secboard-api.my-account.workers.dev
```

### 步骤 2: 构建前端

```bash
pnpm run build
```

构建完成后，静态文件会生成在 `dist` 目录。

### 步骤 3: 部署到 Cloudflare Pages

**方式一：使用 CLI**

```bash
wrangler pages deploy dist --project-name=secboard
```

**方式二：使用 Dashboard**

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Pages** → **Create a project**
3. 选择 **Direct upload**
4. 将 `dist` 文件夹拖入上传区域
5. 完成后会得到一个 URL，例如：

```
https://secboard.pages.dev
```

---

## 验证部署

1. 打开你部署的前端 URL
2. 打开浏览器开发者工具 (F12) → Network
3. 刷新页面，检查是否有请求错误

测试 API 是否正常：

```
https://你的-workers-地址.workers.dev/health
```

应该返回：

```json
{ "ok": true, "platform": "cloudflare-workers" }
```

---

## 一键部署脚本

如果你已经有 Cloudflare 账号，可以直接运行：

```bash
# Windows PowerShell
.\secboard-cf\deploy.ps1

# Linux/Mac Bash
bash secboard-cf/deploy.sh
```

---

## 已知限制

| 功能 | 状态 | 说明 |
|------|------|------|
| 白板绘图 | ✅ 正常 | |
| 视频展台 | ⚠️ 部分 | 实时通信需额外配置 TURN 服务 |
| 文件上传 | ✅ 正常 | 拖拽上传 |
| CUNOX 导入/导出 | ✅ 正常 | 通过云存储 |

---

## 常见问题

### Q: 部署后页面空白或报错

A: 检查浏览器控制台错误，确保 `.env.production` 中的 `VITE_LANSTART_API_BASE` 正确指向你的 Workers 地址。

### Q: D1 数据库操作失败

A: 确保已执行 `pnpm run deploy:d1` 初始化数据库表。

### Q: 如何更新部署？

```bash
# 更新前端
pnpm run build
wrangler pages deploy dist --project-name=secboard

# 更新后端
cd secboard-cf
pnpm run deploy
```

---

## 费用说明

| 服务 | 免费额度 | 超出计费 |
|------|----------|----------|
| Workers | 100,000 请求/天 | $0.15/百万请求 |
| D1 | 1GB 存储 | $0.75/GB/月 |
| R2 | 1GB 存储/100万操作 | 按量计费 |
| Pages | 500MB 带宽/月 | 免费 |

个人使用通常在免费额度内。

---

如有其他问题，请查看 [secboard-cf/DEPLOY.md](./secboard-cf/DEPLOY.md)
