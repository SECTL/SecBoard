# 运行指南

本文档详细介绍如何在本地开发、构建和部署 SecBoard 项目。

## 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [开发模式](#开发模式)
- [构建与部署](#构建与部署)
- [环境变量配置](#环境变量配置)
- [项目结构](#项目结构)
- [常用命令](#常用命令)
- [开发提示](#开发提示)

## 环境要求

| 依赖 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 18 | 推荐 LTS 版本 |
| pnpm 或 bun | 最新版 | 项目默认使用 bun |

推荐使用 [bun](https://bun.sh/) 作为包管理器和运行时，以获得更快的依赖安装和脚本执行速度。

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/SecBoard.git
cd SecBoard
```

### 2. 安装依赖

使用 bun（推荐）：

```bash
bun install
```

或使用 pnpm：

```bash
pnpm install
```

### 3. 启动开发服务器

```bash
bun dev
# 或
pnpm dev
```

启动后访问 http://localhost:5173 即可查看应用。

## 开发模式

### 完整开发环境

同时启动前端和后端服务：

```bash
bun dev
```

此命令会并行启动：
- **前端开发服务器** (Vite) - 默认端口 5173
- **后端 API 服务** (Elysia) - 默认端口 3131

### 单独启动服务

仅启动前端：

```bash
bun dev:web
```

仅启动后端：

```bash
bun dev:backend
```

### 端口说明

| 服务 | 默认端口 | 环境变量 |
|------|----------|----------|
| 前端开发服务器 | 5173 | Vite 默认配置 |
| 后端 API 服务 | 3131 | `LANSTART_BACKEND_PORT` |
| 投屏服务 | 3132 | `LANSTART_CAST_PORT` |

## 构建与部署

### 构建生产版本

```bash
bun build
```

构建产物将输出到 `dist/web` 目录。

### 构建后端代码

```bash
bun build:backend
```

### 预览构建产物

```bash
bun preview
```

## 环境变量配置

项目支持以下环境变量配置：

### 后端服务配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `LANSTART_BACKEND_PORT` | 3131 | 后端服务端口 |
| `LANSTART_BACKEND_HOST` | 127.0.0.1 | 后端服务监听地址 |
| `LANSTART_DB_PATH` | ./lanstart.sqlite | 数据库文件路径 |
| `LANSTART_BACKEND_TRANSPORT` | http | 通信方式 (http/stdio) |
| `LANSTART_CAST_PORT` | 3132 | 投屏服务端口 |
| `LANSTART_CAST_HOST` | 0.0.0.0 | 投屏服务监听地址 |
| `LANSTART_CS_BASE_URL` | - | CS 服务基础 URL |

### 使用方式

创建 `.env` 文件或在命令行中指定：

```bash
LANSTART_BACKEND_PORT=3131 bun dev:backend
```

## 项目结构

```
SecBoard/
├── src/
│   ├── renderer/              # 前端应用入口 (React)
│   ├── elysia/                # 后端服务 (Elysia API)
│   ├── paint_board/           # 白板组件
│   ├── video_show/            # 视频展台组件
│   ├── toolbar/               # 浮动工具栏
│   ├── toolbar-subwindows/    # 工具栏子窗口
│   ├── settings/              # 设置页面
│   ├── LeavelDB/              # LevelDB 数据存储
│   ├── status/                # 状态管理
│   ├── annotation_writing/    # 批注书写模块
│   ├── CUNOX/                 # CUNOX 导入导出
│   ├── LanStartBar/           # LanStart 工具栏
│   ├── Mantine/               # Mantine UI 配置
│   ├── Tailwind/              # Tailwind CSS 配置
│   └── Framer_Motion/         # Framer Motion 动画
├── dist/
│   └── web/                   # 构建输出目录
├── vite.config.ts             # Vite 配置
├── tsconfig.json              # TypeScript 配置
└── package.json               # 项目配置
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `bun dev` | 启动完整开发环境 |
| `bun dev:web` | 仅启动前端开发服务器 |
| `bun dev:backend` | 仅启动后端服务 |
| `bun build` | 构建前端生产版本 |
| `bun build:backend` | 构建后端代码 |
| `bun preview` | 预览构建产物 |
| `bun test` | 运行测试 |
| `bun typecheck` | TypeScript 类型检查 |
| `bun release` | 发布新版本 |

## 开发提示

### API 代理配置

开发模式下，前端通过 Vite 代理转发 API 请求到后端。代理配置位于 `vite.config.ts`：

```typescript
server: {
  proxy: {
    '/rpc': { target: 'http://127.0.0.1:3131' },
    '/events': { target: 'http://127.0.0.1:3131' },
    '/kv': { target: 'http://127.0.0.1:3131' },
    // ... 更多代理配置
  }
}
```

### 数据存储

项目使用 LevelDB 作为本地数据存储，数据文件默认保存在 `lanstart.sqlite`。

### 热重载

- 前端：Vite 提供模块热替换 (HMR)
- 后端：使用 `bun --watch` 实现文件变更自动重启

### 类型检查

建议在提交代码前运行类型检查：

```bash
bun typecheck
```

### 测试

运行测试套件：

```bash
bun test
```

测试使用 Vitest 框架，配置文件位于项目根目录。
