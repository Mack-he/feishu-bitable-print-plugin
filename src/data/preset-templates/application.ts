import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function applicationTemplate() {
  return buildTemplate([
    titleComponent('申请表'),
    textComponent('申请编号：[申请编号]    申请日期：[申请日期]'),
    tableComponent([
      ['项目', '内容'],
      ['申请人', '[申请人]'],
      ['申请部门', '[申请部门]'],
      ['申请类型', '[申请类型]'],
      ['申请事项', '[申请事项]'],
      ['申请原因', '[申请原因]'],
      ['具体说明', '[具体说明]'],
      ['期望完成时间', '[期望完成时间]'],
    ], [120, 420]),
    lineComponent(),
    textComponent('申请人签字：    部门主管：    审批人：'),
  ]);
}
