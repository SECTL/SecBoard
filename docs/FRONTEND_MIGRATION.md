# SecBoard 前端迁移文档

本文档描述 SecBoard 从 Electron 桌面应用到纯 Web 应用的迁移方案。

## 一、迁移概述

SecBoard 原本是一个基于 Electron 的桌面应用程序，现已完成纯前端模式的迁移，支持在浏览器中独立运行，无需后端服务。

### 主要变化

| 特性 | Electron 模式 | 纯前端模式 |
|------|--------------|-----------|
| 运行环境 | Node.js + Electron | 浏览器 |
| 数据存储 | SQLite (LevelDB) | IndexedDB |
| 状态管理 | 后端 UI State | 前端 React State |
| 事件通信 | HTTP 轮询/IPC | 前端事件总线 |
| 文件系统 | Node.js fs | 浏览器 File API |

## 二、架构变化说明

### 2.1 前端状态管理替代后端 UI State

**原架构**：UI 状态存储在后端内存中，前端通过 HTTP API 读写。

**新架构**：使用 React Context + useReducer 在前端管理状态。

核心实现位于 [frontendState.ts](../src/status/frontendState.ts)：

```typescript
export interface FrontendState {
  tool: Tool
  penType: PenType
  penColor: string
  penThickness: number
  eraserType: EraserType
  eraserThickness: number
  appMode: AppMode
  notesPageIndex: number
  notesPageTotal: number
  undoRev: number
  redoRev: number
  clearRev: number
  whiteboardBgColor: string
  whiteboardBgImageUrl: string
  whiteboardBgImageOpacity: number
}
```

提供的 Hooks：
- `useFrontendState()` - 获取完整状态上下文
- `useTool()` - 获取当前工具
- `usePenSettings()` - 获取画笔设置
- `useEraserSettings()` - 获取橡皮擦设置
- `useAppModeState()` - 获取应用模式
- `useNotesPage()` - 获取笔记页码信息
- `useRevision()` - 获取撤销/重做版本号

### 2.2 IndexedDB 替代 LevelDB

**原架构**：使用 SQLite (通过 LeavelDB 封装) 作为持久化存储。

**新架构**：使用浏览器原生 IndexedDB。

核心实现：

1. **通用 KV 存储** - [indexedDbStorage.ts](../src/status/indexedDbStorage.ts)

```typescript
export async function getValue<T>(key: string): Promise<T>
export async function getValueOrUndefined<T>(key: string): Promise<T | undefined>
export async function putValue<T>(key: string, value: T): Promise<void>
export async function deleteValue(key: string): Promise<void>
export async function deleteByPrefix(prefix: string): Promise<void>
export async function getAllKeys(): Promise<string[]>
export async function listEntriesByPrefix<T>(prefix: string, options?: { limit?: number }): Promise<Array<{ key: string; value: T }>>
export async function clearAll(): Promise<void>
```

数据库名称：`secboard-db`，存储对象：`kv-store`

2. **纯前端模式存储** - [webLanstartAdapter.ts](../src/status/webLanstartAdapter.ts)

```typescript
class FrontendIndexedDBStorage {
  async getKv(key: string): Promise<unknown>
  async putKv(key: string, value: unknown): Promise<void>
  async getUiState(windowId: string): Promise<Record<string, unknown>>
  async putUiStateKey(windowId: string, key: string, value: unknown): Promise<void>
  async deleteUiStateKey(windowId: string, key: string): Promise<void>
}
```

数据库名称：`secboard-frontend`，存储对象：`kv` 和 `uiState`

### 2.3 事件总线替代后端事件轮询

**原架构**：前端通过 HTTP 轮询 `/events` 端点获取后端事件。

**新架构**：使用前端内存事件总线，支持发布-订阅模式。

核心实现位于 [eventBus.ts](../src/status/eventBus.ts)：

```typescript
export type EventItem = {
  id: number
  type: string
  payload?: unknown
  ts: number
}

export function subscribe(callback: (event: EventItem) => void): () => void
export function emit<T extends keyof EventPayloadMap>(type: T, payload?: EventPayloadMap[T]): void
export function getEvents(since: number): { items: EventItem[]; latest: number }
```

