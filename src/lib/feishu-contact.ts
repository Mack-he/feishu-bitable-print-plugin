/**
 * 飞书通讯录（部门）同步
 *
 * 按 user_id 查询用户所属部门（不使用 union_id）：
 *   GET /open-apis/contact/v3/users/:user_id?user_id_type=user_id&department_id_type=open_department_id
 *
 * 前置条件：服务端自建应用需开通通讯录相关权限（用户信息读取 + 部门信息读取），
 * 且应用可见范围覆盖目标用户；否则会返回权限错误，被 FeishuContactPermissionError 标记。
 */

import { asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { departments, userDepartments, users } from '@/lib/db/schema';
import { getSystemConfig } from '@/lib/system-config';

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';
const OPEN_DEPARTMENT_ID_TYPE = 'open_department_id';
/** 单次同步默认刷新的用户数；配合 offset 续传可覆盖全部用户 */
const DEFAULT_USER_BATCH = 500;
/** 单次同步的批大小上限，避免一次请求把通讯录接口与执行时长拖爆 */
const MAX_USER_BATCH = 5000;
/** 刷新用户部门的并发度（每个用户内部仍串行），避免触发接口限流 */
const USER_FETCH_CONCURRENCY = 6;
/** 响应里最多回传多少条失败明细（总数另外统计） */
const MAX_SKIPPED_USERS_REPORTED = 50;

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
/** 同进程防重入标记，避免手工同步与定时任务同时跑 */
let syncInFlight = false;

/** 当前进程内是否有同步在执行（供后台展示与调度器判断） */
export function isDepartmentSyncRunning(): boolean {
  return syncInFlight;
}

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
  /** 本次新标记为失效的部门数（飞书侧已删除或不在应用可见范围） */
  deactivatedDepartmentCount: number;
  /** 本次新标记为失效的部门（受 20 条上限保护，仅用于提示） */
  deactivatedDepartments: Array<{ id: number; name: string }>;
  linkedUserCount: number;
  /** 失败明细（最多 MAX_SKIPPED_USERS_REPORTED 条） */
  skippedUsers: Array<{ userId: number; name: string | null; reason: string }>;
  /** 失败总数，可能大于 skippedUsers.length */
  skippedUserCount: number;
  /** 用户部门关系的刷新进度（按 users.id 分页，可带 offset 续传） */
  userSync: {
    batchSize: number;
    offset: number;
    processed: number;
    total: number;
    /** 下一次续传应传的 offset */
    nextOffset: number;
    remaining: number;
    /** syncAllUsers 模式下是否因时间预算用尽而提前返回 */
    budgetExhausted: boolean;
  };
}

export interface DepartmentSyncOptions {
  /** 本次刷新多少个用户的部门关系，默认 DEFAULT_USER_BATCH */
  userBatchSize?: number;
  /** 从第几个用户开始（按 users.id 升序），用于分批续传 */
  userOffset?: number;
  /** true 时在一次调用里循环分批直到覆盖全部用户（定时任务用） */
  syncAllUsers?: boolean;
  /** syncAllUsers 模式的时间预算（毫秒），0 表示不限；超时返回剩余进度供下次续传 */
  timeBudgetMs?: number;
}

/** 同一进程内已有同步在执行（定时任务与手工同步撞车时据此拒绝） */
export class DepartmentSyncBusyError extends Error {
  constructor() {
    super('已有部门同步任务正在执行，请稍后再试');
    this.name = 'DepartmentSyncBusyError';
  }
}

function resolveUserBatchSize(value?: number): number {
  const fromEnv = Number(process.env.DEPARTMENT_SYNC_USER_BATCH || '');
  const fallback = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_USER_BATCH;
  const raw = typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
  return Math.max(1, Math.min(Math.floor(raw), MAX_USER_BATCH));
}

/** 同步单个用户的部门归属所需的字段 */
export interface FeishuSyncUser {
  id: number;
  feishuUserId: string;
  feishuUnionId: string | null;
}

