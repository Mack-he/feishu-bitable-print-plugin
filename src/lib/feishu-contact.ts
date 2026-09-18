/**
 * 飞书通讯录（部门）同步
 *
 * 按 user_id 查询用户所属部门（不使用 union_id）：
 *   GET /open-apis/contact/v3/users/:user_id?user_id_type=user_id&department_id_type=open_department_id
 *
 * 前置条件：服务端自建应用需开通通讯录相关权限（用户信息读取 + 部门信息读取），
 * 且应用可见范围覆盖目标用户；否则会返回权限错误，被 FeishuContactPermissionError 标记。
 */

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { departments, userDepartments, users } from '@/lib/db/schema';
import { getSystemConfig } from '@/lib/system-config';

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';
const OPEN_DEPARTMENT_ID_TYPE = 'open_department_id';
/** 单次同步最多处理的用户数，避免触发通讯录接口限流 */
const MAX_USERS_PER_SYNC = 200;

interface FeishuResponse<T> {
  code: number;
  msg?: string;
  data?: T;
}

export class FeishuContactPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeishuContactPermissionError';
  }
}

let tokenCache: { token: string; expireAt: number } | null = null;

async function getTenantAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expireAt - 5 * 60 * 1000) {
    return tokenCache.token;
  }

  const appId = await getSystemConfig('FEISHU_APP_ID');
  const appSecret = await getSystemConfig('FEISHU_APP_SECRET');
  if (!appId || !appSecret) {
    throw new Error('FEISHU_APP_ID 或 FEISHU_APP_SECRET 未配置，请在后台「系统设置」中填写');
  }

  const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });

  const result = await response.json().catch(() => null);
  if (!result || result.code !== 0 || !result.tenant_access_token) {
    throw new Error(`获取 tenant_access_token 失败: ${result?.msg || '未知错误'} (code: ${result?.code})`);
  }

  tokenCache = {
    token: result.tenant_access_token as string,
    expireAt: now + Number(result.expire || 7200) * 1000,
  };
  return tokenCache.token;
}

function isPermissionError(code: number, msg?: string): boolean {
  // 99991672 未开通权限 / 99991663 token 无效 / 其余按文案兜底
  if ([99991672, 99991663, 99991679].includes(code)) return true;
  return /permission|scope|not authorized|无权限|权限/i.test(msg || '');
}

