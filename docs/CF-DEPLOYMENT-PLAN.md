# SecBoard Cloudflare 部署改造方案

## 一、项目现状分析

### 1.1 技术栈概览

| 层级 | 当前技术 | 兼容性 |
|------|----------|--------|
| 前端框架 | React 18 + TypeScript | ✅ 可复用 |
| 构建工具 | Vite 6 | ✅ 可复用 |
| UI 组件 | Tailwind CSS + Mantine | ✅ 可复用 |
| 绘图引擎 | Leafer UI + Perfect Freehand | ✅ 浏览器兼容 |
| 后端框架 | Elysia (Bun 运行时) | ❌ 需重写 |
| 数据库 | Bun SQLite (LevelDB 封装) | ❌ 需迁移 |
| 文件系统 | node:fs | ❌ 需替换 |

### 1.2 后端 API 端点清单

```
Elysia 后端提供以下核心接口：

RPC 命令接口:
  POST /rpc/post-command     - 接收前端命令

KV 存储接口:
  GET    /kv/:key            - 获取键值
  PUT    /kv/:key            - 设置键值

UI 状态接口:
  GET    /ui/:windowId       - 获取窗口状态
  PUT    /ui/:windowId/:key  - 设置窗口状态
  DELETE /ui/:windowId/:key  - 删除窗口状态

事件接口:
  GET    /events?since=N     - 获取事件列表

对话框接口:
  POST /dialog/select-image-file
  POST /dialog/select-directory
  POST /dialog/select-cunox-export-file
  POST /dialog/select-cunox-import-file

WebRTC 信令接口 (cast 服务):
  GET    /cast/session/:id
  POST   /cast/session/:id
  GET    /cast/session/:id/offer
  POST   /cast/session/:id/offer
  GET    /cast/session/:id/answer
  POST   /cast/session/:id/answer

CUNOX 文件接口:
  GET/POST/PUT/DELETE /cunox/*
```

### 1.3 前端通信方式

前端通过 `webLanstartAdapter.ts` 与后端通信：

```typescript
// 关键通信方式
postCommand(command, payload)  // POST /rpc/post-command
getEvents(since)                // GET  /events
getKv(key)                      // GET  /kv/:key
putKv(key, value)               // PUT /kv/:key
```

---

## 二、Cloudflare 部署架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                          │
│  ┌─────────────────┐    ┌────────────────────────────────┐ │
│  │  Cloudflare     │    │     Cloudflare Workers         │ │
│  │  Pages          │    │     (API + WebRTC)             │ │
│  │  (前端静态资源)  │    │                                │ │
│  └────────┬────────┘    └───────────────┬────────────────┘ │
│           │                              │                  │
│           │         ┌────────────────────┼────────────────┐ │
│           │         │                    │                │ │
│           ▼         ▼                    ▼                ▼ │
│     ┌─────────┐ ┌─────────┐      ┌────────────┐  ┌─────────┐│
│     │  D1     │ │   R2    │      │  Durable   │  │  TURN   ││
│     │(SQLite) │ │(文件存储)│      │  Objects  │  │ (WebRTC)││
│     └─────────┘ └─────────┘      └────────────┘  └─────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 2.2 组件映射表

| 原组件 | Cloudflare 替代方案 | 说明 |
|--------|---------------------|------|
| Bun SQLite | Cloudflare D1 | 兼容 SQLite 语法 |
| node:fs 文件操作 | Cloudflare R2 | 对象存储 |
| Elysia HTTP 服务 | Cloudflare Workers | 无服务器函数 |
| 内存状态 (Map) | Durable Objects | 分布式状态 |
| WebRTC 视频 | Cloudflare TURN | 实时通信 |
| 本地开发服务器 | Wrangler dev | 本地模拟 |

---

## 三、具体改造步骤

### 3.1 第一阶段：前端适配

#### 3.1.1 修改 API Base URL 配置

**文件**: `src/status/webLanstartAdapter.ts`

```typescript
// 修改前
function getApiBaseUrl(): string {
  return import.meta.env.DEV ? '' : 'http://127.0.0.1:3131'
}

// 修改后 - 支持 Cloudflare Workers
function getApiBaseUrl(): string {
  const envBase = (import.meta as any)?.env?.VITE_LANSTART_API_BASE
  if (envBase) {
    const raw = String(envBase)
    return raw.endsWith('/') ? raw.slice(0, -1) : raw
  }
  // 生产环境使用相对路径 (假设 Workers 和 Pages 同域)
  return ''
}
```

#### 3.1.2 Vite 配置调整

**文件**: `vite.config.ts`

```typescript
// 添加 Cloudflare Pages 支持
export default defineConfig({
  // ... existing config
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@mantine/core', 'framer-motion'],
          'canvas-vendor': ['leafer-ui', 'perfect-freehand']
        }
      }
    }
  }
})
```

#### 3.1.3 环境变量配置

创建 `.env.production`:

```
VITE_LANSTART_API_BASE=https://your-worker.your-account.workers.dev
```

### 3.2 第二阶段：后端 Workers 改造

