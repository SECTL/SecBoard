# Linux SSH 部署

Linux SSH 部署请以 [Bun/Linux 完整部署](./DEPLOYMENT_BUN.md) 为准。当前完整后端入口是 `src/elysia/index.ts`，不推荐使用 `backend/node` 或旧的模块化后端作为生产服务。

## SSH 快速流程

```bash
ssh username@your-server-ip
sudo apt update
sudo apt install -y git curl nginx

curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

sudo mkdir -p /opt/secboard
sudo chown "$USER":"$USER" /opt/secboard
git clone <repo-url> /opt/secboard
cd /opt/secboard

cp .env.example .env
bun install --frozen-lockfile
bun run typecheck
bun run build
```

之后继续执行 [Bun/Linux 完整部署](./DEPLOYMENT_BUN.md) 中的 systemd、Nginx/Caddy、备份和更新步骤。

## 防火墙

公网服务器建议只开放：

- `22/tcp`：SSH，最好限制来源 IP。
- `80/tcp`：HTTP，用于证书签发和跳转。
- `443/tcp`：HTTPS。

`3131` 和 `3132` 应只监听本机或只允许反向代理访问。

## 验证

```bash
curl -fsS http://127.0.0.1:3131/health
curl -fsS https://secboard.example.com/health
```