async function contactRequest<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = await getTenantAccessToken();
  const url = new URL(`${FEISHU_API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = (await response.json().catch(() => null)) as FeishuResponse<T> | null;

  if (!result) {
    throw new Error(`通讯录接口返回异常: ${path}`);
  }
  if (result.code !== 0) {
    if (isPermissionError(result.code, result.msg)) {
      throw new FeishuContactPermissionError(
        `通讯录接口无权限（code ${result.code}: ${result.msg}）。请在飞书开放平台为应用开通「通讯录」相关权限并发布生效。`
      );
    }
    throw new Error(`通讯录接口失败: ${result.msg} (code: ${result.code})`);
  }

  return result.data as T;
}

/** 按 user_id 查用户所属部门（open_department_id 列表） */
export async function fetchUserDepartmentsByUserId(feishuUserId: string): Promise<string[]> {
  const data = await contactRequest<{ user?: { department_ids?: string[] } }>(
    `/contact/v3/users/${encodeURIComponent(feishuUserId)}`,
    { user_id_type: 'user_id', department_id_type: OPEN_DEPARTMENT_ID_TYPE }
  );
  return data?.user?.department_ids || [];
}

/** 用 union_id 反查 user_id（用于修正历史上存成 union_id 的记录） */
export async function resolveUserIdByUnionId(unionId: string): Promise<string | null> {
  const data = await contactRequest<{ user?: { user_id?: string } }>(
    `/contact/v3/users/${encodeURIComponent(unionId)}`,
    { user_id_type: 'union_id' }
  );
  return data?.user?.user_id || null;
}

export interface FeishuDepartmentNode {
  /** open_department_id，作为存储键（与用户 department_ids 同类型） */
  feishuDepartmentId: string;
  /** 父部门的 open_department_id */
  parentFeishuDepartmentId: string | null;
  name: string;
  memberCount: number;
}

/**
 * 拉取部门树（含所有子部门，分页）
 *
 * 注意：根部门必须用 department_id_type=department_id 且传 0，
 * open_department_id 类型不接受 0（会报 "not a valid {open_department_id}"）；
 * 该模式下返回的 parent_department_id 也是 department_id 类型，
 * 因此父子关系需要结合同一次响应里的 department_id → open_department_id 映射来还原。
 */
export async function fetchDepartmentTree(): Promise<FeishuDepartmentNode[]> {
  const rawNodes: Array<{
    feishuDepartmentId: string;
    legacyDepartmentId: string;
    name: string;
    parentLegacyDepartmentId: string | null;
    memberCount: number;
  }> = [];
  let pageToken: string | undefined;

  do {
    const data = await contactRequest<{
      items?: Array<{
        open_department_id?: string;
        department_id?: string;
        name?: string;
        parent_department_id?: string;
        member_count?: number;
      }>;
      page_token?: string;
      has_more?: boolean;
    }>('/contact/v3/departments/0/children', {
      department_id_type: 'department_id',
      fetch_child: 'true',
      page_size: '50',
      ...(pageToken ? { page_token: pageToken } : {}),
    });

    for (const item of data?.items || []) {
      const legacyId = item.department_id;
      const openId = item.open_department_id;
      const id = openId || legacyId;
      if (!id) continue;

      const parent = item.parent_department_id || '';
      rawNodes.push({
        feishuDepartmentId: id,
        legacyDepartmentId: legacyId || id,
        name: item.name || id,
        parentLegacyDepartmentId: parent && parent !== '0' ? parent : null,
        memberCount: Number(item.member_count || 0),
      });
    }

    pageToken = data?.has_more ? data.page_token : undefined;
  } while (pageToken);

  // 把父部门的 department_id 还原成 open_department_id
  const legacyToOpen = new Map(rawNodes.map((node) => [node.legacyDepartmentId, node.feishuDepartmentId]));
  return rawNodes.map((node) => ({
    feishuDepartmentId: node.feishuDepartmentId,
    parentFeishuDepartmentId: node.parentLegacyDepartmentId
      ? legacyToOpen.get(node.parentLegacyDepartmentId) ?? null
      : null,
    name: node.name,
    memberCount: node.memberCount,
  }));
}

export interface DepartmentSyncResult {
  departmentCount: number;
  linkedUserCount: number;
  skippedUsers: Array<{ userId: number; name: string | null; reason: string }>;
}

/**
 * 全量同步：部门树 + 每个用户的部门关系
 * 只处理 users 表中已有记录的用户（未登录过的用户不会出现在系统里）
 */
export async function syncDepartmentsFromFeishu(): Promise<DepartmentSyncResult> {
  const now = new Date();
  const tree = await fetchDepartmentTree();

  // 1. 先 upsert 部门（拿到本地 id）
  const feishuIdToLocalId = new Map<string, number>();
  for (const node of tree) {
    const [existing] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.feishuDepartmentId, node.feishuDepartmentId));

    if (existing) {
      await db
        .update(departments)
        .set({
          name: node.name,
          parentFeishuDepartmentId: node.parentFeishuDepartmentId,
          memberCount: node.memberCount,
          status: 'active',
          lastSyncedAt: now,
          updatedAt: now,
        })
        .where(eq(departments.id, existing.id));
      feishuIdToLocalId.set(node.feishuDepartmentId, existing.id);
    } else {
      const [{ id }] = await db
        .insert(departments)
        .values({
          feishuDepartmentId: node.feishuDepartmentId,
          name: node.name,
          parentFeishuDepartmentId: node.parentFeishuDepartmentId,
          memberCount: node.memberCount,
          status: 'active',
          lastSyncedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .$returningId();
      feishuIdToLocalId.set(node.feishuDepartmentId, id);
    }
  }

  // 2. 计算祖先链 path（形如 ,1,4,9,，含自身），供「含下级部门」匹配
  const parentByFeishuId = new Map(tree.map((node) => [node.feishuDepartmentId, node.parentFeishuDepartmentId]));
  const pathCache = new Map<string, string>();
  const buildPath = (feishuId: string, guard = 0): string => {
    if (pathCache.has(feishuId)) return pathCache.get(feishuId)!;
    const localId = feishuIdToLocalId.get(feishuId);
    if (!localId || guard > 32) return ',';
    const parentFeishuId = parentByFeishuId.get(feishuId);
    const parentPath = parentFeishuId && feishuIdToLocalId.has(parentFeishuId) ? buildPath(parentFeishuId, guard + 1) : ',';
    const path = `${parentPath}${localId},`;
    pathCache.set(feishuId, path);
    return path;
  };

  for (const node of tree) {
    const localId = feishuIdToLocalId.get(node.feishuDepartmentId);
    if (!localId) continue;
    await db
      .update(departments)
      .set({ path: buildPath(node.feishuDepartmentId) })
      .where(eq(departments.id, localId));
  }

  // 3. 同步用户 -> 部门（按 user_id 查询）
  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      feishuUserId: users.feishuUserId,
      feishuUnionId: users.feishuUnionId,
    })
    .from(users)
    .limit(MAX_USERS_PER_SYNC);

  const skippedUsers: DepartmentSyncResult['skippedUsers'] = [];
  let linkedUserCount = 0;

  for (const user of userRows) {
    let feishuUserId = user.feishuUserId;

    try {
      let departmentIds: string[] = [];
      try {
        departmentIds = await fetchUserDepartmentsByUserId(feishuUserId);
      } catch (error) {
        // 历史数据里 feishuUserId 可能存的是 union_id，用 union_id 反查真实 user_id 再重试
        if (user.feishuUnionId && user.feishuUnionId !== feishuUserId) {
          const resolved = await resolveUserIdByUnionId(user.feishuUnionId);
          if (resolved) {
            feishuUserId = resolved;
            departmentIds = await fetchUserDepartmentsByUserId(resolved);
            await db
              .update(users)
              .set({ feishuUserId: resolved, updatedAt: new Date() })
              .where(eq(users.id, user.id));
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      const localDepartmentIds = departmentIds
        .map((feishuId) => feishuIdToLocalId.get(feishuId))
        .filter((id): id is number => typeof id === 'number');

      await db.delete(userDepartments).where(eq(userDepartments.userId, user.id));
      if (localDepartmentIds.length > 0) {
        await db.insert(userDepartments).values(
          [...new Set(localDepartmentIds)].map((departmentId) => ({
            userId: user.id,
            departmentId,
            syncedAt: now,
          }))
        );
      }
      linkedUserCount += 1;
    } catch (error) {
      if (error instanceof FeishuContactPermissionError) {
        // 权限问题直接抛出，让后台给出明确引导
        throw error;
      }
      skippedUsers.push({
        userId: user.id,
        name: user.name,
        reason: error instanceof Error ? error.message.slice(0, 120) : '未知错误',
      });
    }
  }

  return { departmentCount: tree.length, linkedUserCount, skippedUsers };
}

/** 按需刷新单个用户的部门（登录时调用，不阻塞主流程，失败静默） */
export async function refreshUserDepartments(userId: number): Promise<boolean> {
  try {
    const [user] = await db
      .select({ id: users.id, feishuUserId: users.feishuUserId, feishuUnionId: users.feishuUnionId })
      .from(users)
      .where(eq(users.id, userId));
    if (!user) return false;

    let departmentIds: string[] = [];
    try {
      departmentIds = await fetchUserDepartmentsByUserId(user.feishuUserId);
    } catch {
      if (!user.feishuUnionId) return false;
      const resolved = await resolveUserIdByUnionId(user.feishuUnionId);
      if (!resolved) return false;
      await db.update(users).set({ feishuUserId: resolved, updatedAt: new Date() }).where(eq(users.id, user.id));
      departmentIds = await fetchUserDepartmentsByUserId(resolved);
    }

    const departmentRows = await db
      .select({ id: departments.id, feishuDepartmentId: departments.feishuDepartmentId })
      .from(departments);
    const feishuIdToLocalId = new Map(departmentRows.map((row) => [row.feishuDepartmentId, row.id]));

    const localIds = departmentIds
      .map((feishuId) => feishuIdToLocalId.get(feishuId))
      .filter((id): id is number => typeof id === 'number');

    const now = new Date();
    await db.delete(userDepartments).where(eq(userDepartments.userId, userId));
    if (localIds.length > 0) {
      await db
        .insert(userDepartments)
        .values([...new Set(localIds)].map((departmentId) => ({ userId, departmentId, syncedAt: now })));
    }
    return true;
  } catch (error) {
    console.warn('[FeishuContact] 刷新用户部门失败（忽略）:', error);
    return false;
  }
}