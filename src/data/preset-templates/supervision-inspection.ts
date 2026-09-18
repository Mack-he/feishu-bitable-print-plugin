import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function supervisionInspectionTemplate() {
  return buildTemplate([
    titleComponent('监理巡查记录'),
    textComponent('工程名称：[工程名称]'),
    textComponent('巡查日期：[巡查日期]    巡查人员：[巡查人员]'),
    lineComponent(),
    tableComponent([
      ['序号', '巡查部位', '巡查内容', '发现问题', '处理意见', '整改情况'],
      ['1', '[巡查部位]', '[巡查内容]', '[发现问题]', '[处理意见]', '[整改情况]'],
      ['2', '', '', '', '', ''],
      ['3', '', '', '', '', ''],
    ], [40, 100, 120, 100, 100, 80]),
    textComponent('巡查结论：[巡查结论]'),
    lineComponent(),
    textComponent('监理工程师：[监理工程师]    施工单位代表：[施工单位代表]'),
  ]);
}
