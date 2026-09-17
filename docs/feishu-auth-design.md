# 飞书登录与鉴权完整设计方案

## 🎯 核心问题

**当前状态：** 使用多维表格授权码（appToken），单用户鉴权
**目标：** 支持任意飞书用户登录并使用插件

---

## 🏗️ 整体架构设计

### 方案一：飞书应用 OAuth 2.0 登录（推荐）

#### 1. 应用类型选择
- **网页应用** - 适用于独立部署的 Web 应用
- **小程序应用** - 适用于飞书小程序
- **H5 应用** - 适用于移动端 H5 页面

**推荐：网页应用**

---

## 📋 完整登录流程

### 阶段一：用户登录（OAuth 2.0）

```
1. 用户点击"飞书登录"按钮
   ↓
2. 前端跳转到飞书授权页面
   URL: https://open.feishu.cn/open-apis/authen/v1/index
   参数: app_id, redirect_uri, state
   ↓
3. 用户在飞书页面确认授权
   ↓
4. 飞书重定向回我们的回调地址
   带回: code, state
   ↓
5. 后端使用 code 换取 access_token
   POST: https://open.feishu.cn/open-apis/authen/v1/access_token
   ↓
6. 使用 access_token 获取用户信息
   GET: https://open.feishu.cn/open-apis/authen/v1/user_info
   ↓
7. 创建或更新用户记录到数据库
   ↓
8. 生成 JWT 或 Session
   ↓
9. 返回登录成功，跳转到主页
```

---

### 阶段二：多维表格数据访问

#### 方案 A：用户授权访问特定表格（推荐）

```
用户登录后
   ↓
显示"选择多维表格"界面
   ↓
用户从自己的多维表格中选择一个
   ↓
获取表格的 appToken（需要用户授权）
   ↓
保存该表格的访问凭证到用户账户
   ↓
后续使用该表格数据时，使用用户的访问凭证
```

#### 方案 B：使用飞书应用凭证（简单但权限受限）

```
用户登录后
   ↓
应用使用自己的 tenant_access_token
   ↓
只能访问应用有权限的表格
   ↓
用户需要先将表格共享给应用
```

**推荐：方案 A**

---

## 🔐 两种鉴权模式对比

### 模式 1：独立部署模式（当前架构演进）

```
┌─────────────────────────────────────────────────┐
│           用户的浏览器 / 飞书客户端               │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│         Next.js 前端 + API Routes               │
│  ┌───────────────────────────────────────────┐  │
│  │  1. 飞书 OAuth 登录                       │  │
│  │  2. 用户管理                              │  │
│  │  3. 模板存储                              │  │
│  │  4. 表格数据代理                          │  │
│  └───────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│   PostgreSQL     │    │  飞书开放平台     │
│   (用户/模板)    │    │  (表格数据)      │
└──────────────────┘    └──────────────────┘
```

**优点：**
- 完全控制用户数据
- 可以实现更多自定义功能
- 数据持久化

**缺点：**
- 需要部署服务器
- 需要维护数据库
- 需要飞书应用审核

---

### 模式 2：飞书多维表格插件模式（深度集成）

```
┌─────────────────────────────────────────────────┐
│              飞书多维表格                        │
│  ┌───────────────────────────────────────────┐  │
│  │  插件前端（iframe 嵌入）                  │  │
│  │  - 使用 @lark-base-open/js-sdk            │  │
│  │  - 直接调用表格 API                       │  │
│  │  - 使用用户当前身份鉴权                   │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**优点：**
- 无需用户登录
- 直接使用当前用户身份
- 无需后端服务器
- 体验更流畅

**缺点：**
- 只能在飞书多维表格中使用
- 数据存储受限

---

## 🚀 推荐实施方案

### 阶段 1：快速验证 - 增强插件模式

1. **保持当前架构**，但增强飞书 SDK 使用
2. **无需后端登录**，直接使用用户身份
3. **模板存储**：
   - 方案 A：存储到用户的多维表格中
   - 方案 B：使用浏览器本地存储（当前方案）
   - 方案 C：使用飞书云文档

### 阶段 2：完整功能 - 独立部署模式

1. **实现飞书 OAuth 登录**
2. **搭建后端服务**（已创建基础架构）
3. **数据库存储**用户和模板
4. **用户授权访问**自己的多维表格

---

## 📝 API 接口设计（完整版本）

### 1. 飞书登录相关

```typescript
// 获取飞书登录 URL
GET /api/auth/feishu/login
Response: { loginUrl: string }

