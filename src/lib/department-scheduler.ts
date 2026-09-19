/**
 * 应用内置的部门定时同步（不依赖 xxl-job / crontab 等外部调度器）
 *
 * 由服务端的公共入口在首次请求时拉起（见 ensureDepartmentScheduler），
 * 之后每分钟检查一次，到点则执行「部门树 + 用户部门归属」的全量同步；
 * 同步本身按 users.id 分批续传，进度记在 system_configs 里，因此即使一次跑不完
 * （时间预算用尽）、或进程中途重启，也不会漏人。
 *
 * 配置（system_configs 表优先，其次环境变量）：
 *   DEPARTMENT_SYNC_SCHEDULE_ENABLED  是否启用内置调度，默认 false（不配就是关）
 *   DEPARTMENT_SYNC_SCHEDULE          时间点，逗号分隔的 HH:mm，默认 03:00,15:00
 *   DEPARTMENT_SYNC_TIMEZONE          按哪个时区判定时间点（IANA 名，如 Asia/Shanghai）；
 *                                     不配则用进程时区——注意 Next 的 Node 进程时区可能被
 *                                     固定为 UTC，生产上建议显式配置
 *
 * 注意：定时器运行在 Node 进程内，只适用于自建/Docker（`next start`）这类常驻部署；
 * Vercel 等 Serverless 环境请改用外部调度器调 /api/cron/departments/sync。
 * 多副本部署时每个副本都会各自到点触发，靠同步函数内的防重入 + 数据库写入幂等兜底，
 * 更稳妥的做法是只让一个副本开启该开关。
 */

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { systemConfigs } from '@/lib/db/schema';
import { findDueSlot, isValidTimeZone, parseSchedule } from '@/lib/department-schedule';
import {
  DepartmentSyncBusyError,
  isDepartmentSyncRunning,
  syncDepartmentsFromFeishu,
  type DepartmentSyncResult,
} from '@/lib/feishu-contact';
import { getSystemConfig } from '@/lib/system-config';

/** 检查间隔：每分钟看一次是否到点 */
const TICK_MS = 60_000;
/** 内置调度默认时间点（一天两次） */
export const DEFAULT_SCHEDULE = '03:00,15:00';
/** 单次运行的时间预算，超时则把剩余进度留给下一次 */
const RUN_TIME_BUDGET_MS = 240_000;

const SCHEDULE_KEY = 'DEPARTMENT_SYNC_SCHEDULE';
const ENABLED_KEY = 'DEPARTMENT_SYNC_SCHEDULE_ENABLED';
const TIMEZONE_KEY = 'DEPARTMENT_SYNC_TIMEZONE';
const CURSOR_KEY = 'DEPARTMENT_SYNC_USER_CURSOR';
const LAST_RUN_KEY = 'DEPARTMENT_SYNC_LAST_RUN';

export interface DepartmentLastRun {
  /** 本次执行开始时间（ISO 字符串） */
  at: string;
  /** 触发它的时间点，如 "03:00"；手动/外部触发时为 "manual" */
  slot: string;
  ok: boolean;
  message: string;
}

export interface DepartmentScheduleStatus {
  enabled: boolean;
  times: string[];
  /** 未配置时使用的是默认时间点 */
  usingDefaultTimes: boolean;
  /** 时间点按哪个时区判定（IANA 名，如 Asia/Shanghai） */
  timeZone: string;
  lastRun: DepartmentLastRun | null;
  cursor: number;
  running: boolean;
}

/** 直接读写 system_configs，绕开 getSystemConfig 的 5 分钟缓存 */
async function readRecord(key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: systemConfigs.value })
    .from(systemConfigs)
    .where(eq(systemConfigs.key, key));
  return row?.value ?? null;
}

