# 🚀 Vercel 一键部署指南

## 📋 前提条件

- ✅ 代码已开发完成
- ✅ GitHub 账号（用于 Vercel 登录）
- ✅ 5 分钟时间

---

## 🎯 方式一：使用部署脚本（推荐）

### 步骤 1：执行部署脚本

```bash
# 方式 A：直接执行脚本
chmod +x scripts/deploy-vercel.sh
./scripts/deploy-vercel.sh

# 方式 B：使用 pnpm
pnpm deploy:vercel
```

### 步骤 2：按提示操作

脚本会自动引导你完成：
1. ✅ 检查并安装 Vercel CLI
2. ✅ 登录 Vercel（首次需要）
3. ✅ 构建项目
4. ✅ 部署到生产环境
5. ✅ 获取部署地址

### 步骤 3：在飞书中配置

1. 打开飞书多维表格
2. 点击「插件」→「自定义插件」
3. 点击「+新增插件」
4. 输入部署地址
5. 点击「确定」

---

## 🎯 方式二：手动部署

### 步骤 1：安装 Vercel CLI

```bash
# 使用 npm
npm install -g vercel

# 或使用 pnpm
pnpm add -g vercel
```

### 步骤 2：登录 Vercel

```bash
vercel login
```

选择登录方式：
- GitHub（推荐）
- GitLab
- Bitbucket
- Email

### 步骤 3：部署到生产环境

```bash
# 首次部署（会创建新项目）
vercel --prod

# 后续部署（更新现有项目）
vercel --prod
```

### 步骤 4：获取部署地址

部署成功后，你会看到类似输出：

```
✔ Production: https://feishu-bitable-print-plugin-xyz.vercel.app [23s]
```

这个地址就是你的插件运行地址！

---

## 📊 部署地址格式

### 临时预览地址（每次部署生成）
```
https://feishu-bitable-print-plugin-[hash].vercel.app
```

### 生产地址（固定不变）
```
https://feishu-bitable-print-plugin.vercel.app
```

**推荐使用生产地址**，因为它不会变化。

---

## ⚙️ 自定义域名（可选）

### 方式 A：使用 Vercel 子域名

1. 进入项目设置：`vercel.com/your-project/settings`
2. 找到「Domains」
3. 添加自定义域名，如：`my-print-plugin.vercel.app`

### 方式 B：绑定自己的域名

1. 进入项目设置
2. 添加你的域名（如 `plugin.yourcompany.com`）
3. 按提示配置 DNS 记录
4. 等待 SSL 证书自动配置

---

## 🔧 高级配置

### 环境变量

如果需要环境变量：

1. 进入项目设置 → Environment Variables
2. 添加变量：
   ```
   NEXT_PUBLIC_APP_NAME=飞书多维表格排版打印插件
   NEXT_PUBLIC_APP_VERSION=2.0.0
   ```

### 构建配置

`vercel.json` 已配置：
- ✅ 自动构建命令
- ✅ 静态文件输出
- ✅ 安全头部
- ✅ 香港 region（更快访问）

---

## 📱 查看部署状态

### 方式 A：命令行

```bash
# 查看项目列表
vercel list

# 查看部署历史
vercel inspect [deployment-url]
```

### 方式 B：Web 控制台

访问：https://vercel.com/dashboard

可以看到：
- 📊 部署历史
- 🔍 日志输出
- 📈 访问统计
- ⚙️ 项目设置

---

## 🔄 更新部署

### 自动部署（推荐）

连接 GitHub 仓库后：
- 推送到 `main` 分支 → 自动部署到生产环境
- 推送到其他分支 → 自动创建预览环境

### 手动部署

```bash
# 更新代码后，重新部署
vercel --prod
```

---

## ❓ 常见问题

### Q1: 部署失败怎么办？

**A**: 检查构建日志：
```bash
vercel logs [deployment-url]
```

常见原因：
- 依赖安装失败：检查 `package.json`
- 构建命令错误：检查 `package.json` 的 `scripts.build`
- 文件缺失：确保 `out` 目录存在

### Q2: 如何回滚到上一个版本？

**A**: 
1. 访问 Vercel 控制台
2. 进入项目 → Deployments
3. 找到上一个成功部署
4. 点击「...」→「Promote to Production」

### Q3: 部署速度慢怎么办？

**A**: 
- 使用香港 region（已配置）
- 减少依赖数量
- 优化构建配置

### Q4: 如何查看实时日志？

**A**:
```bash
vercel logs [deployment-url] --follow
```

---

## 🎯 部署检查清单

在部署前，确保：

- [ ] 代码已提交到 Git
- [ ] 本地构建成功（`pnpm build`）
- [ ] 本地预览正常（`pnpm dev`）
- [ ] Vercel CLI 已安装
- [ ] 已登录 Vercel

部署后，检查：

- [ ] 部署地址可访问
- [ ] 插件在飞书中正常加载
- [ ] 数据获取正常
- [ ] 打印功能正常

---

## 📚 相关资源

- [Vercel 官方文档](https://vercel.com/docs)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [飞书插件开发文档](https://open.feishu.cn/document/ukTMukTMukTM/uEjNwUjLxYDM14SM2ATN)

---

## 🎉 开始部署

### 快速部署命令

```bash
# 一键部署
./scripts/deploy-vercel.sh

# 或手动部署
vercel --prod
```

部署完成后，在飞书中添加插件地址即可使用！

---

**更新时间**: 2025-01-12
**版本**: v2.0.0