/**
 * 刷新单个用户的 user_departments（覆盖式写入）
 * 通讯录权限错误直接抛出；其余错误由调用方决定是跳过还是忽略
 */
async function refreshUserDepartmentsWithMap(
  user: FeishuSyncUser,
  feishuIdToLocalId: Map<string, number>,
  syncedAt: Date
): Promise<void> {
  let feishuUserId = user.feishuUserId;

  let departmentIds: string[] = [];
  try {
    departmentIds = await fetchUserDepartmentsByUserId(feishuUserId);
  } catch (error) {
    // 历史数据里 feishuUserId 可能存的是 union_id，用 union_id 反查真实 user_id 再重试
    if (user.feishuUnionId && user.feishuUnionId !== feishuUserId) {
      const resolved = await resolveUserIdByUnionId(user.feishuUnionId);
      if (!resolved) throw error;
      feishuUserId = resolved;
      departmentIds = await fetchUserDepartmentsByUserId(resolved);
      await db.update(users).set({ feishuUserId: resolved, updatedAt: new Date() }).where(eq(users.id, user.id));
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
      [...new Set(localDepartmentIds)].map((departmentId) => ({ userId: user.id, departmentId, syncedAt }))
    );
  }
}

/**
 * 全量同步：部门树 + 用户的部门关系
 * 只处理 users 表中已有记录的用户（未登录过的用户不会出现在系统里）
 *
 * 部门侧为全量覆盖：本次部门树里没有、本地却存在的部门会被标记为 inactive
 * （飞书侧已删除或不在应用可见范围），重新出现在树里时自动恢复 active；
 * 用户侧按 users.id 分批，返回进度，可用 offset 续传直到覆盖全部用户；
 * syncAllUsers 则在一次调用里循环分批跑完（可配 timeBudgetMs 时间预算），供定时任务使用。
 */
export async function syncDepartmentsFromFeishu(
  options: DepartmentSyncOptions = {}
): Promise<DepartmentSyncResult> {
  // 同一进程内串行执行；跨进程/多副本的并发由调用方（如 XXL-Job 的阻塞策略）兜底
  if (syncInFlight) throw new DepartmentSyncBusyError();
  syncInFlight = true;
  try {
    return await runDepartmentSync(options);
  } finally {
    syncInFlight = false;
  }
}