async function writeRecord(key: string, value: string, description: string): Promise<void> {
  const now = new Date();
  const [existing] = await db
    .select({ id: systemConfigs.id })
    .from(systemConfigs)
    .where(eq(systemConfigs.key, key));

  if (existing) {
    await db
      .update(systemConfigs)
      .set({ value, updatedAt: now })
      .where(eq(systemConfigs.id, existing.id));
    return;
  }

  await db.insert(systemConfigs).values({
    key,
    value,
    description,
    isEncrypted: false,
    createdAt: now,
    updatedAt: now,
  });
}

/** 续传位置：上次刷到第几个用户（0 表示从头开始） */
export async function readSyncCursor(): Promise<number> {
  const raw = await readRecord(CURSOR_KEY);
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export async function writeSyncCursor(value: number): Promise<void> {
  await writeRecord(CURSOR_KEY, String(value), '部门同步：上次刷新到的用户位置（定时任务续传用，内部键）');
}

export async function readLastRun(): Promise<DepartmentLastRun | null> {
  const raw = await readRecord(LAST_RUN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DepartmentLastRun;
    if (!parsed?.at) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeLastRun(record: DepartmentLastRun): Promise<void> {
  await writeRecord(LAST_RUN_KEY, JSON.stringify(record), '部门同步：上次自动同步结果（内部键）');
}

/**
 * 解析调度配置：默认关闭；时间点缺省为 DEFAULT_SCHEDULE；
 * 时区缺省取进程时区（注意 Next 的 Node 进程时区可能被固定为 UTC，
 * 生产上建议显式配置 DEPARTMENT_SYNC_TIMEZONE，例如 Asia/Shanghai）
 */
async function resolveScheduleConfig(): Promise<{
  enabled: boolean;
  times: string[];
  usingDefaultTimes: boolean;
  timeZone: string;
}> {
  const [rawTimes, rawEnabled, rawTimeZone] = await Promise.all([
    getSystemConfig(SCHEDULE_KEY),
    getSystemConfig(ENABLED_KEY),
    getSystemConfig(TIMEZONE_KEY),
  ]);

  const parsed = parseSchedule(rawTimes);
  const enabledValue = (rawEnabled || '').trim().toLowerCase();

  let timeZone = (rawTimeZone || '').trim();
  if (!isValidTimeZone(timeZone)) {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }

  return {
    enabled: ['true', '1', 'yes', 'on'].includes(enabledValue),
    times: parsed.length > 0 ? parsed : parseSchedule(DEFAULT_SCHEDULE),
    usingDefaultTimes: parsed.length === 0,
    timeZone,
  };
}

/**
 * 执行一次可续传的全量同步（内置调度器与 /api/cron 接口共用）
 * 不传 userOffset 时从上次的续传位置继续，跑完自动归零
 */
export async function runScheduledSync(
  options: { userOffset?: number; userBatchSize?: number; syncAllUsers?: boolean; timeBudgetMs?: number } = {}
): Promise<DepartmentSyncResult> {
  const useStoredCursor = typeof options.userOffset !== 'number';
  const userOffset = useStoredCursor ? await readSyncCursor() : options.userOffset!;

  const result = await syncDepartmentsFromFeishu({
    userOffset,
    userBatchSize: options.userBatchSize,
    syncAllUsers: options.syncAllUsers !== false,
    timeBudgetMs: options.timeBudgetMs ?? RUN_TIME_BUDGET_MS,
  });

  if (useStoredCursor) {
    await writeSyncCursor(result.userSync.remaining > 0 ? result.userSync.nextOffset : 0);
  }

  return result;
}

/** 定时同步的运行状态，供后台展示 */
export async function getDepartmentScheduleStatus(): Promise<DepartmentScheduleStatus> {
  const [config, lastRun, cursor] = await Promise.all([
    resolveScheduleConfig(),
    readLastRun(),
    readSyncCursor(),
  ]);

  return {
    enabled: config.enabled,
    times: config.times,
    usingDefaultTimes: config.usingDefaultTimes,
    timeZone: config.timeZone,
    lastRun,
    cursor,
    running: isDepartmentSyncRunning(),
  };
}

/** 同步结果的一句话摘要（内置调度器日志与外部接口共用） */
export function summarizeDepartmentSyncResult(result: DepartmentSyncResult): string {
  const parts = [
    `部门 ${result.departmentCount} 个`,
    `更新 ${result.linkedUserCount}/${result.userSync.processed} 人`,
  ];
  const contact = result.contactUserSync;
  if (contact?.permissionError) {
    parts.push('通讯录人员未同步（权限不足）');
  } else if (contact && contact.fetched > 0) {
    parts.push(`通讯录人员 ${contact.fetched} 人（新增 ${contact.inserted}、更新 ${contact.updated}）`);
  }
  if (result.deactivatedDepartmentCount > 0) parts.push(`标记失效部门 ${result.deactivatedDepartmentCount} 个`);
  if (result.skippedUserCount > 0) parts.push(`失败 ${result.skippedUserCount} 人`);
  if (result.userSync.remaining > 0) parts.push(`剩余 ${result.userSync.remaining} 人下次继续`);
  return parts.join('，');
}

async function executeSlot(slot: string, startedAt: Date): Promise<void> {
  try {
    const result = await runScheduledSync();
    const message = summarizeDepartmentSyncResult(result);
    await writeLastRun({ at: startedAt.toISOString(), slot, ok: true, message });
    console.log(`[DepartmentScheduler] ${slot} 定时同步完成：${message}`);
  } catch (error) {
    if (error instanceof DepartmentSyncBusyError) {
      // 不记录运行时间，留到下一次检查重试
      console.warn(`[DepartmentScheduler] ${slot} 定时同步跳过：已有同步在执行`);
      return;
    }
    const message = error instanceof Error ? error.message : '未知错误';
    await writeLastRun({ at: startedAt.toISOString(), slot, ok: false, message });
    console.error(`[DepartmentScheduler] ${slot} 定时同步失败：${message}`);
  }
}

async function tick(): Promise<void> {
  const { enabled, times, timeZone } = await resolveScheduleConfig();
  if (!enabled || times.length === 0) return;

  const lastRun = await readLastRun();
  const now = new Date();
  const slot = findDueSlot(times, lastRun ? new Date(lastRun.at) : null, now, timeZone);
  if (!slot) return;

  await executeSlot(slot, now);
}

let started = false;

/**
 * 确保内置调度器已启动（幂等）。由服务端的公共入口在首次请求时调用：
 * 不使用 instrumentation.ts 启动——那个入口会被同时编译到 edge 等非 Node 目标，
 * 而调度器依赖 mysql2（内部使用 node: 协议），会让 webpack 的 edge 编译直接失败。
 * 语义：服务收到第一个请求后开始每分钟检查；停机/空闲跨过时间点时会补跑一次。
 */
export function ensureDepartmentScheduler(): void {
  if (started) return;
  started = true;

  const safeTick = () => {
    tick().catch((error) => {
      console.error('[DepartmentScheduler] 调度检查失败:', error);
    });
  };

  // 首次调用立即检查一次（补跑语义），之后每分钟检查
  safeTick();
  setInterval(safeTick, TICK_MS).unref();

  void (async () => {
    try {
      const { enabled, times, usingDefaultTimes, timeZone } = await resolveScheduleConfig();
      if (enabled) {
        console.log(
          `[DepartmentScheduler] 内置定时同步已启用：每天 ${times.join('、')}（时区 ${timeZone}）` +
            `${usingDefaultTimes ? '，时间点来自默认值' : ''}，服务收到首个请求后开始检查`
        );
      } else {
        console.log(
          `[DepartmentScheduler] 内置定时同步未启用（设置 ${ENABLED_KEY}=true 启用，默认时间点 ${DEFAULT_SCHEDULE}，` +
            `时区可用 ${TIMEZONE_KEY} 指定）；也可以用外部调度器调用 /api/cron/departments/sync`
        );
      }
    } catch (error) {
      console.warn('[DepartmentScheduler] 读取调度配置失败（稍后重试）:', error);
    }
  })();
}