#### 3.2.1 新建 Workers 项目结构

```
secboard-cf/
├── src/
│   ├── index.ts           # 入口文件
│   ├── db.ts              # D1 数据库操作
│   ├── storage.ts         # R2 文件存储
│   ├── webrtc.ts          # WebRTC 信令处理
│   ├── kv.ts              # KV 存储抽象
│   ├── router.ts          # 路由定义
│   └── types.ts           # 类型定义
├── wrangler.toml          # Workers 配置
├── package.json
└── tsconfig.json
```

#### 3.2.2 核心 Workers 代码

**src/index.ts**:

```typescript
import { AutoRouter } from 'itty-fastify'
import { handleKv } from './kv'
import { handleUi } from './ui'
import { handleEvents } from './events'
import { handleDialog } from './dialog'
import { handleCunox } from './cunox'
import { handleWebRTC } from './webrtc'

const router = AutoRouter()

// KV 存储
router.get('/kv/:key', handleKv.get)
router.put('/kv/:key', handleKv.put)

// UI 状态
router.get('/ui/:windowId', handleUi.get)
router.put('/ui/:windowId/:key', handleUi.put)
router.delete('/ui/:windowId/:key', handleUi.delete)

// 事件
router.get('/events', handleEvents.get)

// 对话框 (文件选择改为上传)
router.post('/dialog/select-image-file', handleDialog.selectImage)
router.post('/dialog/select-directory', handleDialog.selectDirectory)

// CUNOX 导入/导出
router.get('/cunox/:path*', handleCunox.get)
router.post('/cunox/:path*', handleCunox.post)
router.put('/cunox/:path*', handleCunox.put)
router.delete('/cunox/:path*', handleCunox.delete)

// WebRTC 信令
router.get('/cast/session/:id', handleWebRTC.getSession)
router.post('/cast/session/:id', handleWebRTC.createSession)
router.get('/cast/session/:id/offer', handleWebRTC.getOffer)
router.post('/cast/session/:id/offer', handleWebRTC.setOffer)
router.get('/cast/session/:id/answer', handleWebRTC.getAnswer)
router.post('/cast/session/:id/answer', handleWebRTC.setAnswer)

router.post('/rpc/post-command', async (req) => {
  const { command, payload } = await req.json()
  // 命令处理逻辑
  return { ok: true }
})

router.get('/health', () => ({ ok: true }))

export default {
  fetch: router.fetch
}
```

#### 3.2.3 D1 数据库改造

**src/db.ts**:

```typescript
export interface Env {
  DB: D1Database
  R2_BUCKET: R2Bucket
}

export async function getKv(env: Env, key: string) {
  const result = await env.DB.prepare(
    'SELECT value FROM kv WHERE key = ?'
  ).bind(key).first<{ value: string }>()
  
  if (!result) {
    throw new Error('NotFound', { cause: { code: 'LEVEL_NOT_FOUND' } })
  }
  return JSON.parse(result.value)
}

export async function putKv(env: Env, key: string, value: unknown) {
  const encoded = JSON.stringify(value)
  await env.DB.prepare(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).bind(key, encoded).run()
}

export async function deleteKv(env: Env, key: string) {
  await env.DB.prepare('DELETE FROM kv WHERE key = ?').bind(key).run()
}

// 初始化数据库
export async function initDb(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    )
  `).run()
  
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS webrtc_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      offer TEXT,
      answer TEXT
    )
  `).run()
  
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload TEXT,
      ts INTEGER NOT NULL
    )
  `).run()
}
```

#### 3.2.4 R2 文件存储改造

**src/storage.ts**:

```typescript
export interface Env {
  R2_BUCKET: R2Bucket
}

export async function saveCunoxFile(env: Env, path: string, data: ArrayBuffer) {
  await env.R2_BUCKET.put(`cunox/${path}`, data)
}

export async function getCunoxFile(env: Env, path: string) {
  return await env.R2_BUCKET.get(`cunox/${path}`)
}

export async function deleteCunoxFile(env: Env, path: string) {
  await env.R2_BUCKET.delete(`cunox/${path}`)
}

export async function listCunoxFiles(env: Env, prefix: string) {
  const list = await env.R2_BUCKET.list({ prefix: `cunox/${prefix}` })
  return list.objects.map(obj => obj.key.replace('cunox/', ''))
}
```

#### 3.2.5 WebRTC 状态管理

**src/webrtc.ts**:

```typescript
import { getSession, setSession } from './db'

export async function handleWebRTC = {
  async getSession(req: Request, env: Env, ctx: ExecutionContext) {
    const id = req.params.id
    const session = await getSession(env, id)
    if (!session) return new Response('Not Found', { status: 404 })
    return Response.json({ ok: true, ...session })
  },
  
  async createSession(req: Request, env: Env, ctx: ExecutionContext) {
    const id = crypto.randomUUID()
    const now = Date.now()
    await setSession(env, { id, created_at: now, updated_at: now })
    return Response.json({ ok: true, id, created_at: now, updated_at: now })
  },
  
  async setOffer(req: Request, env: Env, ctx: ExecutionContext) {
    const id = req.params.id
    const { type, sdp } = await req.json()
    await setSession(env, { id, offer: { type, sdp }, updated_at: Date.now() })
    return Response.json({ ok: true })
  },
  
  // ... 其他方法类似
}
```

### 3.3 第三阶段：wrangler 配置

**wrangler.toml**:

```toml
name = "secboard-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "secboard-db"
database_id = "your-database-id"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "secboard-files"

