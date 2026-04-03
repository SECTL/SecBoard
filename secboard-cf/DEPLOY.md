# Cloudflare 部署指南

## 架构说明

SecBoard 的 CF 部署分为两部分：

| 组件 | 部署目标 | 说明 |
|------|---------|------|
| 后端 API | Cloudflare Workers | 处理 KV 存储、UI 状态、事件、CUNOX 文件 |
| 前端 | Cloudflare Pages | React 应用，通过环境变量连接后端 |

### 数据存储

| 数据 | 存储方式 |
|------|---------|
| KV 键值对 | D1 (SQLite) |
| UI 状态 | D1 (SQLite) |
| 事件日志 | D1 (SQLite) |
| CUNOX 文件 | R2 对象存储 |

## 前置要求

1. **Bun** (用于构建前端)
2. **pnpm** (CF 后端使用 pnpm)
3. **Cloudflare 账号**
4. **Wrangler CLI**

```bash
# 安装 Wrangler
pnpm add -g wrangler
wrangler login
```

## 部署步骤

### 1. 部署后端 Worker

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

### 5. 部署 Worker

```bash
pnpm run deploy
```

### 6. 部署前端

```bash
cd ..
bun run build
wrangler pages deploy dist/web --project-name=secboard
```

### 7. 配置前端环境变量

编辑 `.env.production`，将 `VITE_LANSTART_API_BASE` 设置为你的 Worker URL：

```
VITE_LANSTART_API_BASE=https://secboard-api.your-account.workers.dev
```

然后重新构建并部署前端：

```bash
bun run build
wrangler pages deploy dist/web --project-name=secboard
```

## 开发模式

### 后端开发

```bash
cd secboard-cf
pnpm run dev
```

本地开发服务器运行在 `http://127.0.0.1:3131`，与 Vite 代理配置一致。

### 前端开发

```bash
bun run dev:web
```

Vite 会将 API 请求代理到本地后端。

### 完整开发模式（本地后端 + 前端）

```bash
bun run dev
```

这会同时启动后端（Elysia）和前端（Vite）。

## API 端点

部署后 API 基础 URL: `https://your-workers-name.your-account.workers.dev`

### 核心端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/events?since=N` | 获取事件流 |
| POST | `/rpc/post-command` | 执行命令 |
| POST | `/commands` | 执行命令（旧版兼容） |
| GET | `/kv/:key` | 获取 KV |
| PUT | `/kv/:key` | 设置 KV |
| DELETE | `/kv/:key` | 删除 KV |
| GET | `/ui/:windowId` | 获取 UI 状态 |
| PUT | `/ui/:windowId/:key` | 设置 UI 状态 |
| DELETE | `/ui/:windowId/:key` | 删除 UI 状态 |
| GET | `/ui-state/:windowId` | 获取 UI 状态（旧版兼容） |
| PUT | `/ui-state/:windowId/:key` | 设置 UI 状态（旧版兼容） |
| DELETE | `/ui-state/:windowId/:key` | 删除 UI 状态（旧版兼容） |

### 文件操作

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/cunox/:path*` | 获取 CUNOX 文件 |
| POST | `/cunox/:path*` | 上传 CUNOX 文件 |
| PUT | `/cunox/:path*` | 上传 CUNOX 文件 |
| DELETE | `/cunox/:path*` | 删除 CUNOX 文件 |
| POST | `/cunox/export` | 导出（不支持） |
| POST | `/cunox/import` | 导入（不支持） |

### 对话框

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/dialog/select-image-file` | 上传图片 |
| POST | `/dialog/select-directory` | 选择目录（不支持） |
| POST | `/dialog/select-cunox-export-file` | 选择导出文件（不支持） |
| POST | `/dialog/select-cunox-import-file` | 选择导入文件（不支持） |

### 工具

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/img/file-to-data-url` | 文件转 DataURL |

## 支持的命令

### settings.*

- `settings.setAppearance` - 设置外观（light/dark）
- `settings.setAppMode` - 设置应用模式（toolbar/whiteboard/video-show）
- `settings.setVideoShowMergeLayers` - 设置视频合并层
- `settings.setWhiteboardBackground` - 设置白板背景

### win.*

- `win.toggleSubwindow` - 切换子窗口
- `win.setNoticeVisible` - 设置通知可见性
- `win.setSubwindowHeight` - 设置子窗口高度（空操作）
- `win.setSubwindowBounds` - 设置子窗口边界（空操作）
- `win.setToolbarBounds` - 设置工具栏边界（空操作）
- `win.setAppWindowBounds` - 设置应用窗口边界（空操作）
- `win.setUiZoom` - 设置UI缩放（空操作）

### app.*

- `app.setTool` - 设置工具（pen/eraser/mouse）
- `app.setPenSettings` - 设置笔设置
- `app.setEraserSettings` - 设置橡皮擦设置
- `app.clearPage` - 清除页面
- `app.undo` - 撤销
- `app.redo` - 重做
- `app.prevPage` - 上一页
- `app.nextPage` - 下一页
- `app.newPage` - 新建页面
- `app.setPageIndex` - 设置页面索引
- `app.togglePageThumbnailsMenu` - 切换页面缩略图菜单
- `app.setWritingFramework` - 设置书写框架
- `app.openSettingsWindow` - 打开设置窗口
- `app.closeSettingsWindow` - 关闭设置窗口
- `app.minimizeSettingsWindow` - 最小化设置窗口（空操作）

### 旧格式命令

- `quit`、`create-window`、`set-appearance`、`toggle-subwindow` 等

## 注意事项

1. **WebRTC 已移除** - 视频展台的实时通信功能在 Cloudflare 上需要额外配置 TURN 服务
2. **对话框限制** - 文件选择改为直接拖拽上传
3. **CUNOX 导入/导出** - 需要通过 API 或云存储实现
4. **窗口相关命令** - 部分窗口操作在 Web 环境下为空操作（no-op）
5. **KV 键名** - CF 后端与本地 Elysia 后端使用相同的 KV 键名，可以共享数据
