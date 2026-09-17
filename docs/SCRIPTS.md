# 项目脚本说明

本文档说明 `package.json` 中所有可用的脚本命令。

## 开发命令

### `pnpm dev`
启动开发服务器，支持热更新。

```bash
pnpm dev
```

- 端口：5000
- 支持热模块替换（HMR）
- 显示详细错误信息

### `pnpm build`
构建生产版本。

```bash
pnpm build
```

- 输出目录：`.next`
- 优化代码压缩
- 生成静态资源

### `pnpm start`
启动生产服务器。

```bash
pnpm build
pnpm start
```

- 端口：5000
- 使用构建后的静态文件
- 生产环境性能优化

### `pnpm lint`
运行 ESLint 检查代码质量。

```bash
pnpm lint
```

### `pnpm lint:fix`
自动修复 ESLint 发现的问题。

```bash
pnpm lint:fix
```

## 测试命令

### `pnpm test`
运行测试套件（如果配置了测试）。

```bash
pnpm test
```

### `pnpm test:watch`
监听模式运行测试。

```bash
pnpm test:watch
```

### `pnpm test:coverage`
生成测试覆盖率报告。

```bash
pnpm test:coverage
```

## 代码质量

### `pnpm type-check`
运行 TypeScript 类型检查。

```bash
pnpm type-check
```

### `pnpm format`
使用 Prettier 格式化代码。

```bash
pnpm format
```

### `pnpm format:check`
检查代码格式是否符合规范。

```bash
pnpm format:check
```

## Docker 相关

### `pnpm docker:build`
构建 Docker 镜像。

```bash
pnpm docker:build
```

等同于：
```bash
docker build -t bitable-plugin .
```

### `pnpm docker:run`
运行 Docker 容器。

```bash
pnpm docker:run
```

等同于：
```bash
docker run -d -p 5000:5000 --name bitable-plugin bitable-plugin
```

### `pnpm docker:dev`
使用 Docker 运行开发环境。

```bash
pnpm docker:dev
```

## 依赖管理

### `pnpm install`
安装所有依赖。

```bash
pnpm install
```

### `pnpm add <package>`
安装生产依赖。

```bash
pnpm add lodash
```

### `pnpm add -D <package>`
安装开发依赖。

```bash
pnpm add -D @types/lodash
```

### `pnpm remove <package>`
移除依赖。

```bash
pnpm remove lodash
```

### `pnpm update`
更新依赖。

```bash
pnpm update
```

### `pnpm outdated`
检查过期的依赖。

```bash
pnpm outdated
```

## 清理命令

### `pnpm clean`
清理构建文件和缓存。

```bash
pnpm clean
```

删除：
- `.next` 目录
- `node_modules/.cache`
- `dist` 目录

### `pnpm clean:all`
深度清理，包括 node_modules。

```bash
pnpm clean:all
```

删除：
- `node_modules` 目录
- 所有构建文件
- 所有缓存

## Git 相关

### `pnpm pre-commit`
Git pre-commit 钩子，自动检查代码。

```bash
pnpm pre-commit
```

运行：
- ESLint 检查
- TypeScript 类型检查
- Prettier 格式检查

### `pnpm prepare`
自动安装 Git hooks。

```bash
pnpm prepare
```

## 性能分析

### `pnpm analyze`
分析生产包大小。

```bash
pnpm analyze
```

生成可视化报告，帮助优化打包体积。

### `pnpm bundle-report`
生成打包报告。

```bash
pnpm bundle-report
```

## 自定义脚本示例

### 添加新的脚本

在 `package.json` 的 `scripts` 部分添加：

```json
{
  "scripts": {
    "my-script": "node scripts/my-script.js"
  }
}
```

运行：
```bash
pnpm my-script
```

### 复杂脚本示例

```json
{
  "scripts": {
    "deploy:vercel": "vercel --prod",
    "deploy:docker": "docker build -t bitable-plugin && docker push bitable-plugin",
    "deploy:all": "pnpm deploy:vercel && pnpm deploy:docker"
  }
}
```

## 环境变量

### 开发环境
```bash
NODE_ENV=development
```

### 生产环境
```bash
NODE_ENV=production
```

### Docker 环境
```bash
DOCKER=true
```

## 常见问题

### Q1: 脚本运行失败
- 确保已安装 pnpm
- 检查 Node.js 版本（需要 24+）
- 查看错误日志

### Q2: 端口被占用
修改 `.coze` 文件中的端口配置

### Q3: 依赖安装慢
- 使用国内镜像
- 检查网络连接
- 清理缓存重试

## 更多信息

- [pnpm 官方文档](https://pnpm.io/)
- [Next.js CLI 文档](https://nextjs.org/docs/app/api-reference/next-cli)

---

**最后更新**：2025-01-12
