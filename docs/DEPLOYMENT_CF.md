# Cloudflare Workers 后端部署文档

## 概述

本文档详细介绍如何将 SecBoard 后端部署到 Cloudflare Workers。

## 一、环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 18.0.0 | 运行时 |
| npm/yarn/pnpm | 最新版本 | 包管理器 |
| Wrangler | >= 3.0.0 | Cloudflare Workers CLI |
| Git | >= 2.0.0 | 代码版本控制 |

## 二、安装依赖

### 2.1 安装 Wrangler

```bash
npm install -g wrangler
```

### 2.2 登录 Cloudflare

```bash
wrangler login
```

按照提示在浏览器中完成登录。

## 三、配置 Cloudflare 资源

### 3.1 创建 KV 命名空间

```bash
# 创建 KV 命名空间
wrangler kv:namespace create SECBOARD_KV

# 查看 KV 命名空间 ID
wrangler kv:namespace list
```

### 3.2 创建 D1 数据库（可选）

```bash
# 创建 D1 数据库
wrangler d1 create secboard-db

# 查看 D1 数据库 ID
wrangler d1 list
```

### 3.3 创建 R2 存储桶（可选）

```bash
# 创建 R2 存储桶
wrangler r2 bucket create secboard-bucket

# 查看 R2 存储桶列表
wrangler r2 bucket list
```

## 四、配置 wrangler.toml

### 4.1 创建配置文件

```toml
name = "secboard-backend"
main = "backend/cf/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# KV 命名空间绑定
kv_namespaces = [
  { binding = "KV", id = "<你的 KV 命名空间 ID>" }
]

# D1 数据库绑定（可选）
[[d1_databases]]
binding = "DB"
database_name = "secboard-db"
database_id = "<你的 D1 数据库 ID>"

# R2 存储桶绑定（可选）
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "secboard-bucket"

# 环境变量
[vars]
LANSTART_PURE_FRONTEND = "false"

# 开发环境配置
[env.development]
name = "secboard-backend-dev"

# 生产环境配置
[env.production]
name = "secboard-backend-prod"
```

### 4.2 配置路由

在 Cloudflare Dashboard 中配置 Workers 路由：

1. 登录 Cloudflare Dashboard
2. 进入 Workers > 选择你的 Worker
3. 点击 "Triggers" > "Add Route"
4. 添加路由：`api.secboard.example.com/*`

## 五、本地开发

### 5.1 运行开发服务器

```bash
cd backend
wrangler dev
```

### 5.2 测试本地服务

```bash
curl http://localhost:8787/health
# 预期输出：{"ok":true,"platform":"unknown"}
```

## 六、部署到 Cloudflare

### 6.1 部署到开发环境

```bash
wrangler deploy --env development
```

### 6.2 部署到生产环境

```bash
wrangler deploy --env production
```

### 6.3 验证部署

```bash
curl https://api.secboard.example.com/health
# 预期输出：{"ok":true,"platform":"unknown"}
```

## 七、配置自定义域名

### 7.1 添加 DNS 记录

在 Cloudflare DNS 中添加 CNAME 记录：

| 类型 | 名称 | 目标 | TTL |
|------|------|------|-----|
| CNAME | api | <你的 Worker 子域名> | Auto |

### 7.2 配置 SSL

确保 SSL/TLS 设置为 "Full" 或 "Strict"：

1. 进入 Cloudflare Dashboard > SSL/TLS > Edge Certificates
2. 设置 "Always Use HTTPS" 为开启状态
3. 确保 "Minimum TLS Version" 为 TLS 1.2 或更高

## 八、环境变量配置

### 8.1 在 wrangler.toml 中配置

```toml
[vars]
LANSTART_PURE_FRONTEND = "false"
API_KEY = "<你的 API 密钥>"
```

### 8.2 通过命令行设置

```bash
wrangler secret put API_KEY
```

## 九、监控与日志

### 9.1 查看日志

```bash
# 实时查看日志
wrangler tail

# 查看生产环境日志
wrangler tail --env production
```

### 9.2 Cloudflare Dashboard 监控

1. 登录 Cloudflare Dashboard
2. 进入 Workers > 选择你的 Worker
3. 查看 "Metrics" 标签页

## 十、故障排除

### 10.1 部署失败

```bash
# 检查 wrangler 版本
wrangler --version

# 检查配置文件
wrangler config validate

# 查看详细部署日志
wrangler deploy --verbose
```

### 10.2 KV 访问问题

确保 KV 命名空间已正确绑定：

```bash
wrangler kv:namespace list
```

### 10.3 环境变量问题

检查环境变量是否正确设置：

```bash
wrangler secrets list
```

---

**文档版本**: 1.0.0  
**最后更新**: 2026-05-05
