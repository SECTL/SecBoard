# 阿里云 ECS 部署

阿里云 ECS 本质上按 Linux 服务器部署。请先选择一种主路径：

- 完整生产：参考 [Bun/Linux 完整部署](./DEPLOYMENT_BUN.md)。
- 容器试运行：参考 [Docker Compose 部署](./DEPLOYMENT_DOCKER.md)。

## ECS 建议配置

- 镜像：Ubuntu Server 22.04/24.04 LTS。
- 内存：至少 1 GB，推荐 2 GB+。
- 系统盘：40 GB+。
- 安全组：开放 `22`、`80`、`443`；不要公网开放 `3131`、`3132`。

## 域名和 HTTPS

1. 在阿里云 DNS 或你的 DNS 服务商中把域名解析到 ECS 公网 IP。
2. 使用 Nginx/Caddy 托管 `dist/web` 并反代 API。
3. 使用 Let's Encrypt、阿里云证书或 Caddy 自动证书启用 HTTPS。

## 数据和备份

SecBoard Bun 主后端使用 SQLite 文件。生产环境建议：

```env
LANSTART_DB_PATH=/opt/secboard/data/lanstart.sqlite
LANSTART_ALLOWED_ORIGINS=https://secboard.example.com
```

备份 `/opt/secboard/data`，并在 ECS 快照中包含该目录。

## 验证

```bash
curl -fsS http://127.0.0.1:3131/health
curl -fsS https://secboard.example.com/health
```

浏览器中确认白板书写、多页面和刷新持久化都正常。
