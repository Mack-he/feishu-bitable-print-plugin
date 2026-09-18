/**
 * 部门定时同步的时间点计算（纯函数，无运行时依赖，便于单测）
 *
 * 时间点用服务器本地时区的 "HH:mm" 表示，多个用逗号分隔，例如 "03:00,15:00"。
 */

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** 解析 "03:00,15:00" 形式的配置：去重、排序，非法项忽略 */
export function parseSchedule(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const times = new Set<string>();
  for (const part of raw.split(',')) {
    const value = part.trim();
    if (TIME_PATTERN.test(value)) times.add(value);
  }
  return [...times].sort();
}

/** 某天该时间点对应的本地时间 */
export function slotDateTime(slot: string, reference: Date): Date {
  const [hour, minute] = slot.split(':').map(Number);
  return new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
    hour,
    minute,
    0,
    0
  );
}

/**
 * 找出此刻应该执行的时间点：**已到点、且晚于上次执行时间**中最晚的一个；没有则返回 null。
 *
 * 由此得到的语义：
 * - 正常情况：到点后的第一次检查触发，之后不再重复（同一天同一时间点只跑一次）
 * - 进程重启/停机跨过了时间点：下次启动后补跑一次，而不是把错过的几次都补上
 * - 首次启用（lastRunAt 为空）：当天已过的时间点会立即补跑一次
 * - 时间点未来：不动
 */
export function findDueSlot(times: string[], lastRunAt: Date | null, now: Date): string | null {
  let due: string | null = null;
  let dueAt: Date | null = null;

  for (const slot of times) {
    const at = slotDateTime(slot, now);
    if (at.getTime() > now.getTime()) continue;
    if (lastRunAt && at.getTime() <= lastRunAt.getTime()) continue;
    if (!dueAt || at.getTime() > dueAt.getTime()) {
      due = slot;
      dueAt = at;
    }
  }

  return due;
}