支持的事件类型：

```typescript
type EventPayloadMap = {
  KV_GET: { key: string }
  KV_PUT: { key: string }
  UI_STATE_PUT: { windowId: string; key: string; value: unknown }
  UI_STATE_DEL: { windowId: string; key: string }
  COMMAND: { command: string; payload: unknown }
  BACKEND_EVENT: { event: EventItem }
  BACKEND_FORWARD: { target: string; command: string; payload: unknown }
}
```

纯前端模式的事件总线实现：

```typescript
class FrontendEventBus {
  emit(type: string, payload?: unknown): void
  subscribe(listener: EventListener): () => void
  getEventsSince(since: number): { items: FrontendEventItem[]; latest: number }
}
```

## 三、使用方式

### 3.1 如何启用纯前端模式

通过环境变量 `VITE_PURE_FRONTEND` 控制：

```bash
# 构建时启用纯前端模式
VITE_PURE_FRONTEND=true bun run build

# 或在 .env.production 中设置
VITE_PURE_FRONTEND=true
```

检测方式：

```typescript
import { isPureFrontendMode } from './status'

if (isPureFrontendMode()) {
  // 纯前端模式逻辑
}
```

### 3.2 环境变量配置

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `VITE_PURE_FRONTEND` | 启用纯前端模式 | `false` |
| `VITE_LANSTART_API_BASE` | 后端 API 基础 URL | 开发模式为空，生产模式为 `http://127.0.0.1:3131` |

配置示例 (`.env.production`)：

```env
# 纯前端模式（无后端）
VITE_PURE_FRONTEND=true

# 或连接远程后端
VITE_LANSTART_API_BASE=https://api.example.com
```

### 3.3 开发模式

```bash
# 同时启动前端和后端（传统模式）
bun run dev

# 仅启动前端开发服务器
bun run dev:web

# 仅启动后端服务
bun run dev:backend
```

### 3.4 生产构建

```bash
# 构建前端
bun run build

# 构建产物位于 dist/web 目录
```

## 四、API 兼容性说明

无论是否启用纯前端模式，`window.lanstart` API 保持一致：

```typescript
interface LanstartAPI {
  postCommand(command: string, payload?: unknown): Promise<null>
  getEvents(since: number): Promise<{ items: EventItem[]; latest: number }>
  getKv(key: string): Promise<unknown>
  putKv(key: string, value: unknown): Promise<null>
  getUiState(windowId: string): Promise<Record<string, unknown>>
  putUiStateKey(windowId: string, key: string, value: unknown): Promise<null>
  deleteUiStateKey(windowId: string, key: string): Promise<null>
  apiRequest(input: { method: string; path: string; body?: unknown }): Promise<{ status: number; body: unknown }>
  clipboardWriteText(text: string): Promise<null>
  getToolbarNoticeKind(): Promise<string>
  setToolbarNoticeVisible(input: { visible: boolean; kind?: string }): Promise<null>
  setToolbarNoticeBounds(input: { width: number; height: number }): Promise<null>
  restartBackendAll(): Promise<null>
  setZoomLevel(level: number): void
  getZoomLevel(): number
}
```

### 纯前端模式下的行为差异

| API | 纯前端模式行为 |
|-----|--------------|
| `postCommand` | 发送到前端事件总线，不调用后端 |
| `getEvents` | 从前端事件总线获取事件 |
| `getKv/putKv` | 使用 IndexedDB 存储 |
| `getUiState/putUiStateKey` | 使用 IndexedDB 存储 |
| `apiRequest` | 部分实现（如图片选择），其他返回 501 |
| `clipboardWriteText` | 使用 Navigator Clipboard API |
| `restartBackendAll` | 无操作 |

## 五、迁移步骤（已完成的工作）

### 5.1 状态管理迁移

- [x] 创建 `FrontendState` 接口和 React Context
- [x] 实现 `frontendReducer` 处理状态变更
- [x] 提供 `FrontendStateProvider` 组件
- [x] 实现状态快照转换函数 `toUiStateSnapshot` / `fromUiStateSnapshot`

