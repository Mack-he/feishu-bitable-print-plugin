import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import {
  DepartmentSyncBusyError,
  FeishuContactPermissionError,
} from '@/lib/feishu-contact';
import {
  runScheduledSync,
  summarizeDepartmentSyncResult,
} from '@/lib/department-scheduler';
import { getSystemConfig } from '@/lib/system-config';

export const dynamic = 'force-dynamic';
/** 供 Vercel 等平台放宽执行时长；自建/Docker 环境不受此限制 */
export const maxDuration = 300;

const DEFAULT_TIME_BUDGET_MS = 240_000;

/**
 * 定时同步入口（外部调度器用：XXL-Job / crontab / K8s CronJob / Vercel Cron）
 *
 * 应用自带了内置调度器（见 src/lib/department-scheduler.ts，配
 * DEPARTMENT_SYNC_SCHEDULE_ENABLED=true 即可），自建部署优先用它；这个接口适合
 * Serverless 环境或已经统一用某个调度平台的情况。两者选一个即可。
 *
 * GET|POST /api/cron/departments/sync
 *   Header: X-Cron-Secret: <DEPARTMENT_SYNC_CRON_SECRET>   （也可用 ?secret=，便于只在 URL 里配置）
 *   Query : all=false           只刷一批（默认 true：一次调用覆盖全部用户）
 *           userBatchSize=500   每批用户数（默认 500，上限 5000）
 *           userOffset=0        指定起点；不传则用服务端记住的续传位置（跑完自动归零）
 *           timeBudgetMs=240000 时间预算，超时返回剩余进度（0 表示不限）
 *
 * 密钥未配置时直接拒绝，避免这个较重且会打飞书接口的入口被随意触发。
 */
async function handle(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const expectedSecret = await getSystemConfig('DEPARTMENT_SYNC_CRON_SECRET');
    const providedSecret = request.headers.get('x-cron-secret') || searchParams.get('secret') || '';

    if (!expectedSecret) {
      return json(
        { success: false, error: '未配置 DEPARTMENT_SYNC_CRON_SECRET，定时同步入口已关闭' },
        503
      );
    }
    if (!safeEqual(providedSecret, expectedSecret)) {
      return json({ success: false, error: '密钥不正确' }, 401);
    }

    const userBatchSize = Number(searchParams.get('userBatchSize')) || undefined;
    const allParam = searchParams.get('all');
    const syncAllUsers = allParam === null ? true : allParam !== 'false' && allParam !== '0';
    const budgetParam = searchParams.get('timeBudgetMs');
    const timeBudgetMs =
      budgetParam !== null
        ? Number(budgetParam) || 0
        : Number(process.env.DEPARTMENT_SYNC_TIME_BUDGET_MS) || DEFAULT_TIME_BUDGET_MS;

    // 不显式指定起点时，从上次续传位置继续；这样即使调度器读超时提前断开，多次调度也能覆盖全部用户
    const offsetParam = searchParams.get('userOffset');

    const result = await runScheduledSync({
      userOffset: offsetParam === null ? undefined : Number(offsetParam) || 0,
      userBatchSize,
      syncAllUsers,
      timeBudgetMs,
    });

    return json({
      success: true,
      data: result,
      message: `定时同步完成：${summarizeDepartmentSyncResult(result)}`,
    });
  } catch (error) {
    if (error instanceof DepartmentSyncBusyError) {
      return json({ success: false, error: error.message }, 409);
    }
    if (error instanceof FeishuContactPermissionError) {
      return json({ success: false, error: error.message }, 403);
    }
    console.error('[Cron Departments Sync API] 定时同步失败:', error);
    return json(
      { success: false, error: error instanceof Error ? error.message : '定时同步失败' },
      500
    );
  }
}

/**
 * 显式带上 charset：Windows PowerShell 5.1 等客户端遇到不带 charset 的
 * application/json 会按 Latin-1 解码，中文提示会变成乱码
 */
function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}