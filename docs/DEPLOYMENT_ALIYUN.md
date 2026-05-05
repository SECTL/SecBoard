# 阿里云 ECS 部署文档

## 概述

本文档详细介绍如何在阿里云 ECS 上部署 SecBoard 项目。

## 一、环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| ECS 实例 | Ubuntu 20.04 / CentOS 7+ | 云服务器 |
| 内存 | >= 2GB | 建议配置 |
| 带宽 | >= 1Mbps | 公网带宽 |

## 二、购买 ECS 实例

### 2.1 登录阿里云控制台

1. 访问 [阿里云官网](https://www.aliyun.com/)
2. 登录账号
3. 进入 ECS 控制台

### 2.2 创建实例

1. 点击 "创建实例"
2. 选择配置：
   - 地域：选择就近区域
   - 实例规格：推荐 `ecs.g6.large`（2核4GB）
   - 镜像：Ubuntu Server 22.04 LTS 64位
   - 存储：系统盘 40GB SSD
   - 网络：专有网络 VPC
   - 安全组：允许 80、443、22 端口
3. 设置登录密码或密钥
4. 确认订单并创建

### 2.3 配置安全组

1. 进入 ECS 控制台 > 安全组
2. 找到实例的安全组
3. 添加规则：
   - 入方向：HTTP(80)、HTTPS(443)、SSH(22)
   - 优先级：1-100

## 三、连接服务器

### 3.1 使用 SSH 连接

```bash
ssh root@your-server-ip
```

### 3.2 使用阿里云控制台连接

1. 进入 ECS 控制台 > 实例列表
2. 找到实例 > 点击 "远程连接"
3. 选择 "Workbench 远程连接"

## 四、安装依赖

### 4.1 更新系统

```bash
# Ubuntu
apt update && apt upgrade -y

# CentOS
yum update -y
```

### 4.2 安装 Node.js

```bash
# 使用 NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 4.3 安装其他依赖

```bash
# Ubuntu
apt install -y nginx git

# CentOS
yum install -y nginx git
```

## 五、部署项目

### 5.1 创建项目目录

```bash
mkdir -p /var/www/secboard
cd /var/www/secboard
```

### 5.2 克隆代码

```bash
git clone https://github.com/your-repo/secboard.git .
```

### 5.3 安装依赖并构建

```bash
npm install
npm run build
```

### 5.4 配置后端

```bash
cd backend
npm install
npm run build:bun
cd ..
```

## 六、配置 Nginx

### 6.1 创建配置文件

```bash
nano /etc/nginx/sites-available/secboard
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/secboard/dist/web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3131/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 6.2 启用配置

```bash
ln -s /etc/nginx/sites-available/secboard /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 七、配置 HTTPS（阿里云 SSL 证书）

### 7.1 申请证书

1. 进入阿里云控制台 > SSL 证书
2. 点击 "购买证书" > 选择 "免费版 DV SSL"
3. 填写域名信息
4. 验证域名（DNS 验证或文件验证）
5. 等待证书颁发

### 7.2 下载证书

1. 在 SSL 证书控制台找到已颁发的证书
2. 点击 "下载" > 选择 "Nginx"
3. 解压证书文件

### 7.3 配置 Nginx HTTPS

```bash
# 上传证书到服务器
scp /path/to/cert.crt root@your-server-ip:/etc/nginx/ssl/
scp /path/to/key.key root@your-server-ip:/etc/nginx/ssl/
```

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.crt;
    ssl_certificate_key /etc/nginx/ssl/key.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE:ECDH:AES:HIGH:!NULL:!aNULL:!MD5:!ADH:!RC4;

    root /var/www/secboard/dist/web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3131/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

## 八、配置域名解析

### 8.1 添加 DNS 记录

1. 进入阿里云控制台 > 域名
2. 找到域名 > 点击 "解析"
3. 添加记录：
   - 类型：A
   - 主机记录：@
   - 记录值：ECS 公网 IP
   - TTL：10分钟

## 九、启动后端服务

### 9.1 使用 PM2

```bash
npm install -g pm2

pm2 start backend/dist/bun/server.js --name secboard-backend \
  --interpreter bun \
  --env LANSTART_BACKEND_PORT=3131 \
  --env LANSTART_BACKEND_HOST=127.0.0.1

pm2 save
pm2 startup
```

## 十、配置 CDN（可选）

### 10.1 配置阿里云 CDN

1. 进入阿里云控制台 > CDN
2. 点击 "添加域名"
3. 填写信息：
   - 加速域名：`cdn.your-domain.com`
   - 源站类型：IP 源站
   - 源站地址：ECS 公网 IP
4. 配置缓存规则

## 十一、监控与告警

### 11.1 配置云监控

1. 进入阿里云控制台 > 云监控
2. 找到 ECS 实例
3. 配置告警规则：
   - CPU 使用率 > 80%
   - 内存使用率 > 80%
   - 磁盘使用率 > 80%

### 11.2 查看日志

```bash
pm2 logs secboard-backend
tail -f /var/log/nginx/access.log
```

## 十二、备份与恢复

### 12.1 数据备份

```bash
# 备份数据库
tar -czf secboard-backup-$(date +%Y%m%d).tar.gz /var/www/secboard

# 使用阿里云快照（推荐）
# 进入 ECS 控制台 > 快照 > 创建快照
```

### 12.2 自动备份

1. 进入阿里云控制台 > 云监控
2. 创建定时任务执行备份脚本

---

**文档版本**: 1.0.0  
**最后更新**: 2026-05-05
