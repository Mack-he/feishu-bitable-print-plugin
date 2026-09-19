/**
 * 模板授权的服务端装配层
 * 把「数据库里的模板 + 授权名单 + 当前用户的部门」组装成 canUseTemplate() 需要的入参
 */

import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { departments, templateGrants, templates, userDepartments, users } from '@/lib/db/schema';
import {
  buildAccessSubject,
  canUseTemplate,
  type TemplateAccess,
  type TemplateAccessSubject,
  type TemplateGrantLike,
} from '@/lib/template-access';

export type TemplateRow = typeof templates.$inferSelect;

/**
 * 列表场景的模板行：不含 data（大字段，可能几百 KB）。
 * 列表接口不取 data，打开单个模板时由前端走 GET /api/templates/[id] 按需加载完整内容
 */
export type TemplateListRow = Omit<TemplateRow, 'data'>;

export type TemplateSource = 'mine' | 'enterprise' | 'shared';

export interface TemplateWithAccess {
  template: TemplateListRow;
  access: TemplateAccess;
  source: TemplateSource;
  ownerName?: string | null;
}

/**
 * 当前用户的部门上下文
 * 只统计仍有效的部门（同步时被标记为 inactive 的部门不参与授权判定），
 * path 里的祖先链每次同步都会按飞书部门树重建，因此不会包含已失效部门
 */
export async function loadAccessSubject(userId: number): Promise<TemplateAccessSubject> {
  const rows = await db
    .select({ departmentId: userDepartments.departmentId, path: departments.path })
    .from(userDepartments)
    .innerJoin(departments, eq(departments.id, userDepartments.departmentId))
    .where(and(eq(userDepartments.userId, userId), eq(departments.status, 'active')));

  const direct = rows.map((row) => row.departmentId);
  const ancestors = new Set<number>();
  for (const row of rows) {
    for (const part of (row.path || '').split(',')) {
      const value = Number(part);
      if (Number.isInteger(value) && value > 0) ancestors.add(value);
    }
  }

  return buildAccessSubject(userId, direct, [...ancestors]);
}

/** 与当前用户相关的授权记录（用户维度 + 部门维度） */
export async function loadRelevantGrants(userId: number, subject: TemplateAccessSubject) {
  const conditions = [and(eq(templateGrants.subjectType, 'user'), eq(templateGrants.subjectId, userId))];
  if (subject.departmentAncestorIds.length > 0) {
    conditions.push(
      and(
        eq(templateGrants.subjectType, 'department'),
        inArray(templateGrants.subjectId, subject.departmentAncestorIds)
      )
    );
  }

  return db.select().from(templateGrants).where(or(...conditions));
}

/** 某个模板的完整授权名单 */
export async function loadGrantsForTemplate(templateId: number): Promise<TemplateGrantLike[]> {
  const rows = await db.select().from(templateGrants).where(eq(templateGrants.templateId, templateId));
  return rows.map((row) => ({
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    includeSubDepartments: row.includeSubDepartments,
  }));
}

/**
 * 当前用户可见的模板列表（含企业模板与他人共享给我的）
 * includeDisabledOwn：创建者自己可见被停用的模板
 */
export async function loadVisibleTemplates(userId: number): Promise<TemplateWithAccess[]> {
  const subject = await loadAccessSubject(userId);
  const relevantGrants = await loadRelevantGrants(userId, subject);
  const grantedTemplateIds = [...new Set(relevantGrants.map((grant) => grant.templateId))];

  const conditions = [eq(templates.userId, userId), eq(templates.visibility, 'public')];
  if (grantedTemplateIds.length > 0) {
    conditions.push(inArray(templates.id, grantedTemplateIds));
  }

  const rows = await db
    .select({
      template: {
        id: templates.id,
        userId: templates.userId,
        name: templates.name,
        description: templates.description,
        thumbnail: templates.thumbnail,
        isPublic: templates.isPublic,
        visibility: templates.visibility,
        status: templates.status,
        sourceTemplateId: templates.sourceTemplateId,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
      },
      ownerName: users.name,
    })
    .from(templates)
    .leftJoin(users, eq(users.id, templates.userId))
    .where(or(...conditions))
    .orderBy(desc(templates.updatedAt));

  // 逐个模板取其授权名单再判定（模板数量级小，避免复杂 SQL）
  const grantsByTemplate = await loadGrantsByTemplateIds(rows.map((row) => row.template.id));

  const result: TemplateWithAccess[] = [];
  for (const row of rows) {
    const access = canUseTemplate(row.template, subject, grantsByTemplate.get(row.template.id) || []);
    if (!access.canView) continue;

    result.push({
      template: row.template,
      access,
      source: access.isOwner ? 'mine' : access.isEnterprise ? 'enterprise' : 'shared',
      ownerName: row.ownerName,
    });
  }

  return result;
}

