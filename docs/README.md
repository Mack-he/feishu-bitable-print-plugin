# 文档中心

欢迎使用飞书多维表格插件文档中心！

## 📚 文档导航

### 快速开始
- [部署指南](./DEPLOYMENT.md) - 完整的部署方案对比和选择
- [Vercel 部署](./DEPLOY_VERCEL.md) - 最简单的部署方式（推荐新手）
- [Docker 部署](./DEPLOY_DOCKER.md) - 容器化部署方案
- [脚本说明](./SCRIPTS.md) - 所有可用命令和脚本

### 开发指南
- [项目结构](../README.md#项目结构) - 了解项目组织方式
- [数据模型](../README.md#数据模型) - 字段类型和配置说明
- [自定义视图](../README.md#自定义样式) - 自定义视图和样式

## 🚀 快速部署推荐

### 场景一：个人项目 / 快速上线
**推荐：Vercel 部署**
- 零配置，自动部署
- 免费 SSL 和 CDN
- 自动 CI/CD
- [查看教程](./DEPLOY_VERCEL.md)

### 场景二：企业项目 / 自建服务器
**推荐：Docker 部署**
- 环境隔离，易于维护
- 支持水平扩展
- 适合生产环境
- [查看教程](./DEPLOY_DOCKER.md)

### 场景三：传统运维 / 需要完全控制
**推荐：传统服务器部署**
- 完全控制部署环境
- 适合有运维团队的企业
- 支持自定义配置
- [查看教程](./DEPLOYMENT.md#方式三传统服务器部署)

## 🛠️ 部署工具

### Linux / macOS
```bash
# 给脚本添加执行权限
chmod +x scripts/deploy.sh

# 运行部署脚本
./scripts/deploy.sh vercel  # Vercel 部署
./scripts/deploy.sh docker  # Docker 部署
./scripts/deploy.sh local   # 本地部署
```

### Windows (PowerShell)
```powershell
# 运行部署脚本
.\scripts\deploy.ps1 vercel  # Vercel 部署
.\scripts\deploy.ps1 docker  # Docker 部署
.\scripts\deploy.ps1 local   # 本地部署
```

## 📖 常见问题

### 部署相关
- [如何选择部署方式？](./DEPLOYMENT.md#部署方式对比)
- [Vercel 部署失败怎么办？](./DEPLOY_VERCEL.md#常见问题)
- [Docker 容器无法启动？](./DEPLOY_DOCKER.md#故障排查)

### 开发相关
- [如何运行本地开发环境？](../README.md#启动项目)
- [如何修改视图配置？](../README.md#视图配置)
- [如何自定义样式？](../README.md#自定义样式)

## 🔗 相关资源

### 官方文档
- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

### 组件库
- [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)

### 工具
- [Vercel](https://vercel.com/)
- [Docker](https://www.docker.com/)
- [pnpm](https://pnpm.io/)

## 💡 获取帮助

如果遇到问题：

1. **查看文档**：先检查本文档中心的相关章节
2. **搜索日志**：查看错误日志和构建日志
3. **提交 Issue**：在 GitHub 上提交 Issue
4. **联系支持**：通过项目主页联系技术支持

## 📝 文档贡献

欢迎帮助改进文档：
- 发现错别字或错误
- 有更好的示例和说明
- 想要补充新的使用场景

请通过 Pull Request 贡献！

---

**最后更新**：2025-01-12
**文档版本**：v1.0.0
