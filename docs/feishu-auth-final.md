# 飞书插件鉴权最终方案

## 🎯 核心需求确认

### 插件类型
**多维表格自定义侧边栏插件**
- 本质：嵌入到多维表格边栏的 iframe
- 运行环境：用户浏览器中
- 数据访问：通过 js-sdk 操作多维表格数据

### 关键特性
1. **授权码特定性**：每个多维表格有独立的授权码
2. **手动获取**：用户需主动获取并配置授权码
3. **飞书登录限制**：飞书登录无法直接获取用户授权码

---

## 🔐 最终鉴权方案

### 完整流程

```
┌─────────────────────────────────────────────────────────┐
│  阶段 1: 首次使用（新用户）                          │
└─────────────────────────────────────────────────────────┘

1. 用户打开插件
   ↓
2. 检测未登录 → 显示登录页面
   ↓
3. 用户点击"飞书登录"
   ↓
4. OAuth 2.0 流程（获取用户身份）
   ↓
5. 登录成功 → 显示"配置授权码"页面
   ↓
6. 用户手动从多维表格获取授权码
   ↓
7. 用户填入授权码 → 点击保存
   ↓
8. 后端保存：用户ID ↔ 授权码 ↔ 表格ID 的关联关系
   ↓
9. 开始使用插件 ✅

┌─────────────────────────────────────────────────────────┐
│  阶段 2: 后续使用（老用户）                          │
└─────────────────────────────────────────────────────────┘

1. 用户打开插件
   ↓
2. 检测未登录 → 飞书登录
   ↓
3. 登录成功 → 后端自动查询该用户已保存的授权码
   ↓
4. 自动使用授权码 → 无需再次输入
   ↓
5. 直接开始使用插件 ✅
```

---

## 🗄️ 数据库设计

### Schema 更新

```typescript
// 用户表（已存在）
users {
  id: serial (主键)
  feishuUserId: text (唯一，飞书用户ID)
  feishuUnionId: text (飞书UnionID)
  name: text (用户姓名)
  avatar: text (头像)
  email: text (邮箱)
  createdAt: timestamp
  updatedAt: timestamp
}

// 新增：用户表格授权表
user_table_authorizations {
  id: serial (主键)
  userId: integer (外键 → users.id)
  tableId: text (多维表格ID)
  tableName: text (表格名称，可选)
  appToken: text (授权码，加密存储)
  isActive: boolean (是否激活)
  lastUsedAt: timestamp (最后使用时间)
  createdAt: timestamp
  updatedAt: timestamp
  
  // 唯一约束：一个用户对一个表格只有一个授权码
  unique(userId, tableId)
}

// 模板表（已存在）
templates {
  id: serial
  userId: integer (外键 → users.id)
  name: text
  description: text
  thumbnail: text
  data: jsonb (模板数据)
  isPublic: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

## 🔌 API 接口设计

### 1. 飞书登录相关

```typescript
// 获取飞书登录链接
GET /api/auth/feishu/login
Response: {
  success: true,
  loginUrl: string
}

// 飞书登录回调
GET /api/auth/feishu/callback?code=xxx&state=xxx
Response: {
  success: true,
  token: string,  // JWT token
  user: {
    id: number,
    name: string,
    avatar: string
  },
  hasAuthorizations: boolean  // 是否已有保存的授权码
}

// 获取当前用户信息
GET /api/auth/me
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  user: User,
  authorizations: UserTableAuthorization[]  // 用户的所有授权码
}

// 登出
POST /api/auth/logout
Headers: Authorization: Bearer <token>
Response: { success: true }
```

### 2. 授权码管理相关

```typescript
// 保存授权码
POST /api/authorizations
Headers: Authorization: Bearer <token>
Body: {
  tableId: string,
  tableName?: string,
  appToken: string
}
Response: {
  success: true,
  authorization: UserTableAuthorization
}

// 获取用户的所有授权码
GET /api/authorizations
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  authorizations: UserTableAuthorization[]
}

// 获取单个授权码
GET /api/authorizations/:tableId
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  authorization: UserTableAuthorization | null
}