### 5.2 存储层迁移

- [x] 实现 `indexedDbStorage` 模块（通用 KV 存储）
- [x] 实现 `FrontendIndexedDBStorage` 类（纯前端模式专用）
- [x] 添加内存缓存优化读取性能
- [x] 实现按前缀查询和批量删除

### 5.3 事件系统迁移

- [x] 创建前端 `EventBus` 实现
- [x] 定义 `EventPayloadMap` 类型
- [x] 实现事件历史记录和订阅机制
- [x] 集成到 `webLanstartAdapter`

### 5.4 适配器层

- [x] 创建 `createPureFrontendAdapter()` 函数
- [x] 实现 `ensureWebLanstartAdapter()` 自动选择适配器
- [x] 添加 `isPureFrontendMode()` 检测函数
- [x] 保持 API 接口一致性

## 六、后续工作建议

### 6.1 功能完善

- [ ] 实现白板画布数据的 IndexedDB 持久化
- [ ] 添加离线数据同步机制（可选后端同步）
- [ ] 实现数据导入/导出功能
- [ ] 添加 IndexedDB 存储容量监控

### 6.2 性能优化

- [ ] 优化 IndexedDB 批量写入性能
- [ ] 实现状态持久化的防抖/节流
- [ ] 添加 IndexedDB 事务队列
- [ ] 考虑使用 Web Worker 处理大数据

### 6.3 用户体验

- [ ] 添加数据迁移引导（从 Electron 版本迁移）
- [ ] 实现自动保存提示
- [ ] 添加存储空间不足警告
- [ ] 支持多标签页数据同步（BroadcastChannel）

### 6.4 测试覆盖

- [ ] 添加 IndexedDB 存储层单元测试
- [ ] 添加事件总线单元测试
- [ ] 添加前端状态管理测试
- [ ] 添加 E2E 测试覆盖纯前端模式

## 六、后端架构（新增）

### 6.1 多平台后端架构

SecBoard 后端现在采用 **Elysia + 适配器模式**，支持在多个平台上运行：

```
┌─────────────────────────────────────────────────────────────────┐
│                     前端 (React + Vite)                        │
├─────────────────────────────────────────────────────────────────┤
│                    Core API (Elysia 应用)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    Bun 运行时   │  │  Node.js 运行时  │  │ Cloudflare      │ │
│  │  (LevelDB)      │  │  (内存/SQLite)   │  │ Workers (KV/D1) │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │          │
│           ▼                    ▼                    ▼          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              StorageAdapter / EventAdapter              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 核心模块

**backend/core/app.ts** - 平台无关的 Elysia 应用：
```typescript
export function createCoreApp(adapters: PlatformAdapters): Elysia {
  const { storage, events } = adapters
  // ... 路由定义
}
```

**backend/core/adapters.ts** - 适配器接口定义：
```typescript
export interface StorageAdapter {
  get<K extends string>(key: K): Promise<unknown>
  put<K extends string>(key: K, value: unknown): Promise<void>
  delete<K extends string>(key: K): Promise<void>
  list<K extends string>(prefix?: string): Promise<K[]>
  deleteByPrefix(prefix: string): Promise<void>
}

