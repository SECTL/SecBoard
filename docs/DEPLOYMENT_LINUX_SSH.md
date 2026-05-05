# Linux SSH 环境部署文档

## 概述

本文档详细介绍如何在纯 Linux SSH 环境下部署 SecBoard 项目。

## 一、环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Linux | Ubuntu 20.04+ / CentOS 7+ | 操作系统 |
| Node.js | >= 18.0.0 | JavaScript 运行时 |
| Bun | >= 1.0.0 | 可选，用于 Bun 后端 |
| Nginx | >= 1.18.0 | 反向代理 |
| Git | >= 2.0.0 | 代码版本控制 |
| PM2 | >= 5.0.0 | 进程管理 |

## 二、服务器准备

### 2.1 登录服务器

```bash
ssh username@your-server-ip
```

### 2.2 更新系统

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt upgrade -y
```

**CentOS/RHEL:**
```bash
sudo yum update -y
```

### 2.3 安装必要工具

```bash
# Ubuntu/Debian
sudo apt install -y git nginx curl wget

# CentOS/RHEL
sudo yum install -y git nginx curl wget
```

## 三、安装 Node.js

### 3.1 使用 NVM 安装（推荐）

```bash
# 安装 NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 重新加载配置
source ~/.bashrc

# 安装 Node.js 18
nvm install 18
nvm use 18

# 验证安装
node --version
npm --version
```

### 3.2 直接安装

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**CentOS/RHEL:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

## 四、安装 Bun（可选）

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

## 五、安装 PM2

```bash
npm install -g pm2
```

## 六、部署项目

### 6.1 创建项目目录

```bash
sudo mkdir -p /var/www/secboard
sudo chown -R $USER:$USER /var/www/secboard
cd /var/www/secboard
```

### 6.2 克隆代码

```bash
git clone https://github.com/your-repo/secboard.git .
```

### 6.3 安装依赖

```bash
# 安装前端依赖
bun install

# 安装后端依赖（如果使用新后端）
cd backend
bun install
cd ..
```

### 6.4 构建前端

```bash
bun run build
```

### 6.5 构建后端（可选）

```bash
# Bun 后端
cd backend
bun run build:bun
cd ..

# 或 Node.js 后端
cd backend
bun run build:node
cd ..
```

## 七、配置 Nginx

### 7.1 创建配置文件

```bash
sudo nano /etc/nginx/sites-available/secboard
```

### 7.2 添加配置内容

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 前端静态资源
    root /var/www/secboard/dist/web;
    index index.html;

    # 前端路由（SPA 模式）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:3131/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 日志配置
    access_log /var/log/nginx/secboard.access.log;
    error_log /var/log/nginx/secboard.error.log;
}
```

### 7.3 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/secboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 八、配置后端服务

### 8.1 创建 PM2 配置

```bash
cd /var/www/secboard
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'secboard-backend',
    script: 'backend/dist/bun/server.js',
    interpreter: 'bun',
    instances: 1,
    exec_mode: 'fork',
    cwd: '/var/www/secboard',
    env: {
      NODE_ENV: 'production',
      LANSTART_BACKEND_PORT: 3131,
      LANSTART_BACKEND_HOST: '127.0.0.1'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/secboard/error.log',
    out_file: '/var/log/secboard/out.log',
    pid_file: '/var/log/secboard/app.pid'
  }]
}
```

### 8.2 创建日志目录

```bash
sudo mkdir -p /var/log/secboard
sudo chown -R $USER:$USER /var/log/secboard
```

### 8.3 启动后端服务

```bash
pm2 start ecosystem.config.js

# 设置开机自启
pm2 save
pm2 startup
```

## 九、配置 HTTPS

### 9.1 安装 Certbot

**Ubuntu/Debian:**
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

**CentOS/RHEL:**
```bash
sudo yum install -y certbot python3-certbot-nginx
```

### 9.2 获取证书

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 9.3 自动续期

```bash
sudo certbot renew --dry-run
```

## 十、防火墙配置

```bash
# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 仅允许本地访问后端端口
sudo ufw allow from 127.0.0.1 to any port 3131

# 启用防火墙
sudo ufw enable
sudo ufw status
```

## 十一、监控与维护

### 11.1 查看服务状态

```bash
# PM2 状态
pm2 status

# Nginx 状态
sudo systemctl status nginx

# 查看日志
pm2 logs secboard-backend
tail -f /var/log/nginx/secboard.access.log
```

### 11.2 重启服务

```bash
# 重启后端
pm2 restart secboard-backend

# 重启 Nginx
sudo systemctl restart nginx
```

### 11.3 更新代码

```bash
cd /var/www/secboard
git pull
bun install
bun run build
pm2 restart secboard-backend
```

## 十二、故障排除

### 12.1 端口被占用

```bash
lsof -i :3131
kill -9 <PID>
```

### 12.2 Nginx 配置错误

```bash
sudo nginx -t
```

### 12.3 权限问题

```bash
sudo chown -R www-data:www-data /var/www/secboard/dist/web
```

### 12.4 SELinux 问题（CentOS）

```bash
sudo setsebool -P httpd_can_network_connect 1
sudo chcon -R -t httpd_sys_content_t /var/www/secboard
```

---

**文档版本**: 1.0.0  
**最后更新**: 2026-05-05
