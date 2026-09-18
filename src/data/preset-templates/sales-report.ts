import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function salesReportTemplate() {
  return buildTemplate([
    titleComponent('销售日报'),
    textComponent('日期：[日期]    销售员：[销售员]    区域：[区域]'),
    lineComponent(),
    tableComponent([
      ['序号', '客户名称', '产品', '数量', '金额', '跟进状态', '备注'],
      ['1', '[客户名称]', '[产品]', '[数量]', '[金额]', '[跟进状态]', '[备注]'],
      ['2', '', '', '', '', '', ''],
      ['3', '', '', '', '', '', ''],
      ['合计', '', '', '', '[今日销售额]', '', ''],
    ], [40, 100, 100, 50, 70, 80, 100]),
    textComponent('今日拜访客户数：[拜访客户数]    新增意向客户：[新增客户数]'),
    textComponent('明日计划：[明日计划]'),
    textComponent('问题与建议：[问题与建议]'),
  ]);
}
