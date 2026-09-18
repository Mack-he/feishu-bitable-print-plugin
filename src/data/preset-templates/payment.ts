import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function paymentTemplate() {
  return buildTemplate([
    titleComponent('付款申请单'),
    textComponent('申请编号：[申请编号]    申请日期：[申请日期]'),
    textComponent('申请部门：[申请部门]    申请人：[申请人]'),
    lineComponent(),
    tableComponent([
      ['项目', '内容'],
      ['收款单位', '[收款单位]'],
      ['收款账号', '[收款账号]'],
      ['开户银行', '[开户银行]'],
      ['付款金额', '[付款金额]'],
      ['大写金额', '[大写金额]'],
      ['付款事由', '[付款事由]'],
      ['合同编号', '[合同编号]'],
      ['付款方式', '[付款方式]'],
    ], [120, 420]),
    lineComponent(),
    textComponent('申请人签字：    部门主管：    财务审核：    总经理审批：'),
  ]);
}
