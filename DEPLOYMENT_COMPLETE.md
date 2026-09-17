# 🎉 Vercel 部署配置完成！

## ✅ 已生成的文件

### 1. `vercel.json`
Vercel 部署配置文件，包含：
- ✅ 构建命令配置
- ✅ 输出目录设置
- ✅ 安全头部配置
- ✅ 香港 region（更快访问）

### 2. `scripts/deploy-vercel.sh`
自动化部署脚本，功能：
- ✅ 自动检查并安装 Vercel CLI
- ✅ 自动登录引导
- ✅ 自动构建项目
- ✅ 自动部署到生产环境
- ✅ 显示部署地址

### 3. `DEPLOY_VERCEL_QUICK.md`
详细部署指南，包含：
- ✅ 两种部署方式（脚本/手动）
- ✅ 自定义域名配置
- ✅ 高级配置说明
- ✅ 常见问题解答

### 4. `DEPLOY_QUICK.md`
快速开始指南，3 步完成部署。

### 5. `package.json`
新增脚本：
```json
"deploy:vercel": "bash ./scripts/deploy-vercel.sh"
```

---

## 🚀 立即部署

### 方式 A：使用部署脚本（推荐）

```bash
pnpm deploy:vercel
```

### 方式 B：手动部署

```bash
# 1. 安装 Vercel CLI
pnpm add -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel --prod
```

---

## 📋 部署流程

```
┌─────────────────┐
│  1. 执行部署命令  │
│  pnpm deploy:vercel │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. 登录 Vercel   │
│  （首次需要）     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. 自动构建项目  │
│  pnpm build      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. 部署到生产环境│
│  上传静态文件     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. 获得 HTTPS 地址│
│  your-plugin.vercel.app │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  6. 在飞书中配置  │
│  添加插件地址     │
└─────────────────┘
```

---

## 📊 部署时间估算

| 步骤 | 时间 |
|------|------|
| 安装 Vercel CLI | ~30 秒 |
| 登录 Vercel | ~1 分钟 |
| 构建项目 | ~8 秒 |
| 部署上传 | ~1 分钟 |
| **总计** | **~3 分钟** |

---

## 🎯 部署后

### 你会得到：

1. **生产地址**（固定不变）
   ```
   https://your-plugin-name.vercel.app
   ```

2. **预览地址**（每次部署生成）
   ```
   https://your-plugin-name-xyz.vercel.app
   ```

**推荐使用生产地址！**

---

## 📱 在飞书中使用

### 步骤：

1. 打开飞书多维表格
2. 点击右上角「插件」图标
3. 选择「自定义插件」
4. 点击「+新增插件」
5. 输入生产地址
6. 点击「确定」

**完成！插件立即在侧边栏加载。**

---

## 🔍 查看部署状态

### 命令行：

```bash
# 查看所有部署
vercel list

# 查看最新部署详情
vercel inspect [deployment-url]

# 查看实时日志
vercel logs [deployment-url] --follow
```

### Web 控制台：

访问：https://vercel.com/dashboard

可以看到：
- 📊 部署历史
- 🔍 构建日志
- 📈 访问统计
- ⚙️ 项目设置

---

## 🔄 更新部署

### 自动部署（推荐）

将代码推送到 GitHub：
- 推送到 `main` 分支 → 自动部署到生产环境
- 推送到其他分支 → 自动创建预览环境

### 手动更新

```bash
# 修改代码后
vercel --prod
```

---

## 🎨 自定义域名（可选）

### 使用 Vercel 子域名

1. 访问：https://vercel.com/your-project/settings/domains
2. 添加域名：`my-print-plugin.vercel.app`

### 绑定自己的域名

1. 访问：https://vercel.com/your-project/settings/domains
2. 添加域名：`plugin.yourcompany.com`
3. 配置 DNS 记录
4. 等待 SSL 证书自动配置

---

## ❓ 常见问题

### Q1: 部署失败怎么办？

**A**: 查看构建日志：
```bash
vercel logs [deployment-url]
```

### Q2: 如何查看部署地址？

**A**: 
- 命令行：`vercel list`
- Web：https://vercel.com/dashboard

### Q3: 如何回滚版本？

**A**:
1. 访问 Vercel 控制台
2. 进入项目 → Deployments
3. 找到上一个版本
4. 点击「...」→「Promote to Production」

---

## 📚 相关文档

- [快速部署指南](DEPLOY_QUICK.md) - 3 步完成部署
- [详细部署指南](DEPLOY_VERCEL_QUICK.md) - 完整配置说明
- [插件使用指南](PLUGIN_USER_GUIDE.md) - 功能使用说明
- [开发文档](FEISHU_CUSTOM_PLUGIN_GUIDE.md) - 开发者参考

---

## 🎯 现在就开始！

### 一键部署命令

```bash
pnpm deploy:vercel
```

### 然后在飞书中添加

```
https://your-plugin.vercel.app
```

就这么简单！🎉

---

**配置完成时间**: 2025-01-12
**版本**: v2.0.0
**状态**: ✅ 准备部署
