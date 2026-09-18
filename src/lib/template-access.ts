/**
 * 模板可见性与授权判定（纯函数，无运行时依赖，便于单测）
 *
 * 规则：
 * - visibility = private    仅创建者
 * - visibility = public     所有登录用户可用
 * - visibility = restricted 仅授权名单内的用户 / 部门可用
 * - status = disabled       非创建者不可见（管理员在后台停用）
 * - userId = NULL           企业模板（管理员发布，没有「创建者」概念）
 *
 * 「使用」= 查看 + 打印/导出；编辑原模板仅创建者；需要改就「复制为我的模板」。
 */

export type TemplateVisibility = 'private' | 'public' | 'restricted';
export type TemplateStatus = 'active' | 'disabled';
export type GrantSubjectType = 'user' | 'department';

export interface TemplateLike {
  userId?: number | null;
  visibility?: string | null;
  status?: string | null;
  /** 旧字段，仅用于兼容历史数据（没有 visibility 时按它推导） */
  isPublic?: boolean | null;
}

export interface TemplateGrantLike {
  subjectType?: string | null;
  subjectId?: number | null;
  includeSubDepartments?: boolean | null;
}

export interface TemplateAccessSubject {
  userId: number;
  /** 用户直接所属的部门 id */
  departmentIds: number[];
  /** 用户所属部门的祖先部门 id（含自身），用于匹配「含下级部门」的授权 */
  departmentAncestorIds: number[];
}

export interface TemplateAccess {
  isOwner: boolean;
  isEnterprise: boolean;
  canView: boolean;
  canPrint: boolean;
  canEdit: boolean;
  canCopy: boolean;
  /** 不可见时的原因，用于界面提示与排查 */
  reason?: 'disabled' | 'not-granted' | 'private';
}

const VISIBILITIES: TemplateVisibility[] = ['private', 'public', 'restricted'];

/** 兼容历史数据：早期只有 is_public，没有 visibility */
export function resolveVisibility(template: TemplateLike | null | undefined): TemplateVisibility {
  const value = (template?.visibility || '').trim() as TemplateVisibility;
  if (VISIBILITIES.includes(value)) return value;
  return template?.isPublic ? 'public' : 'private';
}

export function resolveStatus(template: TemplateLike | null | undefined): TemplateStatus {
  return template?.status === 'disabled' ? 'disabled' : 'active';
}

export function isEnterpriseTemplate(template: TemplateLike | null | undefined): boolean {
  return template?.userId === null || template?.userId === undefined;
}

/** 授权名单是否命中该用户 */
export function matchesGrant(
  grants: TemplateGrantLike[] | null | undefined,
  subject: TemplateAccessSubject
): boolean {
  if (!grants?.length) return false;

  return grants.some((grant) => {
    const type = grant?.subjectType;
    const id = grant?.subjectId;
    if (typeof id !== 'number') return false;

    if (type === 'user') {
      return id === subject.userId;
    }
    if (type === 'department') {
      // includeSubDepartments 默认为 true（未设置时按包含下级处理）
      return grant?.includeSubDepartments === false
        ? subject.departmentIds.includes(id)
        : subject.departmentAncestorIds.includes(id);
    }
    return false;
  });
}

export function canUseTemplate(
  template: TemplateLike | null | undefined,
  subject: TemplateAccessSubject,
  grants: TemplateGrantLike[] | null | undefined = []
): TemplateAccess {
  const visibility = resolveVisibility(template);
  const status = resolveStatus(template);
  const isOwner = !!template && template.userId !== null && template.userId !== undefined && template.userId === subject.userId;
  const isEnterprise = isEnterpriseTemplate(template);

  const base = { isOwner, isEnterprise };

  // 创建者：始终可见可改（模板被停用也只影响他人）
  if (isOwner) {
    return { ...base, canView: true, canPrint: true, canEdit: true, canCopy: true };
  }

  const granted = matchesGrant(grants, subject);

  if (status === 'disabled') {
    return { ...base, canView: false, canPrint: false, canEdit: false, canCopy: false, reason: 'disabled' };
  }

  if (visibility === 'public') {
    return { ...base, canView: true, canPrint: true, canEdit: false, canCopy: true };
  }

  if (visibility === 'restricted' && granted) {
    return { ...base, canView: true, canPrint: true, canEdit: false, canCopy: true };
  }

  return {
    ...base,
    canView: false,
    canPrint: false,
    canEdit: false,
    canCopy: false,
    reason: visibility === 'private' ? 'private' : 'not-granted',
  };
}

/** 授权至部门时，是否命中的判定所需的部门集合说明（供服务端组装 subject 用） */
export function buildAccessSubject(
  userId: number,
  directDepartmentIds: number[],
  ancestorDepartmentIds: number[]
): TemplateAccessSubject {
  return {
    userId,
    departmentIds: [...new Set(directDepartmentIds)],
    departmentAncestorIds: [...new Set([...directDepartmentIds, ...ancestorDepartmentIds])],
  };
}