async function runDepartmentSync(options: DepartmentSyncOptions): Promise<DepartmentSyncResult> {
  const now = new Date();
  const batchSize = resolveUserBatchSize(options.userBatchSize);
  const offset = Math.max(0, Math.floor(options.userOffset || 0));
  const syncAllUsers = options.syncAllUsers === true;
  const timeBudgetMs = Math.max(0, Math.floor(options.timeBudgetMs || 0));
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

  // 1b. 本次部门树里没有、本地却存在的部门标记为失效（飞书侧已删除或不在应用可见范围）
  //     只在拿到非空部门树时执行，避免接口异常返回空数组时误伤全部数据；
  //     失效部门会从授权选择器与访问判定中排除，重新出现在树里时上面一步会自动恢复 active
  let deactivatedDepartmentCount = 0;
  let deactivatedDepartments: DepartmentSyncResult['deactivatedDepartments'] = [];
  if (tree.length > 0) {
    const seenFeishuIds = new Set(tree.map((node) => node.feishuDepartmentId));
    const localRows = await db
      .select({
        id: departments.id,
        feishuDepartmentId: departments.feishuDepartmentId,
        name: departments.name,
        status: departments.status,
      })
      .from(departments);

    const staleRows = localRows.filter(
      (row) => !seenFeishuIds.has(row.feishuDepartmentId) && row.status !== 'inactive'
    );
    if (staleRows.length > 0) {
      await db
        .update(departments)
        .set({ status: 'inactive', updatedAt: now })
        .where(inArray(departments.id, staleRows.map((row) => row.id)));
      deactivatedDepartmentCount = staleRows.length;
      deactivatedDepartments = staleRows.slice(0, 20).map((row) => ({ id: row.id, name: row.name }));
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
  //    单批模式只刷一页，由调用方用 offset 续传；syncAllUsers 模式在这里循环到覆盖全部用户
  const [totalRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  const totalUsers = Number(totalRow?.count || 0);
  const deadline = timeBudgetMs > 0 ? Date.now() + timeBudgetMs : Number.POSITIVE_INFINITY;

  const skippedUsers: DepartmentSyncResult['skippedUsers'] = [];
  let skippedUserCount = 0;
  let linkedUserCount = 0;
  let permissionError: FeishuContactPermissionError | null = null;

  /** 处理一页用户，按固定并发度消费；命中权限错误就停下，交给调用方给出明确引导 */
  const processBatch = async (batchOffset: number): Promise<number> => {
    const userRows = await db
      .select({
        id: users.id,
        name: users.name,
        feishuUserId: users.feishuUserId,
        feishuUnionId: users.feishuUnionId,
      })
      .from(users)
      .orderBy(asc(users.id))
      .limit(batchSize)
      .offset(batchOffset);

    const queue = [...userRows];
    const worker = async () => {
      for (;;) {
        if (permissionError) return;
        const user = queue.shift();
        if (!user) return;

        try {
          await refreshUserDepartmentsWithMap(
            { id: user.id, feishuUserId: user.feishuUserId, feishuUnionId: user.feishuUnionId },
            feishuIdToLocalId,
            now
          );
          linkedUserCount += 1;
        } catch (error) {
          if (error instanceof FeishuContactPermissionError) {
            permissionError = error;
            return;
          }
          skippedUserCount += 1;
          if (skippedUsers.length < MAX_SKIPPED_USERS_REPORTED) {
            skippedUsers.push({
              userId: user.id,
              name: user.name,
              reason: error instanceof Error ? error.message.slice(0, 120) : '未知错误',
            });
          }
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(USER_FETCH_CONCURRENCY, queue.length) }, () => worker())
    );

    return userRows.length;
  };

  let cursor = offset;
  for (;;) {
    const processedInBatch = await processBatch(cursor);
    cursor += processedInBatch;

    if (permissionError) throw permissionError;
    if (processedInBatch === 0) break; // 后面没有用户了
    if (!syncAllUsers) break; // 单批模式：把剩余进度交给调用方续传
    if (cursor >= totalUsers) break; // 已覆盖全部用户
    if (Date.now() >= deadline) break; // 时间预算用尽，返回剩余进度
  }

  const nextOffset = cursor;
  const remaining = Math.max(0, totalUsers - nextOffset);

  return {
    departmentCount: tree.length,
    deactivatedDepartmentCount,
    deactivatedDepartments,
    linkedUserCount,
    skippedUsers,
    skippedUserCount,
    userSync: {
      batchSize,
      offset,
      processed: nextOffset - offset,
      total: totalUsers,
      nextOffset,
      remaining,
      budgetExhausted: remaining > 0 && Date.now() >= deadline,
    },
  };
}

/** 按需刷新单个用户的部门（登录时调用，不阻塞主流程，失败静默） */
export async function refreshUserDepartments(userId: number): Promise<boolean> {
  try {
    const [user] = await db
      .select({ id: users.id, feishuUserId: users.feishuUserId, feishuUnionId: users.feishuUnionId })
      .from(users)
      .where(eq(users.id, userId));
    if (!user) return false;

    // 只映射仍有效的部门：已失效（飞书侧删除或不在应用可见范围）的部门不再写入用户归属
    const departmentRows = await db
      .select({ id: departments.id, feishuDepartmentId: departments.feishuDepartmentId })
      .from(departments)
      .where(eq(departments.status, 'active'));
    const feishuIdToLocalId = new Map(departmentRows.map((row) => [row.feishuDepartmentId, row.id]));

    await refreshUserDepartmentsWithMap(user, feishuIdToLocalId, new Date());
    return true;
  } catch (error) {
    console.warn('[FeishuContact] 刷新用户部门失败（忽略）:', error);
    return false;
  }
}