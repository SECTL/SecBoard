# Docker Compose 部署文档

## 概述

本文档详细介绍如何使用 Docker Compose 部署 SecBoard 项目。

## 一、环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Docker | >= 20.10.0 | 容器引擎 |
| Docker Compose | >= 2.0.0 | 容器编排 |

## 二、创建配置文件

### 2.1 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    environment:
      - VITE_LANSTART_API_BASE=http://api:3131
    depends_on:
      - backend
    networks:
      - secboard-network

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3131:3131"
    environment:
      - LANSTART_BACKEND_PORT=3131
      - LANSTART_BACKEND_HOST=0.0.0.0
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
    networks:
      - secboard-network

networks:
  secboard-network:
    driver: bridge
```

### 2.2 创建前端 Dockerfile

创建 `Dockerfile.frontend`：

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .
RUN bun run build

# 生产阶段
FROM nginx:alpine

COPY --from=builder /app/dist/web /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2.3 创建后端 Dockerfile

创建 `Dockerfile.backend`：

```dockerfile
FROM oven/bun:1.0.26

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production

COPY backend/ ./backend/
WORKDIR /app/backend
RUN bun run build:bun

EXPOSE 3131

CMD ["bun", "dist/bun/server.js"]
```

### 2.4 创建 Nginx 配置

创建 `nginx.conf`：

```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://backend:3131/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 三、部署步骤

### 3.1 创建数据目录

```bash
mkdir -p data
```

### 3.2 启动服务

```bash
# 后台启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看状态
docker-compose ps
```

### 3.3 停止服务

```bash
# 停止并移除容器
docker-compose down

# 停止但保留容器
docker-compose stop
```

### 3.4 更新服务

```bash
# 重新构建并启动
docker-compose up -d --build

# 仅更新前端
docker-compose up -d --build frontend

# 仅更新后端
docker-compose up -d --build backend
```

## 四、配置 HTTPS（使用 Traefik）

### 4.1 更新 docker-compose.yml

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.9
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.httpchallenge=true"
      - "--certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.myresolver.acme.email=your-email@example.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./letsencrypt:/letsencrypt
    networks:
      - secboard-network

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=myresolver"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
      - "traefik.http.routers.frontend-http.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.frontend-http.entrypoints=web"
      - "traefik.http.routers.frontend-http.middlewares=redirect-to-https"
    environment:
      - VITE_LANSTART_API_BASE=https://your-domain.com/api
    depends_on:
      - backend
    networks:
      - secboard-network

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`your-domain.com`) && PathPrefix(`/api`)"
      - "traefik.http.routers.backend.entrypoints=websecure"
      - "traefik.http.routers.backend.tls.certresolver=myresolver"
    environment:
      - LANSTART_BACKEND_PORT=3131
      - LANSTART_BACKEND_HOST=0.0.0.0
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
    networks:
      - secboard-network

networks:
  secboard-network:
    driver: bridge
```

## 五、生产环境配置

### 5.1 添加环境变量

创建 `.env` 文件：

```env
# 前端配置
VITE_LANSTART_API_BASE=https://api.your-domain.com

# 后端配置
LANSTART_BACKEND_PORT=3131
LANSTART_BACKEND_HOST=0.0.0.0
NODE_ENV=production

# 数据库配置（如果需要）
DATABASE_PATH=/app/data/database.sqlite
```

### 5.2 使用环境变量

更新 `docker-compose.yml`：

```yaml
services:
  backend:
    environment:
      - LANSTART_BACKEND_PORT=${LANSTART_BACKEND_PORT}
      - LANSTART_BACKEND_HOST=${LANSTART_BACKEND_HOST}
      - NODE_ENV=${NODE_ENV}
```

## 六、监控与日志

### 6.1 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f frontend
docker-compose logs -f backend

# 查看最近的日志
docker-compose logs --tail=100
```

### 6.2 进入容器

```bash
# 进入前端容器
docker-compose exec frontend sh

# 进入后端容器
docker-compose exec backend sh
```

### 6.3 健康检查

```bash
# 检查前端
curl http://localhost/health

# 检查后端
curl http://localhost:3131/health
```

## 七、备份与恢复

### 7.1 备份数据

```bash
# 备份数据目录
tar -czf secboard-backup-$(date +%Y%m%d).tar.gz data/

# 备份 Docker 镜像
docker save secboard-frontend secboard-backend | gzip > secboard-images.tar.gz
```

### 7.2 恢复数据

```bash
# 恢复数据目录
tar -xzf secboard-backup-YYYYMMDD.tar.gz

# 加载 Docker 镜像
docker load < secboard-images.tar.gz
```

---

**文档版本**: 1.0.0  
**最后更新**: 2026-05-05
