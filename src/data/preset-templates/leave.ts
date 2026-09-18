import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function leaveTemplate() {
  return buildTemplate([
    titleComponent('请假申请单'),
    textComponent('申请人：[申请人]    部门：[部门]    职位：[职位]'),
    lineComponent(),
    tableComponent([
      ['项目', '内容'],
      ['请假类型', '[请假类型]'],
      ['请假原因', '[请假原因]'],
      ['开始时间', '[开始时间]'],
      ['结束时间', '[结束时间]'],
      ['请假天数', '[请假天数]'],
      ['工作交接', '[工作交接]'],
    ], [120, 420]),
    lineComponent(),
    textComponent('申请人签字：    部门主管：    人事审批：    总经理审批：'),
  ]);
}
