# Docker 部署指南

使用 Docker 容器化部署，适合各种云服务器和本地环境。

## 创建 Dockerfile

项目已包含 `Dockerfile`，内容如下：

```dockerfile
# 构建阶段
FROM node:24-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml* ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install

# 复制源代码
COPY . .

# 构建项目
RUN pnpm build

# 运行阶段
FROM node:24-alpine AS runner

WORKDIR /app

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 5000

ENV PORT 5000
ENV HOSTNAME "0.0.0.0"

# 启动应用
CMD ["node", "server.js"]
```

## 配置 next.config.js

确保 `next.config.js` 包含以下配置以支持 standalone 输出：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

module.exports = nextConfig
```

## 构建和运行

### 本地构建

```bash
# 1. 构建 Docker 镜像
docker build -t bitable-plugin .

# 2. 运行容器
docker run -p 5000:5000 bitable-plugin
```

### 生产环境部署

```bash
# 1. 构建镜像
docker build -t bitable-plugin:latest .

# 2. 标记镜像（推送到 Docker Hub）
docker tag bitable-plugin:latest your-username/bitable-plugin:latest

# 3. 登录 Docker Hub
docker login

# 4. 推送镜像
docker push your-username/bitable-plugin:latest
```

## 使用 Docker Compose

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  app:
    image: bitable-plugin:latest
    container_name: bitable-plugin
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000"]
      interval: 30s
      timeout: 10s
      retries: 3
```

启动服务：

```bash
docker-compose up -d
```

## 云服务器部署

### 阿里云 / 腾讯云 / 华为云

1. **购买服务器**
   - 推荐：2核4G + 40GB SSD
   - 系统：Ubuntu 20.04 / CentOS 8

2. **安装 Docker**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

3. **上传镜像或拉取**
   ```bash
   docker pull your-username/bitable-plugin:latest
   ```

4. **运行容器**
   ```bash
   docker run -d \
     --name bitable-plugin \
     -p 5000:5000 \
     --restart=unless-stopped \
     your-username/bitable-plugin:latest
   ```

## 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 配置 SSL 证书

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 常用 Docker 命令

```bash
# 查看运行中的容器
docker ps

# 查看容器日志
docker logs bitable-plugin

# 进入容器
docker exec -it bitable-plugin sh

# 停止容器
docker stop bitable-plugin

# 启动容器
docker start bitable-plugin

# 重启容器
docker restart bitable-plugin

# 删除容器
docker rm bitable-plugin

# 删除镜像
docker rmi bitable-plugin
```

## 故障排查

### 容器无法启动
```bash
# 查看日志
docker logs bitable-plugin

# 检查端口占用
netstat -tuln | grep 5000
```

### 内存不足
```bash
# 限制内存使用
docker run -m 1g --memory-swap 2g bitable-plugin
```

### 性能优化
```bash
# 使用多阶段构建减小镜像体积
# 使用 .dockerignore 排除不必要文件
# 使用生产环境变量 NODE_ENV=production
```

## 更多信息

- [Docker 官方文档](https://docs.docker.com/)
- [Next.js Docker 部署](https://nextjs.org/docs/deployment#docker-image)
