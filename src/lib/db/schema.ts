// 数据库 Schema 定义
import { mysqlTable, int, text, datetime, json, boolean, varchar, decimal, uniqueIndex, index } from 'drizzle-orm/mysql-core';

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
  tableId: varchar('table_id', { length: 190 }).notNull(),
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
// 可见性 visibility：private 仅创建者 / public 所有登录用户 / restricted 仅授权名单
// userId 为 NULL 表示企业模板（管理员发布）
export const templates = mysqlTable('templates', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  thumbnail: text('thumbnail'),
  data: json('data').notNull(),
  isPublic: boolean('is_public').default(false),
  visibility: varchar('visibility', { length: 20 }).notNull().default('private'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  /** 企业模板的内容来源模板 id（重新发布时据此更新） */
  sourceTemplateId: int('source_template_id'),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
}, (table) => {
  return {
    visibilityStatusIdx: index('idx_template_visibility_status').on(table.visibility, table.status),
  };
});

// 模板授权名单：把模板授权给用户或部门（部门默认含下级部门）
export const templateGrants = mysqlTable('template_grants', {
  id: int('id').autoincrement().primaryKey(),
  templateId: int('template_id').notNull().references(() => templates.id),
  subjectType: varchar('subject_type', { length: 20 }).notNull(),
  /** subjectType = 'user' 时为 users.id；'department' 时为 departments.id */
  subjectId: int('subject_id').notNull(),
  includeSubDepartments: boolean('include_sub_departments').default(true),
  createdByType: varchar('created_by_type', { length: 20 }),
  createdById: int('created_by_id'),
  createdAt: datetime('created_at').notNull(),
}, (table) => {
  return {
    templateSubjectUnique: uniqueIndex('template_subject_unique').on(table.templateId, table.subjectType, table.subjectId),
  };
});

// 部门表（来自飞书通讯录同步）
export const departments = mysqlTable('departments', {
  id: int('id').autoincrement().primaryKey(),
  feishuDepartmentId: varchar('feishu_department_id', { length: 128 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  parentFeishuDepartmentId: varchar('parent_feishu_department_id', { length: 128 }),
  /** 祖先链，形如 ",1,4,9,"（含自身），便于按子树匹配授权 */
  path: varchar('path', { length: 1000 }),
  memberCount: int('member_count').default(0),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  lastSyncedAt: datetime('last_synced_at'),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
});

// 用户-部门关系（来自飞书通讯录同步）
export const userDepartments = mysqlTable('user_departments', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id),
  departmentId: int('department_id').notNull().references(() => departments.id),
  syncedAt: datetime('synced_at').notNull(),
}, (table) => {
  return {
    userDepartmentUnique: uniqueIndex('user_department_unique').on(table.userId, table.departmentId),
  };
});

// 企业模板发布申请（用户申请 -> 管理员审批）
export const templatePublishRequests = mysqlTable('template_publish_requests', {
  id: int('id').autoincrement().primaryKey(),
  templateId: int('template_id').notNull().references(() => templates.id),
  applicantUserId: int('applicant_user_id').notNull().references(() => users.id),
  note: text('note'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  reviewedByAdminId: int('reviewed_by_admin_id'),
  reviewedAt: datetime('reviewed_at'),
  rejectReason: text('reject_reason'),
  /** 审批通过后生成的企业模板 id */
  enterpriseTemplateId: int('enterprise_template_id'),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
});

// 自定义纸张预设表
// 权限：默认仅创建者可用；is_public = 1 时其他用户可见可用（只读）；status = 'disabled' 由管理员停用
export const paperPresets = mysqlTable('paper_presets', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').references(() => users.id),
  name: varchar('name', { length: 50 }).notNull(),
  // 尺寸单位 mm，统一按纵向基准存储（width <= height）
  widthMm: decimal('width_mm', { precision: 6, scale: 1 }).notNull(),
  heightMm: decimal('height_mm', { precision: 6, scale: 1 }).notNull(),
  isPublic: boolean('is_public').default(false),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
}, (table) => {
  return {
    userPaperNameUnique: uniqueIndex('user_paper_name_unique').on(table.userId, table.name),
    publicStatusIdx: index('idx_paper_public_status').on(table.isPublic, table.status),
  };
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