// 更新授权码
PUT /api/authorizations/:tableId
Headers: Authorization: Bearer <token>
Body: {
  appToken: string,
  tableName?: string
}
Response: {
  success: true,
  authorization: UserTableAuthorization
}

// 删除授权码
DELETE /api/authorizations/:tableId
Headers: Authorization: Bearer <token>
Response: {
  success: true
}

// 设置当前使用的授权码
POST /api/authorizations/:tableId/activate
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  authorization: UserTableAuthorization
}
```

### 3. 模板管理（已存在）

```typescript
// 获取模板列表
GET /api/templates
Headers: Authorization: Bearer <token>

// 创建模板
POST /api/templates
Headers: Authorization: Bearer <token>

// 获取、更新、删除模板...
```

---

## 🎨 前端页面流程

### 页面 1：登录页

```
┌─────────────────────────────┐
│   飞书打印插件            │
├─────────────────────────────┤
│                             │
│   [ 飞书登录 ]              │
│                             │
│   使用飞书账号登录          │
│   以保存您的授权码和模板    │
│                             │
└─────────────────────────────┘
```

### 页面 2：授权码配置页（首次登录后）

```
┌─────────────────────────────┐
│   欢迎使用！                │
├─────────────────────────────┤
│                             │
│   请配置您的多维表格授权码  │
│                             │
│   表格名称: [输入框]        │
│                             │
│   授权码:   [输入框]        │
│                             │
│   [ 如何获取授权码？]       │
│                             │
│   [ 保存并继续 ]            │
│                             │
└─────────────────────────────┘
```

### 页面 3：授权码管理页（老用户）

```
┌─────────────────────────────┐
│   我的表格授权              │
├─────────────────────────────┤
│                             │
│   📊 销售数据表            │
│   ✅ 已授权，最后使用: 今天 │
│   [ 使用 ] [ 更新 ] [ 删除 ]│
│                             │
│   📊 客户信息表            │
│   ✅ 已授权，最后使用: 昨天 │
│   [ 使用 ] [ 更新 ] [ 删除 ]│
│                             │
│   [ + 添加新授权 ]          │
│                             │
└─────────────────────────────┘
```

### 页面 4：主编辑器（授权后）

```
┌─────────────────────────────────┐
│  字段面板  │   画布   │  设置   │
├─────────────────────────────────┤
│  字段1      │          │         │
│  字段2      │  编辑器  │  设置   │
│  ...        │          │         │
└─────────────────────────────────┘
```

---

## 💾 数据存储策略

### 授权码加密存储

**安全要求：**
- 授权码需要加密存储在数据库
- 使用环境变量中的密钥进行加密
- 不在前端明文保存

**加密方案：**
```typescript
// 使用 AES-256-GCM 加密
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32字节密钥

function encryptAppToken(appToken: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(appToken, 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString('hex'),
    encrypted: encrypted.toString('hex'),
    tag: tag.toString('hex')
  });
}

function decryptAppToken(encryptedData: string): string {
  const { iv, encrypted, tag } = JSON.parse(encryptedData);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'hex')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}
```

---

## 🔄 完整状态流转

```
用户打开插件
    ↓
检查本地是否有 token
    ├─ 有 → 验证 token 有效性
    │       ├─ 有效 → 获取用户信息和授权码 → 使用
    │       └─ 无效 → 清除 token → 登录
    │
    └─ 无 → 显示登录页
           ↓
        飞书登录
           ↓
        获取用户信息
           ↓
        检查是否有保存的授权码
           ├─ 有 → 自动使用 → 进入编辑器
           │
           └─ 无 → 显示授权码配置页
                  ↓
              用户输入授权码
                  ↓
              保存到数据库
                  ↓
              进入编辑器
```

---

## ✅ 优势总结

1. **用户体验好**
   - 首次配置后，后续无需重复输入授权码
   - 可以管理多个表格的授权码

2. **安全性高**
   - 授权码加密存储
   - 用户身份通过飞书 OAuth 验证

3. **灵活性强**
   - 支持一个用户使用多个表格
   - 可以随时更新、删除授权码

4. **数据持久化**
   - 模板存储在云端
   - 换设备也能使用
