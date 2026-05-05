# SecBoard 完整部署指南

## 概述

本文档提供 SecBoard 项目的完整部署指南，涵盖各种部署场景和环境。

## 一、部署架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        部署架构图                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────┐    HTTP    ┌──────────┐    API    ┌────────────┐   │
│   │   用户   │ ─────────→ │   Nginx  │ ─────────→ │   后端服务  │   │
│   │ (浏览器) │            │  反向代理 │            │ (Bun/Node) │   │
│   └──────────┘            └──────────┘            └────────────┘   │
│         │                      │                                      │
│         │ 静态资源              │                                      │
│         ↓                      ↓                                      │
│   ┌──────────────────────────────────────────┐                       │
│   │          前端静态文件 (dist/web)         │                       │
│   └──────────────────────────────────────────┘                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 二、部署方案选择

| 方案 | 适用场景 | 复杂度 | 推荐指数 |
|------|---------|--------|---------|
| **纯前端模式** | 无后端需求、快速部署 | 低 | ★★★★★ |
| **Bun 后端** | 开发环境、小型部署 | 低 | ★★★★☆ |
| **Node.js 后端** | 生产环境、需要 Node.js 生态 | 中 | ★★★★☆ |
| **Cloudflare Workers** | 全球部署、高可用 | 中 | ★★★★★ |
| **Docker Compose** | 本地测试、多容器部署 | 中 | ★★★☆☆ |
| **宝塔面板** | 新手用户、可视化管理 | 低 | ★★★★☆ |
| **阿里云 ECS** | 企业级部署、高可控性 | 高 | ★★★★☆ |

## 三、快速开始

### 3.1 纯前端模式（最快）

```bash
# 克隆项目
git clone https://github.com/your-repo/secboard.git
cd secboard

# 安装依赖
bun install

# 构建
bun run build:frontend

# 预览（使用 Vite）
bun run preview
```

### 3.2 前后端分离模式

```bash
# 启动前端
bun run dev:web

# 启动后端（新终端）
bun run dev:backend:bun
```

## 四、配置说明

### 4.1 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_PURE_FRONTEND` | 是否启用纯前端模式 | `false` |
| `VITE_LANSTART_API_BASE` | 后端 API 地址 | `http://localhost:3131` |
| `LANSTART_BACKEND_PORT` | 后端服务端口 | `3131` |
| `LANSTART_BACKEND_HOST` | 后端服务主机 | `127.0.0.1` |

### 4.2 配置文件

```env
# .env.production
VITE_PURE_FRONTEND=true
VITE_LANSTART_API_BASE=https://api.secboard.example.com
```

## 五、部署检查清单

### 5.1 部署前检查

- [ ] 确认 Node.js 版本 >= 18.0.0
- [ ] 确认 Bun 版本 >= 1.0.0（如果使用 Bun）
- [ ] 确认域名已正确解析
- [ ] 确认 SSL 证书已配置
- [ ] 确认防火墙已开放 80/443 端口

### 5.2 部署后验证

```bash
# 检查前端
curl -I http://your-domain.com/
# 预期状态码：200 OK

# 检查后端（如果启用）
curl http://your-domain.com/api/health
# 预期输出：{"ok":true,"platform":"unknown"}

# 检查静态资源
curl -I http://your-domain.com/assets/index.css
# 预期状态码：200 OK
```

## 六、常见问题

### 6.1 前端页面显示空白

**可能原因：**
- JavaScript 打包错误
- 路由配置错误
- 资源加载失败

**解决方案：**
```bash
# 检查控制台错误
# 打开浏览器开发者工具 > Console

# 检查构建日志
bun run build:frontend 2>&1 | tail -20

# 检查 Nginx 日志
tail -f /var/log/nginx/error.log
```

### 6.2 后端服务无法启动

**可能原因：**
- 端口被占用
- 依赖未安装
- 权限不足

**解决方案：**
```bash
# 检查端口占用
lsof -i :3131

# 检查 PM2 日志
pm2 logs secboard-backend

# 检查 Node.js 版本
node --version
```

### 6.3 API 请求失败

**可能原因：**
- CORS 配置错误
- 反向代理配置错误
- 后端服务未运行

**解决方案：**
```bash
# 检查 CORS 响应头
curl -I http://api.your-domain.com/health

# 检查 Nginx 配置
nginx -t

# 检查后端状态
pm2 status
```

### 6.4 HTTPS 证书问题

**可能原因：**
- 证书过期
- 域名不匹配
- 证书链不完整

**解决方案：**
```bash
# 检查证书状态
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout

# 重新获取证书
certbot renew --force-renewal
```

## 七、运维建议

### 7.1 日志管理

```bash
# 配置日志轮转
sudo nano /etc/logrotate.d/secboard

/var/log/secboard/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
}
```

### 7.2 监控告警

```bash
# 安装监控工具
sudo apt install -y htop glances

# 配置系统监控
# 推荐使用：Prometheus + Grafana
```

### 7.3 备份策略

```bash
# 每日备份
0 2 * * * tar -czf /backup/secboard-$(date +%Y%m%d).tar.gz /var/www/secboard

# 保留最近 7 天备份
find /backup -name "secboard-*.tar.gz" -mtime +7 -delete
```

### 7.4 安全建议

1. **最小权限原则**：运行服务使用非 root 用户
2. **定期更新**：定期更新系统和依赖包
3. **防火墙配置**：只开放必要端口
4. **SSL/TLS**：始终启用 HTTPS
5. **安全头**：配置安全相关的 HTTP 响应头

```nginx
# 安全头配置
add_header X-Frame-Options "SAMEORIGIN";
add_header X-XSS-Protection "1; mode=block";
add_header X-Content-Type-Options "nosniff";
add_header Content-Security-Policy "default-src 'self'";
```

## 八、部署文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| Bun 后端部署 | [DEPLOYMENT_BUN.md](DEPLOYMENT_BUN.md) | Bun 运行时部署指南 |
| Node.js 后端部署 | [DEPLOYMENT_NODE.md](DEPLOYMENT_NODE.md) | Node.js 运行时部署指南 |
| Cloudflare Workers | [DEPLOYMENT_CF.md](DEPLOYMENT_CF.md) | Cloudflare 部署指南 |
| Linux SSH 部署 | [DEPLOYMENT_LINUX_SSH.md](DEPLOYMENT_LINUX_SSH.md) | 纯命令行部署指南 |
| 宝塔面板部署 | [DEPLOYMENT_BAOTA.md](DEPLOYMENT_BAOTA.md) | 宝塔面板部署指南 |
| 阿里云 ECS 部署 | [DEPLOYMENT_ALIYUN.md](DEPLOYMENT_ALIYUN.md) | 阿里云部署指南 |
| Docker Compose | [DEPLOYMENT_DOCKER.md](DEPLOYMENT_DOCKER.md) | Docker 容器部署指南 |
| 前端独立部署 | [DEPLOYMENT_FRONTEND.md](DEPLOYMENT_FRONTEND.md) | 纯前端部署指南 |

---

**文档版本**: 1.0.0  
**最后更新**: 2026-05-05
