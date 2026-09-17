# 管理员 API 文档

## 🔐 登录入口

**后端管理员登录入口：** `POST /api/admin/login`

---

## 👤 初始管理员账号
//lock

| 项目 | 值 |
|------|-----|
| 用户名 | `fsadmins` |
| 密码 | `Xxy94128866` |

//lock

## 📡 API 接口列表

### 1. 管理员登录

**接口：** `POST /api/admin/login`

**请求体：**
```json
{
  "username": "fsadmins",
  "password": "Xxy94128866"
}
```

**响应：**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": 1,
    "username": "fsadmins",
    "name": "管理员",
    "email": "admin@example.com",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2. 获取当前管理员信息

**接口：** `GET /api/admin/me`

**请求头：**
```
Authorization: Bearer <token>
```

**响应：**
```json
{
  "success": true,
  "admin": {
    "id": 1,
    "username": "fsadmins",
    "name": "管理员",
    "email": "admin@example.com",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 3. 获取管理员列表

**接口：** `GET /api/admin/admins`

**请求头：**
```
Authorization: Bearer <token>
```

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "fsadmins",
      "name": "管理员",
      "email": "admin@example.com",
      "isActive": true,
      "lastLoginAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 4. 创建新管理员

**接口：** `POST /api/admin/admins`

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "username": "newadmin",
  "password": "password123",
  "name": "新管理员",
  "email": "newadmin@example.com"
}
```

**响应：**
```json
{
  "success": true,
  "message": "Admin created successfully",
  "data": {
    "id": 2,
    "username": "newadmin",
    "name": "新管理员",
    "email": "newadmin@example.com"
  }
}
```

---

## 🔒 认证方式

### Bearer Token

所有需要认证的接口都需要在请求头中携带 JWT Token：

```
Authorization: Bearer <your-token-here>
```

### Token 有效期

- **管理员 Token**：24 小时
- **用户 Token**：7 天

---

## 🚀 快速开始

### 1. 初始化管理员账号

运行初始化脚本生成 SQL 语句：

```bash
# 生成密码哈希和 SQL
npx tsx scripts/init-admin.ts
```

### 2. 登录获取 Token

```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "fsadmins",
    "password": "Xxy94128866"
  }'
```

### 3. 使用 Token 访问受保护接口

```bash
curl http://localhost:5000/api/admin/me \
  -H "Authorization: Bearer <your-token-here>"
```

---

## 📂 文件结构

```
src/
├── app/api/admin/
│   ├── login/route.ts       # 管理员登录
│   ├── me/route.ts          # 获取当前管理员
│   └── admins/route.ts      # 管理员列表/创建
├── lib/auth/
│   ├── jwt.ts               # JWT 工具
│   └── password.ts          # 密码工具
├── lib/db/
│   └── schema.ts            # 数据库 Schema（含 admins 表）
└── lib/types/
    └── api.ts               # API 类型定义
scripts/
└── init-admin.ts            # 初始化脚本
docs/
└── admin-api.md             # 本文档
```

---

## ⚠️ 安全注意事项

1. **修改初始密码**：首次登录后请立即修改默认密码
2. **保护 Token**：不要在客户端暴露管理员 Token
3. **HTTPS**：生产环境请使用 HTTPS
4. **密钥安全**：妥善保管 `JWT_SECRET` 和 `ENCRYPTION_KEY`
5. **定期轮换**：定期更换管理员密码和密钥

---

## 🔗 前后端分离说明

### 前端调用示例（React）

```typescript
// 登录
async function adminLogin(username: string, password: string) {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('adminToken', data.token);
    return data.admin;
  }
  throw new Error(data.error);
}

// 获取管理员信息
async function getAdminInfo() {
  const token = localStorage.getItem('adminToken');
  const response = await fetch('/api/admin/me', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.json();
}
```
