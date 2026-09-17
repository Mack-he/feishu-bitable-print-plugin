# Vercel 部署指南

Vercel 是 Next.js 官方推荐的部署平台，支持零配置自动部署。

## 准备工作

1. **创建 Vercel 账号**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub、GitLab 或 Bitbucket 账号登录

2. **准备代码仓库**
   - 将项目推送到 GitHub/GitLab/Bitbucket

## 部署步骤

### 方式一：通过 Vercel 网站部署

1. 登录 Vercel 控制台
2. 点击 "Add New" → "Project"
3. 选择你的代码仓库并导入
4. Vercel 会自动检测到 Next.js 项目
5. 点击 "Deploy" 开始部署

### 方式二：通过 Vercel CLI 部署

```bash
# 1. 安装 Vercel CLI
pnpm add -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署项目
vercel

# 4. 生产环境部署
vercel --prod
```

## 环境变量配置

如果项目需要环境变量（如 API 密钥），在 Vercel 中配置：

1. 进入项目设置 → Environment Variables
2. 添加变量名和值
3. 选择环境（Production、Preview、Development）
4. 保存后重新部署

## 自定义域名

1. 进入项目设置 → Domains
2. 添加你的域名
3. 按照提示配置 DNS 记录

## 常见问题

### 构建失败
- 检查 `package.json` 中的依赖是否完整
- 确认 Node.js 版本兼容（项目使用 Node.js 24）

### 部署超时
- Vercel 免费版构建限制 60 分钟
- 大型项目可能需要优化构建流程

### 更多信息
- [Vercel 官方文档](https://vercel.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
