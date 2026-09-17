// 数据库 Schema 定义
import { mysqlTable, int, text, datetime, json, boolean, varchar, uniqueIndex } from 'drizzle-orm/mysql-core';

// 用户表
export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  feishuUserId: text('feishu_user_id').notNull(),
  feishuUnionId: text('feishu_union_id'),
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
  userId: int('user_id').notNull().references(() => users.id),
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
    userTableUnique: uniqueIndex('user_table_unique').on(table.userId, table.tableId),
  };
});

// 模板表
export const templates = mysqlTable('templates', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  thumbnail: text('thumbnail'),
  data: json('data').notNull(),
  isPublic: boolean('is_public').default(false),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
});

// 模板分享表
export const templateShares = mysqlTable('template_shares', {
  id: int('id').autoincrement().primaryKey(),
  templateId: int('template_id').references(() => templates.id),
  shareToken: varchar('share_token', { length: 64 }).unique().notNull(),
  expiresAt: datetime('expires_at'),
  createdAt: datetime('created_at').notNull(),
});

// 管理员表
export const admins = mysqlTable('admins', {
  id: int('id').autoincrement().primaryKey(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  email: text('email'),
  avatar: text('avatar'),
  isActive: boolean('is_active').default(true),
  lastLoginAt: datetime('last_login_at'),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
});

// 系统配置表
export const systemConfigs = mysqlTable('system_configs', {
  id: int('id').autoincrement().primaryKey(),
  key: varchar('key', { length: 100 }).unique().notNull(),
  value: text('value').notNull(),
  description: text('description'),
  isEncrypted: boolean('is_encrypted').default(false),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
});

// 插件授权码表（Licenses）
export const pluginLicenses = mysqlTable('plugin_licenses', {
  id: int('id').autoincrement().primaryKey(),
  code: varchar('code', { length: 64 }).unique().notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  durationDays: int('duration_days').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('unused'),
  note: text('note'),
  boundUserId: text('bound_user_id'),
  boundUserName: text('bound_user_name'),
  boundAt: datetime('bound_at'),
  validUntil: datetime('valid_until'),
  expiresAt: datetime('expires_at'),
  createdBy: text('created_by'),
  createdAt: datetime('created_at').notNull(),
});

// 用户授权绑定记录表
export const userLicenseBindings = mysqlTable('user_license_bindings', {
  id: int('id').autoincrement().primaryKey(),
  licenseId: int('license_id').notNull().references(() => pluginLicenses.id),
  userId: text('user_id').notNull(),
  userName: text('user_name'),
  validUntil: datetime('valid_until'),
  status: varchar('status', { length: 20 }).notNull(),
  createdAt: datetime('created_at').notNull(),
});