// 飞书登录回调
GET /api/auth/feishu/callback?code=xxx&state=xxx
Response: { token: string, user: User }

// 获取当前用户信息
GET /api/auth/me
Headers: Authorization: Bearer <token>
Response: { user: User }

// 登出
POST /api/auth/logout
Response: { success: true }
```

### 2. 多维表格授权相关

```typescript
// 获取用户的多维表格列表
GET /api/feishu/tables
Headers: Authorization: Bearer <token>
Response: { tables: Table[] }

// 授权访问特定表格
POST /api/feishu/tables/:tableId/authorize
Headers: Authorization: Bearer <token>
Response: { success: true, appToken: string }

// 获取表格字段
GET /api/feishu/tables/:tableId/fields
Headers: Authorization: Bearer <token>
Response: { fields: Field[] }

// 获取表格记录
GET /api/feishu/tables/:tableId/records
Headers: Authorization: Bearer <token>
Response: { records: Record[] }
```

### 3. 模板管理（已创建）

```typescript
// 获取模板列表
GET /api/templates?userId=xxx
Response: { templates: Template[] }

// 创建模板
POST /api/templates
Body: { name, description, data }
Response: { template: Template }

// 获取模板详情
GET /api/templates/:id
Response: { template: Template }

// 更新模板
PUT /api/templates/:id
Body: { name, description, data }
Response: { template: Template }

// 删除模板
DELETE /api/templates/:id
Response: { success: true }
```

---

## 🔑 数据库 Schema（已创建）

```typescript
// 用户表 - 存储飞书用户信息
users {
  id, feishuUserId, feishuUnionId,
  name, avatar, email,
  createdAt, updatedAt
}

// 模板表 - 存储用户模板
templates {
  id, userId, name, description,
  thumbnail, data (JSON), isPublic,
  createdAt, updatedAt
}

// 新增：用户表格授权表
user_table_authorizations {
  id, userId, tableId, tableName,
  appToken, permissions,
  createdAt, updatedAt
}
```

---

## 🎨 前端流程设计

### 页面 1：登录页

```
[飞书登录按钮]
   ↓
跳转飞书授权
   ↓
回调处理
   ↓
存储 token
   ↓
跳转到主页
```

### 页面 2：主页 - 选择表格

```
欢迎回来，[用户名]
   ↓
[选择我的多维表格]
   ↓
显示用户的表格列表
   ↓
用户选择一个表格
   ↓
进入编辑器
```

### 页面 3：编辑器

```
左侧：字段面板（从选中的表格加载）
中间：画布编辑
右侧：设置面板
顶部：模板保存/加载
```

---

## 📦 实现步骤建议

### 第一步：选择模式（关键决策）

**选项 A：先做插件模式增强**
- 无需后端登录
- 快速验证产品
- 使用飞书 SDK 直接访问

**选项 B：直接做完整独立部署**
- 功能更强大
- 用户体验更好
- 但开发周期更长

### 第二步：MVP 实现

无论选择哪个模式，都需要：
1. ✅ 表格多选功能（已完成）
2. 模板保存/加载
3. 批量打印

### 第三步：完善功能

- 飞书登录（如需要）
- 云端模板存储
- 模板分享
- 团队协作

---

## ❓ 需要您确认的问题

1. **部署模式选择**：
   - A. 纯飞书插件模式（无需登录，直接用）
   - B. 独立部署模式（飞书登录 + 后端）

2. **模板存储方式**：
   - A. 浏览器本地存储（当前）
   - B. 存储到用户的多维表格
   - C. 云端数据库（需要后端）

3. **用户范围**：
   - A. 仅您自己使用
   - B. 您的团队使用
   - C. 任意飞书用户使用

请告诉我您的选择，我来为您实现相应的方案！
