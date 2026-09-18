import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function workOrderTemplate() {
  return buildTemplate([
    titleComponent('工单'),
    textComponent('工单编号：[工单编号]    工单类型：[工单类型]'),
    textComponent('报修人：[报修人]    联系电话：[联系电话]    报修时间：[报修时间]'),
    textComponent('故障描述：[故障描述]'),
    lineComponent(),
    tableComponent([
      ['项目', '内容'],
      ['工单标题', '[工单标题]'],
      ['处理人员', '[处理人员]'],
      ['开始时间', '[开始时间]'],
      ['完成时间', '[完成时间]'],
      ['处理过程', '[处理过程]'],
      ['更换配件', '[更换配件]'],
      ['处理结果', '[处理结果]'],
    ], [120, 420]),
    textComponent('客户确认：[客户确认]    客户签字：'),
  ]);
}
