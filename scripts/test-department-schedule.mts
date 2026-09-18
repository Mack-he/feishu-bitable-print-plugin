import { findDueSlot, parseSchedule } from '../src/lib/department-schedule.ts';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} → ${JSON.stringify(actual)}${ok ? '' : `（期望 ${JSON.stringify(expected)}）`}`);
}

// 解析
check('parse 去重排序', parseSchedule('15:00, 3:00,03:00'), ['03:00', '15:00']);
check('parse 非法项忽略', parseSchedule('25:00,03:60,abc,08:30'), ['08:30']);
check('parse 空值', parseSchedule(''), []);
check('parse 全部非法后为空', parseSchedule('x,y'), []);

const times = ['03:00', '15:00'];
const at = (y: number, mo: number, d: number, h: number, mi: number) => new Date(y, mo - 1, d, h, mi, 0, 0);

// 时间点未到：不跑
check('02:00 无历史 → 不跑', findDueSlot(times, null, at(2026, 9, 18, 2, 0)), null);
// 首次启用：当天已过的最后一个时间点补跑一次
check('03:00 无历史 → 跑 03:00', findDueSlot(times, null, at(2026, 9, 18, 3, 0)), '03:00');
check('16:00 无历史 → 只补跑最近一次 15:00', findDueSlot(times, null, at(2026, 9, 18, 16, 0)), '15:00');
// 同一天同一时间点不重复
check('16:00 上次=今天15:05 → 不跑', findDueSlot(times, at(2026, 9, 18, 15, 5), at(2026, 9, 18, 16, 0)), null);
check('16:00 上次=今天03:05 → 跑 15:00', findDueSlot(times, at(2026, 9, 18, 3, 5), at(2026, 9, 18, 16, 0)), '15:00');
// 跨天 / 停机补跑
check('16:00 上次=昨天15:00 → 跑 15:00（补跑）', findDueSlot(times, at(2026, 9, 17, 15, 0), at(2026, 9, 18, 16, 0)), '15:00');
check('00:30 上次=昨天15:00 → 不跑（今天未到点）', findDueSlot(times, at(2026, 9, 17, 15, 0), at(2026, 9, 18, 0, 30)), null);
check('10:00 上次=昨天15:00 → 跑 03:00', findDueSlot(times, at(2026, 9, 17, 15, 0), at(2026, 9, 18, 10, 0)), '03:00');
// 边界：正好在时间点
check('15:00:00 整点 → 跑 15:00', findDueSlot(times, at(2026, 9, 18, 3, 0), at(2026, 9, 18, 15, 0)), '15:00');
// 时钟回拨/上次时间在未来
check('上次时间在未来 → 不跑', findDueSlot(times, at(2026, 9, 19, 0, 0), at(2026, 9, 18, 16, 0)), null);
// 一天一次
check('一天一次 03:00，09:00 无历史 → 跑 03:00', findDueSlot(['03:00'], null, at(2026, 9, 18, 9, 0)), '03:00');

console.log(failures === 0 ? '\n全部通过' : `\n${failures} 个失败`);
process.exit(failures === 0 ? 0 : 1);
