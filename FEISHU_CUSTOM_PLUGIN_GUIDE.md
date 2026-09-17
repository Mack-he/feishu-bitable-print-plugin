# 飞书多维表格自定义插件部署指南

## 📖 什么是自定义插件？

**自定义插件**是飞书多维表格提供的一种灵活的插件类型，开发者可以将自己的 Web 应用作为插件在飞书中使用。

### ✨ 特点
- ✅ **无需审核**：不需要通过飞书开放平台审核
- ✅ **快速开发**：使用任何技术栈都可以开发
- ✅ **灵活部署**：可以部署到任何 HTTPS 服务器
- ✅ **即时使用**：添加运行地址后立即可以使用

### ❌ 与传统插件的区别

| 特性 | 自定义插件 | 传统插件（小程序/小组件） |
|------|-----------|---------------------|
| 审核流程 | ❌ 不需要审核 | ✅ 需要审核 |
| 部署方式 | 任何 HTTPS 服务器 | 飞书官方服务器 |
| 创建方式 | 填写运行地址 | 飞书开放平台 |
| 使用门槛 | ⭐ 简单 | ⭐⭐⭐⭐ 复杂 |

---

## 🚀 快速开始

### 方式一：本地开发（推荐）

#### 1. 启动本地开发服务器

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

服务器将在 `http://localhost:5000` 上运行。

#### 2. 在飞书多维表格中添加插件

1. **打开**任意飞书多维表格
2. **点击**右上角的「插件」按钮
3. **选择**「自定义插件」
4. **点击**「+新增插件」
5. **输入**运行地址：`http://localhost:5000`
6. **点击**「确定」

#### 3. 开始使用

插件将立即在侧边栏中显示，你可以开始使用了！

### 方式二：部署到生产环境

#### 选项 A：部署到 Vercel（推荐）

```bash
# 安装 Vercel CLI
pnpm add -g vercel

# 登录
vercel login

# 部署
vercel

# 生产环境部署
vercel --prod
```

部署完成后，复制 Vercel 提供的 URL，然后在飞书中添加。

#### 选项 B：部署到 GitHub Pages

1. **推送代码到 GitHub**
2. **启用 GitHub Pages**
3. **获取 URL**：`https://your-username.github.io/your-repo`
4. **在飞书中添加这个 URL**

#### 选项 C：部署到自己的服务器

```bash
# 构建项目
pnpm build

# 将 out 目录上传到你的服务器
```

确保你的服务器支持 HTTPS，否则无法在飞书中使用。

---

## 🔧 本地开发技巧

### 热更新

项目已配置热更新，修改代码后会自动刷新，无需重启服务器。

### 调试

在飞书插件中使用 `console.log()`，可以在浏览器的开发者工具中查看输出。

### 主题适配

插件会自动适配飞书的浅色和深色主题。

---

## 📦 技术要求

### 必须满足

1. ✅ **HTTPS 协议**：必须是 HTTPS 地址（本地开发除外）
2. ✅ **静态导出**：项目已配置 `output: 'export'`
3. ✅ **Hash 路由**：禁止使用 history 路由
4. ✅ **官方 SDK**：使用 `@lark-base-open/js-sdk`

### 本项目配置

- ✅ 框架：Next.js 16 (App Router)
- ✅ 输出模式：静态导出 (`output: 'export'`)
- ✅ 路由方式：Hash 路由（`window.location.hash`）
- ✅ SDK：`@lark-base-open/js-sdk`
- ✅ 样式：Tailwind CSS 4
- ✅ 组件库：shadcn/ui

---

## 🎯 在飞书中的使用

### 添加插件

1. 打开多维表格
2. 点击「插件」→「自定义插件」
3. 点击「+新增插件」
4. 输入运行地址
5. 点击「确定」

### 分享插件

你可以将插件 URL 分享给其他用户，他们也可以添加使用：

1. 在插件详情中点击「复制链接」
2. 发送给其他用户
3. 他们粘贴地址即可添加

### 删除插件

1. 在插件列表中找到要删除的插件
2. 点击「删除」按钮
3. 确认删除

---

## 🔍 常见问题

### Q1: 本地开发可以使用 http://localhost 吗？

A: **可以！** 本地开发时可以使用 `http://localhost:5000`，不需要 HTTPS。

### Q2: 生产环境必须使用 HTTPS 吗？

A: **是的！** 生产环境必须使用 HTTPS，否则无法在飞书中加载。

### Q3: 如何获取多维表格数据？

A: 使用 `@lark-base-open/js-sdk`：

```typescript
import { bitable } from '@lark-base-open/js-sdk';

// 获取当前表格
const table = await bitable.base.getActiveTable();

// 获取记录
const records = await table.getRecords();
```

### Q4: 插件权限是什么？

A: 插件的权限与当前登录用户的权限一致。如果用户无权查看某条记录，插件中也看不到。

### Q5: 可以使用任何技术栈吗？

A: **可以！** 只要输出的是静态 HTML/CSS/JavaScript，任何技术栈都可以使用。

### Q6: 如何调试插件？

A: 在浏览器中打开插件后，按 F12 打开开发者工具，可以在 Console 中查看日志。

### Q7: 插件可以存储数据吗？

A: 可以，但需要使用外部存储服务（如数据库、对象存储等）。插件本身不提供存储功能。

### Q8: 如何获取当前登录用户信息？

A: 使用飞书 SDK：

```typescript
import { bitable } from '@lark-base-open/js-sdk';

// 获取当前用户
const user = await bitable.bridge.getUser();
```

---

## 📚 相关文档

- [飞书多维表格插件官方文档](https://open.feishu.cn/document/ukTMukTMukTM/uEjNwUjLxYDM14SM2ATN)
- [Base JS SDK 文档](https://github.com/larksuite/oapi-sdk-js)
- [Next.js 静态导出文档](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

---

## 🎉 总结

**自定义插件是最简单、最快速的插件开发方式！**

### 快速流程

1. ✅ 本地开发：`pnpm dev`
2. ✅ 添加到飞书：填写 `http://localhost:5000`
3. ✅ 开始使用

### 生产部署

1. ✅ 构建项目：`pnpm build`
2. ✅ 部署到服务器（Vercel、GitHub Pages 等）
3. ✅ 获取 HTTPS 地址
4. ✅ 在飞书中添加地址

就这么简单！

---

**最后更新**：2025-01-12
**项目版本**：v2.0.0
