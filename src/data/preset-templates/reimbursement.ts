import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function reimbursementTemplate() {
  return buildTemplate([
    titleComponent('费用报销单'),
    textComponent('报销人：[报销人]    部门：[部门]    报销日期：[报销日期]'),
    lineComponent(),
    tableComponent([
      ['序号', '费用类型', '费用说明', '发生日期', '金额', '票据张数'],
      ['1', '[费用类型]', '[费用说明]', '[发生日期]', '[金额]', '[票据张数]'],
      ['2', '', '', '', '', ''],
      ['3', '', '', '', '', ''],
      ['合计', '', '', '', '[合计金额]', ''],
    ], [50, 100, 160, 90, 80, 70]),
    textComponent('大写金额：[大写金额]'),
    textComponent('报销事由：[报销事由]'),
    lineComponent(),
    textComponent('报销人签字：    部门主管：    财务审核：    总经理审批：'),
  ]);
}
