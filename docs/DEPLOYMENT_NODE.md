# Node.js 后端部署文档

## 概述

本文档详细介绍如何在不同环境下部署 SecBoard Node.js 后端服务。

## 一、环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 18.0.0 | JavaScript 运行时 |
| npm/yarn/pnpm | 最新版本 | 包管理器 |
| Git | >= 2.0.0 | 代码版本控制 |

## 二、本地开发环境部署

### 2.1 安装依赖

```bash
# 克隆项目
git clone https://github.com/your-repo/secboard.git
cd secboard

# 安装项目依赖
npm install
```

### 2.2 运行开发服务器

```bash
# 方式一：使用项目根目录脚本
bun run dev:backend:node

# 方式二：直接运行后端
cd backend
bun run dev:node
```

### 2.3 验证服务

```bash
# 检查服务是否启动成功
curl http://localhost:3131/health
# 预期输出：{"ok":true,"platform":"unknown"}
```

## 三、生产环境部署

### 3.1 构建项目

```bash
cd backend
bun run build:node
```

构建产物将生成在 `backend/dist/node/` 目录。

### 3.2 运行生产服务器

```bash
# 方式一：直接运行
node backend/dist/node/index.js

# 方式二：使用环境变量指定端口
LANSTART_BACKEND_PORT=3131 LANSTART_BACKEND_HOST=0.0.0.0 node backend/dist/node/index.js
```

### 3.3 配置环境变量

创建 `.env` 文件：

```env
# 后端服务配置
LANSTART_BACKEND_PORT=3131
LANSTART_BACKEND_HOST=0.0.0.0

# 纯前端模式（可选）
LANSTART_PURE_FRONTEND=false

# SQLite 数据库路径（如果使用 SQLite 持久化）
DATABASE_PATH=./data/database.sqlite
```

## 四、使用 PM2 管理进程

### 4.1 安装 PM2

```bash
npm install -g pm2
```

### 4.2 创建 PM2 配置文件

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'secboard-backend-node',
    script: 'backend/dist/node/index.js',
    interpreter: 'node',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      LANSTART_BACKEND_PORT: 3131,
      LANSTART_BACKEND_HOST: '0.0.0.0'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    pid_file: './logs/app.pid'
  }]
}
```

### 4.3 启动服务

```bash
# 创建日志目录
mkdir -p logs

# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs secboard-backend-node
```

## 五、Docker 部署

### 5.1 创建 Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY backend/ ./backend/
WORKDIR /app/backend
RUN npm run build:node

EXPOSE 3131

CMD ["node", "dist/node/index.js"]
```

### 5.2 构建并运行

```bash
# 构建镜像
docker build -t secboard-backend-node:latest .

# 运行容器
docker run -d \
  --name secboard-backend-node \
  -p 3131:3131 \
  -e LANSTART_BACKEND_PORT=3131 \
  -e LANSTART_BACKEND_HOST=0.0.0.0 \
  secboard-backend-node:latest
```

## 六、Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name api.secboard.example.com;

    location / {
        proxy_pass http://localhost:3131;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 支持（如果需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 七、安全建议

### 7.1 防火墙配置

```bash
# 允许 HTTP/HTTPS 访问
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 仅允许本地访问后端端口
sudo ufw allow from 127.0.0.1 to any port 3131
```

### 7.2 HTTPS 配置

使用 Let's Encrypt 配置 HTTPS：

```bash
# 安装 Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d api.secboard.example.com
```

## 八、故障排除

### 8.1 端口被占用

```bash
# 检查端口占用
lsof -i :3131

# 杀死占用进程
kill -9 <PID>
```

### 8.2 服务启动失败

```bash
# 查看 PM2 日志
pm2 logs secboard-backend-node

# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version
```

### 8.3 内存问题

如果服务因内存不足崩溃，可以增加 Node.js 内存限制：

```bash
node --max-old-space-size=2048 backend/dist/node/index.js
```

---

**文档版本**: 1.0.0  
**最后更新**: 2026-05-05
