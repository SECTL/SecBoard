# 前端独立部署文档

## 概述

本文档详细介绍如何独立部署 SecBoard 前端应用。

## 一、环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 18.0.0 | JavaScript 运行时 |
| npm/yarn/pnpm | 最新版本 | 包管理器 |
| Nginx | >= 1.18.0 | 反向代理（可选） |
| Git | >= 2.0.0 | 代码版本控制 |

## 二、本地开发

### 2.1 克隆项目

```bash
git clone https://github.com/your-repo/secboard.git
cd secboard
```

### 2.2 安装依赖

```bash
bun install
```

### 2.3 运行开发服务器

```bash
# 纯前端模式（无后端）
bun run dev:frontend

# 或连接后端的开发模式
bun run dev:web
```

### 2.4 访问应用

打开浏览器访问：`http://localhost:5173`

## 三、生产构建

### 3.1 构建项目

```bash
# 纯前端模式构建
bun run build:frontend

# 或通用构建
bun run build
```

构建产物将生成在 `dist/web` 目录。

### 3.2 配置环境变量

创建 `.env.production` 文件：

```env
# 纯前端模式（不连接后端）
VITE_PURE_FRONTEND=true

# 或连接后端
# VITE_LANSTART_API_BASE=https://api.your-domain.com
```

## 四、部署到静态服务器

### 4.1 使用 Nginx 部署

#### 4.1.1 创建 Nginx 配置

```bash
sudo nano /etc/nginx/sites-available/secboard-frontend
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/secboard/dist/web;
    index index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 日志配置
    access_log /var/log/nginx/secboard-frontend.access.log;
    error_log /var/log/nginx/secboard-frontend.error.log;
}
```

#### 4.1.2 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/secboard-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.2 部署到 Netlify

#### 4.2.1 创建 netlify.toml

```toml
[build]
  command = "bun run build:frontend"
  publish = "dist/web"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/*.{js,css,ico,png,jpg,jpeg,gif,svg,woff,woff2,ttf,eot}"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

#### 4.2.2 配置环境变量

在 Netlify 控制台添加环境变量：
- `VITE_PURE_FRONTEND=true`

### 4.3 部署到 Vercel

#### 4.3.1 创建 vercel.json

```json
{
  "buildCommand": "bun run build:frontend",
  "outputDirectory": "dist/web",
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

#### 4.3.2 配置环境变量

在 Vercel 控制台添加环境变量：
- `VITE_PURE_FRONTEND=true`

### 4.4 部署到 Cloudflare Pages

#### 4.4.1 配置构建

1. 登录 Cloudflare Dashboard
2. 进入 Pages > 创建项目
3. 连接 GitHub 仓库
4. 配置构建设置：
   - 框架预设：`Vite`
   - 构建命令：`bun run build:frontend`
   - 输出目录：`dist/web`

#### 4.4.2 配置环境变量

在 Cloudflare Pages 项目设置中添加环境变量：
- `VITE_PURE_FRONTEND=true`

## 五、配置 HTTPS

### 5.1 使用 Let's Encrypt

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 5.2 配置 SSL

更新 Nginx 配置：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE:ECDH:AES:HIGH:!NULL:!aNULL:!MD5:!ADH:!RC4;

    root /var/www/secboard/dist/web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$host$request_uri;
}
```

## 六、连接后端（可选）

### 6.1 配置后端地址

在 `.env.production` 中设置：

```env
VITE_PURE_FRONTEND=false
VITE_LANSTART_API_BASE=https://api.your-domain.com
```

### 6.2 配置反向代理

```nginx
server {
    # ... 其他配置

    location /api/ {
        proxy_pass http://localhost:3131/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 七、性能优化

### 7.1 启用 Gzip 压缩

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
gzip_min_length 1000;
gzip_comp_level 5;
```

### 7.2 配置 CDN

使用 Cloudflare、阿里云 CDN 或其他 CDN 服务加速静态资源。

### 7.3 启用 HTTP/2

```nginx
listen 443 ssl http2;
```

## 八、监控与维护

### 8.1 查看日志

```bash
tail -f /var/log/nginx/secboard-frontend.access.log
tail -f /var/log/nginx/secboard-frontend.error.log
```

### 8.2 更新代码

```bash
cd /var/www/secboard
git pull
bun install
bun run build:frontend
sudo systemctl reload nginx
```

### 8.3 清理旧版本

```bash
# 清理旧的构建产物
rm -rf dist/web/*
```

---

**文档版本**: 1.0.0  
**最后更新**: 2026-05-05
