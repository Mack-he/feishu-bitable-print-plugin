import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function inspectionTemplate() {
  return buildTemplate([
    titleComponent('巡检记录表'),
    textComponent('巡检日期：[巡检日期]    巡检时间：[巡检时间]'),
    textComponent('巡检人员：[巡检人员]    巡检区域：[巡检区域]'),
    lineComponent(),
    tableComponent([
      ['序号', '检查项目', '检查内容', '检查结果', '异常情况', '处理措施'],
      ['1', '[检查项目]', '[检查内容]', '[检查结果]', '[异常情况]', '[处理措施]'],
      ['2', '', '', '', '', ''],
      ['3', '', '', '', '', ''],
      ['4', '', '', '', '', ''],
    ], [50, 100, 140, 80, 100, 120]),
    textComponent('巡检结论：[巡检结论]'),
    textComponent('整改要求：[整改要求]    整改期限：[整改期限]'),
    lineComponent(),
    textComponent('巡检人签字：    负责人签字：'),
  ]);
}
