# 后端服务架构文档

## 📋 概述

本项目使用 **Next.js 16 + API Routes** 构建后端服务，采用前后端分离架构。

## 🛠️ 技术栈

- **框架**: Next.js 16 API Routes
- **ORM**: Drizzle ORM
- **数据库**: PostgreSQL
- **第三方集成**: 飞书开放平台

## 📁 目录结构

```
src/
├── app/
│   └── api/
│       ├── health/route.ts          # 健康检查
│       ├── auth/
│       │   └── feishu/
│       │       └── callback/route.ts # 飞书登录回调
│       └── templates/
│           ├── route.ts              # 模板列表/创建
│           └── [id]/
│               └── route.ts          # 模板详情/更新/删除
├── lib/
│   ├── db/
│   │   ├── index.ts                  # 数据库连接
│   │   └── schema.ts                 # 数据库 Schema
│   └── types/
│       └── api.ts                    # API 类型定义
drizzle.config.ts                      # Drizzle 配置
.env.example                           # 环境变量示例
```

## 🗄️ 数据库设计

### Users 表
- 用户基本信息
- 飞书用户ID关联
- 创建/更新时间

### Templates 表
- 模板名称、描述
- 模板数据（JSON格式）
- 缩略图
- 公开/私有状态
- 用户关联

### TemplateShares 表
- 模板分享令牌
- 过期时间
- 分享记录

## 🔌 API 接口设计

### 健康检查
- `GET /api/health` - 服务健康状态

### 用户认证
- `GET /api/auth/feishu/callback` - 飞书登录回调

### 模板管理
- `GET /api/templates` - 获取模板列表
- `POST /api/templates` - 创建新模板
- `GET /api/templates/:id` - 获取模板详情
- `PUT /api/templates/:id` - 更新模板
- `DELETE /api/templates/:id` - 删除模板

## 🚀 下一步开发计划

1. 完善数据库连接和迁移
2. 实现飞书 OAuth 完整流程
3. 实现模板 CRUD 的完整逻辑
4. 添加用户会话管理
5. 实现权限控制
6. 添加 API 限流和错误处理