/** 批量取授权名单：templateId -> grants */
export async function loadGrantsByTemplateIds(templateIds: number[]) {
  const map = new Map<number, TemplateGrantLike[]>();
  if (templateIds.length === 0) return map;

  const rows = await db.select().from(templateGrants).where(inArray(templateGrants.templateId, templateIds));
  for (const row of rows) {
    const list = map.get(row.templateId) || [];
    list.push({
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      includeSubDepartments: row.includeSubDepartments,
    });
    map.set(row.templateId, list);
  }
  return map;
}

export interface GrantWithSubject {
  id: number;
  subjectType: string;
  subjectId: number;
  includeSubDepartments: boolean;
  subjectName: string | null;
  /** 授权对象当前是否仍有效：部门在飞书侧删除后会被同步标记为 inactive */
  subjectStatus: 'active' | 'inactive' | 'missing';
}

/** 带名称的授权名单（管理端/共享设置弹窗展示用） */
export async function loadGrantsWithSubjects(templateId: number): Promise<GrantWithSubject[]> {
  const rows = await db.select().from(templateGrants).where(eq(templateGrants.templateId, templateId));
  if (rows.length === 0) return [];

  const userIds = rows.filter((row) => row.subjectType === 'user').map((row) => row.subjectId);
  const departmentIds = rows.filter((row) => row.subjectType === 'department').map((row) => row.subjectId);

  const [userRows, departmentRows] = await Promise.all([
    userIds.length > 0
      ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds))
      : Promise.resolve([] as { id: number; name: string | null }[]),
    departmentIds.length > 0
      ? db
          .select({ id: departments.id, name: departments.name, status: departments.status })
          .from(departments)
          .where(inArray(departments.id, departmentIds))
      : Promise.resolve([] as { id: number; name: string; status: string }[]),
  ]);

  const userNameMap = new Map(userRows.map((row) => [row.id, row.name]));
  const departmentMap = new Map(departmentRows.map((row) => [row.id, row]));

  return rows.map((row) => {
    if (row.subjectType === 'user') {
      const name = userNameMap.get(row.subjectId);
      return {
        id: row.id,
        subjectType: row.subjectType,
        subjectId: row.subjectId,
        includeSubDepartments: row.includeSubDepartments !== false,
        subjectName: name ?? `用户#${row.subjectId}`,
        subjectStatus: name === undefined ? 'missing' : 'active',
      };
    }

    const department = departmentMap.get(row.subjectId);
    // 已失效的部门在名单里显式标注，避免看起来仍然有效
    const status: GrantWithSubject['subjectStatus'] =
      department === undefined ? 'missing' : department.status === 'active' ? 'active' : 'inactive';
    const baseName = department?.name ?? `部门#${row.subjectId}`;

    return {
      id: row.id,
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      includeSubDepartments: row.includeSubDepartments !== false,
      subjectName: status === 'active' ? baseName : `${baseName}（已失效）`,
      subjectStatus: status,
    };
  });
}

/** 覆盖式保存授权名单（调用方需先校验权限） */
export async function replaceTemplateGrants(
  templateId: number,
  entries: Array<{ subjectType: string; subjectId: number; includeSubDepartments?: boolean }>,
  actor: { type: 'user' | 'admin'; id: number }
) {
  await db.delete(templateGrants).where(eq(templateGrants.templateId, templateId));

  if (entries.length === 0) return;

  const deduped = new Map<string, { subjectType: string; subjectId: number; includeSubDepartments: boolean }>();
  for (const entry of entries) {
    const key = `${entry.subjectType}:${entry.subjectId}`;
    deduped.set(key, {
      subjectType: entry.subjectType,
      subjectId: entry.subjectId,
      includeSubDepartments: entry.includeSubDepartments !== false,
    });
  }

  const now = new Date();
  await db.insert(templateGrants).values(
    [...deduped.values()].map((entry) => ({
      templateId,
      subjectType: entry.subjectType,
      subjectId: entry.subjectId,
      includeSubDepartments: entry.includeSubDepartments,
      createdByType: actor.type,
      createdById: actor.id,
      createdAt: now,
    }))
  );
}