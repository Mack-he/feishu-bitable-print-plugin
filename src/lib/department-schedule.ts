/**
 * 部门定时同步的时间点计算（纯函数，无运行时依赖，便于单测）
 *
 * 时间点用 "HH:mm" 表示，多个用逗号分隔，例如 "03:00,15:00"；
 * 判定在**指定时区**（IANA 名，如 Asia/Shanghai）的墙钟时间进行，
 * 而不是进程本地时间——Next 的 Node 进程时区可能被固定为 UTC，
 * 直接取进程本地时间会让"每天 03:00"实际在北京 11:00 才触发。
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

/** 校验 IANA 时区名（如 Asia/Shanghai、UTC） */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** 某时刻在指定时区的墙钟字段 */
function zonedParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');
  let hour = get('hour');
  // 个别实现在 00 点会输出 24
  if (hour === 24) hour = 0;

  return { year: get('year'), month: get('month'), day: get('day'), hour, minute: get('minute') };
}

/** 指定时区在某时刻相对 UTC 的偏移（分钟，东八区为 +480） */
function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0);
  const floored = Math.floor(date.getTime() / 60_000) * 60_000;
  return Math.round((asUtc - floored) / 60_000);
}

/**
 * 「指定时区当天」的 slot（HH:mm）对应的绝对时刻。
 * 先按 UTC 构造再补偿该时区当时的偏移；中国无夏令时，一次补偿即精确。
 */
export function slotInstant(slot: string, timeZone: string, now: Date): Date {
  const [hour, minute] = slot.split(':').map(Number);
  const p = zonedParts(now, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, hour, minute, 0, 0);
  const guess = new Date(asUtc - zoneOffsetMinutes(new Date(asUtc), timeZone) * 60_000);
  return new Date(asUtc - zoneOffsetMinutes(guess, timeZone) * 60_000);
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
export function findDueSlot(
  times: string[],
  lastRunAt: Date | null,
  now: Date,
  timeZone: string
): string | null {
  let due: string | null = null;
  let dueAt: Date | null = null;

  for (const slot of times) {
    const at = slotInstant(slot, timeZone, now);
    if (at.getTime() > now.getTime()) continue;
    if (lastRunAt && at.getTime() <= lastRunAt.getTime()) continue;
    if (!dueAt || at.getTime() > dueAt.getTime()) {
      due = slot;
      dueAt = at;
    }
  }

  return due;
}