# 如果需要 WebRTC，使用 Durable Objects
[[durable_objects.bindings]]
name = "WEBRTC_SESSION"
class_name = "WebRtcSession"

# 路由规则
routes = [
  { pattern = "api.your-domain.com/*", zone_name = "your-domain.com" }
]
```

### 3.4 第四阶段：部署流程

```bash
# 1. 安装 wrangler
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 创建 D1 数据库
wrangler d1 create secboard-db

# 4. 创建 R2 存储桶
wrangler r2 bucket create secboard-files

# 5. 部署 Workers
wrangler deploy

# 6. 初始化数据库表
wrangler d1 execute secboard-db --local --file=./schema.sql
```

---

## 四、关键技术难点与解决方案

### 4.1 文件上传/下载

**问题**: 浏览器文件选择对话框在 Workers 环境中不可用

**解决方案**:

```typescript
// 前端改为直接文件上传
async function selectImageFile(): Promise<string> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  
  return new Promise((resolve, reject) => {
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('no_file'))
        return
      }
      // 直接上传到 R2，返回 URL
      const formData = new FormData()
      formData.append('file', file)
      
      const res = await fetch('/dialog/upload-image', {
        method: 'POST',
        body: formData
      })
      const { url } = await res.json()
      resolve(url)
    }
    input.click()
  })
}
```

### 4.2 CUNOX 导入/导出

**问题**: 需要将本地文件系统操作迁移到 R2

**解决方案**:

```typescript
// 导出: 将数据写入 R2 并生成下载链接
router.post('/cunox/export', async (req, env) => {
  const { data } = await req.json()
  const zipBuffer = await createZip(data) // 使用 pako 或 JSZip
  
  const key = `exports/${crypto.randomUUID()}.cunox`
  await env.R2_BUCKET.put(key, zipBuffer)
  
  // 返回签名 URL (有效期 1 小时)
  const url = await env.R2_BUCKET.signGetObject(key, 3600)
  return Response.json({ ok: true, url })
})

// 导入: 接收上传文件
router.post('/cunox/import', async (req, env) => {
  const formData = await req.formData()
  const file = formData.get('file')
  
  if (file) {
    const key = `imports/${Date.now()}-${file.name}`
    await env.R2_BUCKET.put(key, file.stream())
    return Response.json({ ok: true, key })
  }
})
```

### 4.3 WebRTC 穿透

**问题**: Cloudflare Workers 不支持长连接

**解决方案**:

```typescript
// 使用 Cloudflare TURN 服务 (需要企业版)
// 或者使用第三方 WebRTC 服务，如:
// - Twilio
// - Agora
// - PeerJS

// 简化方案: 使用 Durable Objects 做信令
export class WebRtcSession implements DurableObject {
  constructor(public state: DurableObjectState, public env: Env) {}
  
  async fetch(request: Request) {
    const url = new URL(request.url)
    
    if (url.pathname === '/offer') {
      // 处理 offer
    } else if (url.pathname === '/answer') {
      // 处理 answer
    }
    
    return new Response()
  }
}
```

---

## 五、工作量估算

| 阶段 | 任务 | 预估工作量 |
|------|------|------------|
| 前端适配 | API URL 配置修改、Vite 调整 | 0.5 天 |
| Workers 基础 | 项目搭建、路由、KV 接口 | 1 天 |
| D1 迁移 | 数据库改造、数据迁移 | 1 天 |
| R2 迁移 | 文件存储改造 | 1 天 |
| CUNOX 改造 | 导入/导出重写 | 1 天 |
| WebRTC | 信令服务重构 | 1 天 |
| 测试部署 | 端到端测试 | 1 天 |
| **总计** | | **6.5 天** |

---

## 六、替代方案

如果改造工作量过大，可考虑：

1. **部署到 Vercel** - 支持 Bun runtime (Beta)
2. **部署到 Railway** - 原生支持 Bun + SQLite
3. **部署到 Fly.io** - 支持 Bun + 文件系统
4. **保持本地运行** - 仅部署前端静态资源

---

## 七、总结

本方案详细阐述了将 SecBoard 从 Bun + 本地 SQLite 架构迁移到 Cloudflare 全栈方案的完整路径。核心改造点：

1. **前端** - 仅需修改 API 配置，可完全复用
2. **后端** - 需使用 Hono/itty 框架重写
3. **存储** - SQLite → D1, 文件 → R2
4. **状态** - 内存 Map → Durable Objects

建议按阶段实施，先完成前端 + 基础 KV 接口，验证核心功能后再迁移文件存储和 WebRTC。
