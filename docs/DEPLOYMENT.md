# 飞书多维表格插件部署指南

本文档提供多种部署方式，根据你的需求选择合适的方案。

## 📋 部署方式对比

| 部署方式 | 难度 | 成本 | 适用场景 | 推荐度 |
|---------|------|------|---------|--------|
| Vercel  | ⭐ 最简单 | 免费版可用 | 个人项目、快速上线 | ⭐⭐⭐⭐⭐ |
| Docker  | ⭐⭐⭐ 中等 | 需要服务器 | 企业项目、自建服务器 | ⭐⭐⭐⭐ |
| 传统部署 | ⭐⭐⭐⭐ 复杂 | 需要服务器 | 传统运维团队 | ⭐⭐⭐ |

## 🚀 快速开始

### 前置要求

- Node.js 24+（开发环境）
- Git（版本控制）
- 服务器（Docker/传统部署需要）
- 域名（可选，用于自定义访问地址）

---

## 方式一：Vercel 部署（推荐）

### 优点
- ✅ 零配置，自动部署
- ✅ 全球 CDN 加速
- ✅ 自动 HTTPS
- ✅ 免费版足够个人使用
- ✅ 自动 CI/CD

### 详细步骤

详见 [Vercel 部署指南](./DEPLOY_VERCEL.md)

### 快速部署

```bash
# 1. 安装 Vercel CLI
pnpm add -g vercel

# 2. 登录并部署
vercel login
vercel

# 3. 生产部署
vercel --prod
```

### 访问地址
部署后会获得一个 `.vercel.app` 域名，如：
```
https://bitable-plugin.vercel.app
```

---

## 方式二：Docker 部署

### 优点
- ✅ 环境隔离，可移植性强
- ✅ 易于扩展和维护
- ✅ 适合云服务器部署
- ✅ 支持容器编排（K8s）

### 详细步骤

详见 [Docker 部署指南](./DEPLOY_DOCKER.md)

### 快速开始

```bash
# 1. 构建镜像
docker build -t bitable-plugin .

# 2. 运行容器
docker run -d -p 5000:5000 --name bitable-plugin bitable-plugin

# 3. 访问应用
# http://localhost:5000
```

### 云服务器部署

推荐云服务商：
- **阿里云**：[阿里云 ECS](https://www.aliyun.com/product/ecs)
- **腾讯云**：[腾讯云 CVM](https://cloud.tencent.com/product/cvm)
- **华为云**：[华为云 ECS](https://www.huaweicloud.com/product/ecs)
- **AWS**：[Amazon EC2](https://aws.amazon.com/ec2/)

---

## 方式三：传统服务器部署

### 前置要求
- Linux 服务器（Ubuntu/CentOS）
- Node.js 24+
- PM2 进程管理器

### 部署步骤

#### 1. 连接服务器

```bash
ssh root@your-server-ip
```

#### 2. 安装 Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_24.x | sudo bash -
sudo yum install -y nodejs
```

#### 3. 安装 pnpm

```bash
npm install -g pnpm
```

#### 4. 克隆项目

```bash
git clone https://github.com/your-username/bitable-plugin.git
cd bitable-plugin
```

#### 5. 安装依赖

```bash
pnpm install
```

#### 6. 构建项目

```bash
pnpm build
```

#### 7. 安装 PM2

```bash
pnpm add -g pm2
```

#### 8. 启动应用

```bash
pm2 start npm --name "bitable-plugin" -- start
pm2 save
pm2 startup
```

#### 9. 配置 Nginx 反向代理

```bash
# 安装 Nginx
sudo apt-get install nginx

# 编辑配置文件
sudo nano /etc/nginx/sites-available/bitable-plugin
```

添加配置：

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

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/bitable-plugin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 10. 配置 SSL（可选）

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔧 环境变量配置

如果项目需要配置环境变量，创建 `.env.production`：

```env
# 应用配置
NODE_ENV=production
PORT=5000

# 如果需要集成飞书 API（可选）
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret

# 其他配置
NEXT_PUBLIC_APP_NAME=飞书多维表格自定义排版插件
NEXT_PUBLIC_APP_VERSION=1.0.0
```

---

## 📊 监控和日志

### PM2 监控

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs bitable-plugin

# 重启应用
pm2 restart bitable-plugin

# 停止应用
pm2 stop bitable-plugin
```

### Docker 监控

```bash
# 查看容器日志
docker logs bitable-plugin -f

# 查看容器状态
docker ps

# 进入容器
docker exec -it bitable-plugin sh
```

---

## 🔄 更新部署

### Vercel 自动更新

每次推送到主分支，Vercel 会自动构建部署。

### Docker 更新

```bash
# 拉取最新代码
git pull

# 重新构建
docker build -t bitable-plugin .

# 停止旧容器
docker stop bitable-plugin
docker rm bitable-plugin

# 启动新容器
docker run -d -p 5000:5000 --name bitable-plugin bitable-plugin
```

### 传统服务器更新

```bash
# 拉取最新代码
git pull

# 重新构建
pnpm build

# 重启应用
pm2 restart bitable-plugin
```

---

## 🎯 性能优化建议

### 1. 启用 gzip 压缩

在 `next.config.mjs` 中添加：

```javascript
compress: true,
```

### 2. 使用 CDN

部署后配置 CDN 加速静态资源。

### 3. 启用缓存

配置浏览器缓存和 CDN 缓存策略。

### 4. 数据库优化

如果后续添加数据库，使用连接池和索引优化。

---

## 🔒 安全建议

1. **启用 HTTPS**：使用 Let's Encrypt 免费证书
2. **设置防火墙**：只开放必要端口（80、443、22）
3. **定期更新**：及时更新系统和依赖
4. **备份策略**：定期备份数据和配置
5. **访问控制**：限制管理后台访问 IP

---

## 📞 常见问题

### Q1: 部署后页面空白
- 检查构建日志，确认构建成功
- 检查浏览器控制台错误信息
- 确认服务器端口正常监听

### Q2: 访问速度慢
- 启用 CDN
- 优化图片和静态资源
- 使用 HTTP/2

### Q3: 内存占用高
- 检查是否有内存泄漏
- 限制 Node.js 内存使用
- 优化数据库查询

### Q4: 无法连接服务器
- 检查防火墙设置
- 确认服务正常运行
- 检查端口是否正确

---

## 📚 相关文档

- [Vercel 部署指南](./DEPLOY_VERCEL.md)
- [Docker 部署指南](./DEPLOY_DOCKER.md)
- [Next.js 官方文档](https://nextjs.org/docs)
- [shadcn/ui 组件库](https://ui.shadcn.com/)

---

## 🤝 获取帮助

如遇问题，请：
1. 查看相关部署文档
2. 检查日志文件
3. 提交 Issue 到项目仓库
4. 联系技术支持

---

**最后更新**：2025-01-12
**版本**：v1.0.0