export interface EventAdapter {
  emit(type: string, payload?: unknown): void
  subscribe(callback: (event: EventItem) => void): () => void
  getEvents(since: number): { items: EventItem[]; latest: number }
}
```

### 6.3 平台适配器

| 平台 | 存储实现 | 事件实现 | 文件系统 |
|------|---------|---------|---------|
| **Bun** | LevelDB (SQLite) | 内存事件总线 | Node.js fs |
| **Node.js** | 内存/SQLite | 内存事件总线 | Node.js fs |
| **Cloudflare Workers** | KV + D1 | KV 存储事件 | R2 |

### 6.4 目录结构

```
backend/
├── core/
│   ├── app.ts           # 核心 Elysia 应用
│   └── adapters.ts      # 适配器接口定义
├── adapters/
│   ├── bunStorage.ts    # Bun 存储适配器
│   ├── bunEvents.ts     # Bun 事件适配器
│   ├── bunFilesystem.ts # Bun 文件系统适配器
│   ├── cfStorage.ts     # Cloudflare 存储适配器
│   ├── cfEvents.ts      # Cloudflare 事件适配器
│   ├── cfFilesystem.ts  # Cloudflare 文件系统适配器
│   ├── nodeStorage.ts   # Node.js 存储适配器
│   ├── nodeEvents.ts    # Node.js 事件适配器
│   └── nodeFilesystem.ts# Node.js 文件系统适配器
├── bun/
│   └── index.ts         # Bun 入口
├── cf/
│   └── index.ts         # Cloudflare Workers 入口
├── node/
│   └── index.ts         # Node.js 入口
├── index.ts             # 导出所有模块
├── package.json         # 后端包配置
└── tsconfig.json        # TypeScript 配置
```

### 6.5 运行方式

**Bun 模式：**
```bash
cd backend
bun run dev:bun
```

**Node.js 模式：**
```bash
cd backend
bun run dev:node
```

**Cloudflare Workers 模式：**
```bash
cd backend
bun run build:cf
```

### 6.6 环境变量

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `LANSTART_BACKEND_PORT` | 后端服务端口 | `3131` |
| `LANSTART_BACKEND_HOST` | 后端服务主机 | `127.0.0.1` |
| `LANSTART_PURE_FRONTEND` | 纯前端模式（后端禁用部分功能） | `false` |

## 七、后续工作建议

### 7.1 功能完善

- [ ] 实现白板画布数据的 IndexedDB 持久化
- [ ] 添加离线数据同步机制（可选后端同步）
- [ ] 实现数据导入/导出功能
- [ ] 添加 IndexedDB 存储容量监控

### 7.2 性能优化

- [ ] 优化 IndexedDB 批量写入性能
- [ ] 实现状态持久化的防抖/节流
- [ ] 添加 IndexedDB 事务队列
- [ ] 考虑使用 Web Worker 处理大数据

### 7.3 用户体验

- [ ] 添加数据迁移引导（从 Electron 版本迁移）
- [ ] 实现自动保存提示
- [ ] 添加存储空间不足警告
- [ ] 支持多标签页数据同步（BroadcastChannel）

### 7.4 测试覆盖

- [ ] 添加 IndexedDB 存储层单元测试
- [ ] 添加事件总线单元测试
- [ ] 添加前端状态管理测试
- [ ] 添加 E2E 测试覆盖纯前端模式

### 7.5 后端完善

- [ ] 实现 Node.js SQLite 持久化（当前为内存存储）
- [ ] 添加 Cloudflare D1 数据库支持
- [ ] 实现后端数据同步机制
- [ ] 添加 Redis 支持（用于多实例事件共享）

## 八、注意事项

### 8.1 存储限制

- IndexedDB 存储限制因浏览器而异，通常为可用磁盘空间的 50%
- 建议定期清理不需要的数据
- 大文件（如图片）建议使用 Data URL 或考虑外部存储

### 8.2 浏览器兼容性

- 需要支持 IndexedDB 的现代浏览器
- Clipboard API 需要 HTTPS 或 localhost
- 部分功能在隐私模式下可能受限

### 8.3 数据安全

- IndexedDB 数据存储在用户本地，清除浏览器数据会删除
- 建议实现数据导出备份功能
- 敏感数据应考虑加密存储

### 8.4 调试建议

```typescript
// 查看 IndexedDB 内容
const request = indexedDB.open('secboard-db', 1)
request.onsuccess = (e) => {
  const db = e.target.result
  const tx = db.transaction('kv-store', 'readonly')
  const store = tx.objectStore('kv-store')
  store.getAll().onsuccess = (e) => console.log(e.target.result)
}

// 查看事件历史
import { getLocalEvents } from './status'
console.log(getLocalEvents(0))
```

### 8.5 迁移兼容性

如果需要同时支持 Electron 和纯前端模式：

```typescript
import { isPureFrontendMode } from './status'

if (isPureFrontendMode()) {
  // 纯前端逻辑
} else {
  // 需要后端的逻辑
}
```

---

**文档版本**: 1.1.0  
**最后更新**: 2026-05-05
