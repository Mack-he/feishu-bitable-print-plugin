import { mysqlTable, int, text, datetime, json, boolean, varchar, uniqueIndex } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

// 用户表
export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  feishuUserId: text('feishu_user_id').unique(),
  feishuUnionId: text('feishu_union_id').unique().notNull(), // 使用 union_id 作为唯一标识
  feishuOpenId: text('feishu_open_id'),
  name: text('name'),
  avatar: text('avatar'),
  email: text('email'),
  tenantKey: text('tenant_key'),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
});

// 用户表格授权表 - 核心：用户与授权码的关联
export const userTableAuthorizations = mysqlTable('user_table_authorizations', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  tableId: text('table_id').notNull(),
  tableName: text('table_name'),
  // 授权码（加密存储）
  appToken: text('app_token').notNull(),
  isActive: boolean('is_active').default(true),
  lastUsedAt: datetime('last_used_at'),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
}, (table) => {
  return {
    // 唯一约束：一个用户对一个表格只有一个授权码
    userTableUnique: uniqueIndex('user_table_unique').on(table.userId, table.tableId),
  };
});

// 模板表
export const templates = mysqlTable('templates', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id'),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  thumbnail: text('thumbnail'),
  // 模板数据（JSON格式存储完整的编辑器状态
  data: json('data').notNull(),
  isPublic: boolean('is_public').default(false),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
});

// 模板分享表
export const templateShares = mysqlTable('template_shares', {
  id: int('id').autoincrement().primaryKey(),
  templateId: int('template_id'),
  shareToken: varchar('share_token', { length: 64 }).unique().notNull(),
  expiresAt: datetime('expires_at'),
  createdAt: datetime('created_at').notNull(),
});

// 管理员表
export const admins = mysqlTable('admins', {
  id: int('id').autoincrement().primaryKey(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  // 密码哈希存储（bcrypt）
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  email: text('email'),
  avatar: text('avatar'),
  isActive: boolean('is_active').default(true),
  lastLoginAt: datetime('last_login_at'),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
});

export const healthCheck = mysqlTable("health_check", {
	id: int('id').autoincrement().primaryKey(),
	updatedAt: datetime("updated_at"),
});
