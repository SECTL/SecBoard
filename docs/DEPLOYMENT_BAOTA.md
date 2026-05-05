# 宝塔面板部署文档

## 概述

本文档详细介绍如何使用宝塔面板部署 SecBoard 项目。

## 一、环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| 宝塔面板 | >= 7.0.0 | 服务器管理面板 |
| Node.js | >= 18.0.0 | JavaScript 运行时 |
| Nginx | >= 1.18.0 | 反向代理 |
| PM2 | >= 5.0.0 | 进程管理 |

## 二、准备工作

### 2.1 安装宝塔面板

```bash
# CentOS
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh

# Ubuntu/Debian
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh
```

安装完成后，记录宝塔面板的登录地址、用户名和密码。

### 2.2 登录宝塔面板

打开浏览器访问：`http://your-server-ip:8888`

## 三、安装必要软件

### 3.1 安装 Node.js

1. 进入宝塔面板 > 软件商店 > 运行环境
2. 找到 "Node.js"，点击 "安装"
3. 选择版本 >= 18.0.0
4. 等待安装完成

### 3.2 安装 PM2 管理器

1. 进入宝塔面板 > 软件商店 > 运行环境
2. 找到 "PM2 管理器"，点击 "安装"

### 3.3 安装 Nginx

1. 进入宝塔面板 > 软件商店 > Web 服务器
2. 找到 "Nginx"，点击 "安装"

## 四、创建网站

### 4.1 添加站点

1. 进入宝塔面板 > 网站 > 添加站点
2. 填写信息：
   - 域名：`your-domain.com`
   - 端口：`80`
   - 根目录：`/www/wwwroot/secboard/dist/web`
   - 数据库：无需选择（前端项目）
   - PHP版本：纯静态（无需PHP）
3. 点击 "提交"

### 4.2 配置 SSL

1. 进入站点管理 > SSL
2. 选择 "Let's Encrypt"
3. 勾选需要证书的域名
4. 点击 "申请"

## 五、部署前端代码

### 5.1 通过 SSH 上传代码

```bash
# 登录服务器
ssh username@your-server-ip

# 进入网站目录
cd /www/wwwroot/secboard

# 克隆代码
git clone https://github.com/your-repo/secboard.git .

# 安装依赖
npm install

# 构建项目
npm run build
```

### 5.2 通过宝塔文件管理器上传

1. 进入宝塔面板 > 文件 > /www/wwwroot
2. 创建 `secboard` 目录
3. 上传项目压缩包
4. 解压到当前目录
5. 进入目录执行安装和构建

## 六、配置反向代理

### 6.1 添加反向代理规则

1. 进入站点管理 > 反向代理 > 添加反向代理
2. 填写信息：
   - 代理名称：`secboard-api`
   - 代理路径：`/api/`
   - 目标 URL：`http://127.0.0.1:3131/`
3. 点击 "保存"

### 6.2 配置 URL 重写

1. 进入站点管理 > URL 重写 > 添加规则
2. 规则名称：`SPA`
3. 规则类型：`thinkphp`（选择支持 SPA 的规则）
4. 或手动添加：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## 七、部署后端服务

### 7.1 创建 PM2 进程

1. 进入宝塔面板 > PM2 管理器 > 添加项目
2. 填写信息：
   - 项目名称：`secboard-backend`
   - 运行目录：`/www/wwwroot/secboard/backend`
   - 启动文件：`dist/bun/server.js`
   - 运行方式：`bun`
   - 端口：`3131`
3. 点击 "提交"

### 7.2 配置环境变量

1. 在 PM2 管理器中找到项目
2. 点击 "设置" > "环境变量"
3. 添加环境变量：
   - `NODE_ENV=production`
   - `LANSTART_BACKEND_PORT=3131`
   - `LANSTART_BACKEND_HOST=127.0.0.1`
4. 点击 "保存"

### 7.3 启动服务

1. 在 PM2 管理器中找到项目
2. 点击 "启动"
3. 检查状态是否为 "运行中"

## 八、配置防火墙

### 8.1 开放端口

1. 进入宝塔面板 > 安全 > 防火墙
2. 添加规则：
   - 端口：`80`（HTTP）
   - 端口：`443`（HTTPS）
   - 端口：`3131`（后端服务，可选，建议仅允许本地访问）
3. 点击 "确定"

### 8.2 宝塔面板端口

确保宝塔面板端口（默认 8888）已开放。

## 九、配置 CDN（可选）

### 9.1 配置 Cloudflare CDN

1. 登录 Cloudflare
2. 添加域名
3. 修改域名 DNS 解析为 Cloudflare 提供的 DNS
4. 在 Cloudflare 中配置缓存规则

## 十、监控与维护

### 10.1 查看日志

1. 进入宝塔面板 > PM2 管理器 > 点击项目 > 日志
2. 查看 Nginx 日志：站点管理 > 日志

### 10.2 重启服务

1. PM2：PM2 管理器 > 点击项目 > 重启
2. Nginx：软件商店 > Nginx > 重启

### 10.3 更新代码

1. 通过 SSH 进入目录拉取代码
2. 重新构建
3. 重启 PM2 进程

## 十一、常见问题

### 11.1 前端页面无法访问

- 检查 Nginx 配置是否正确
- 检查域名解析是否生效
- 检查防火墙是否开放 80/443 端口

### 11.2 后端服务无法启动

- 检查 Node.js 版本是否正确
- 检查 PM2 配置是否正确
- 查看 PM2 日志排查错误

### 11.3 HTTPS 证书问题

- 确保域名已正确解析
- 确保服务器可以访问 Let's Encrypt
- 检查防火墙是否阻止出站连接

---

**文档版本**: 1.0.0  
**最后更新**: 2026-05-05
