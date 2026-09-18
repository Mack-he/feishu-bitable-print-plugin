import {
  findDueSlot,
  isValidTimeZone,
  parseSchedule,
  slotInstant,
} from '../src/lib/department-schedule.ts';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} → ${JSON.stringify(actual)}${ok ? '' : `（期望 ${JSON.stringify(expected)}）`}`);
}

const SH = 'Asia/Shanghai'; // UTC+8，无夏令时，偏移 +480 分钟

// ---------- parseSchedule ----------
check('parse 去重排序', parseSchedule('15:00, 3:00,03:00'), ['03:00', '15:00']);
check('parse 非法项忽略', parseSchedule('25:00,03:60,abc,08:30'), ['08:30']);
check('parse 空值', parseSchedule(''), []);
check('parse 全部非法后为空', parseSchedule('x,y'), []);

// ---------- isValidTimeZone ----------
check('isValidTimeZone Asia/Shanghai', isValidTimeZone('Asia/Shanghai'), true);
check('isValidTimeZone UTC', isValidTimeZone('UTC'), true);
check('isValidTimeZone 非法', isValidTimeZone('Mars/Olympus'), false);

// ---------- slotInstant ----------
check('上海 03:00 的绝对时刻', slotInstant('03:00', SH, new Date('2026-09-18T04:00:00Z')).toISOString(), '2026-09-17T19:00:00.000Z');
check('上海 15:00 的绝对时刻', slotInstant('15:00', SH, new Date('2026-09-18T04:00:00Z')).toISOString(), '2026-09-18T07:00:00.000Z');
check('UTC 03:00 的绝对时刻', slotInstant('03:00', 'UTC', new Date('2026-09-18T04:00:00Z')).toISOString(), '2026-09-18T03:00:00.000Z');

// ---------- findDueSlot ----------
const times = ['03:00', '15:00'];

// 同一时刻，按不同时区判定结果不同：2026-09-18T02:00:00Z = 上海 10:00
check('上海 10:00 无历史 → 跑 03:00（03:00 已过）', findDueSlot(times, null, new Date('2026-09-18T02:00:00Z'), SH), '03:00');
check('UTC 10:00(=02:00Z) 无历史 → 不跑（03:00 UTC 未到）', findDueSlot(times, null, new Date('2026-09-18T02:00:00Z'), 'UTC'), null);

// 上海 2026-09-18T19:00:00Z = 上海 09-19 03:00 整
check('上海 03:00 整点无历史 → 跑 03:00', findDueSlot(times, null, new Date('2026-09-18T19:00:00Z'), SH), '03:00');
check('UTC 03:00 整点(=03:00Z) 无历史 → 跑 03:00', findDueSlot(times, null, new Date('2026-09-18T03:00:00Z'), 'UTC'), '03:00');

// 上海 2026-09-18T15:00:00Z = 上海 23:00
check('上海 23:00 无历史 → 只补跑最近一次 15:00', findDueSlot(times, null, new Date('2026-09-18T15:00:00Z'), SH), '15:00');
check('上海 23:00 上次=今天 15:30 → 不跑', findDueSlot(times, new Date('2026-09-18T07:30:00Z'), new Date('2026-09-18T15:00:00Z'), SH), null);
check('上海 23:00 上次=今天 03:05 → 跑 15:00', findDueSlot(times, new Date('2026-09-17T19:05:00Z'), new Date('2026-09-18T15:00:00Z'), SH), '15:00');

// 跨天 / 停机补跑
check('上海 10:00 上次=昨天 15:00 → 补跑 03:00', findDueSlot(times, new Date('2026-09-17T07:00:00Z'), new Date('2026-09-18T02:00:00Z'), SH), '03:00');
check('上海 00:30 上次=昨天 15:00 → 不跑（今天未到点）', findDueSlot(times, new Date('2026-09-17T07:00:00Z'), new Date('2026-09-17T16:30:00Z'), SH), null);

// 上次时间在未来（时钟回拨）→ 不跑
check('上次时间在未来 → 不跑', findDueSlot(times, new Date('2026-09-19T00:00:00Z'), new Date('2026-09-18T15:00:00Z'), SH), null);

// 一天一次
check('一天一次 03:00，上海 09:00 无历史 → 跑 03:00', findDueSlot(['03:00'], null, new Date('2026-09-18T01:00:00Z'), SH), '03:00');

console.log(failures === 0 ? '\n全部通过' : `\n${failures} 个失败`);
process.exit(failures === 0 ? 0 : 1);
