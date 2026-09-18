import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function quoteTemplate() {
  return buildTemplate([
    titleComponent('报价单'),
    textComponent('报价编号：[报价编号]    报价日期：[报价日期]'),
    textComponent('客户名称：[客户名称]    联系人：[联系人]    联系电话：[联系电话]'),
    lineComponent(),
    tableComponent([
      ['序号', '产品名称', '规格型号', '数量', '单价', '金额', '备注'],
      ['1', '[产品名称]', '[规格型号]', '[数量]', '[单价]', '[金额]', '[备注]'],
      ['2', '', '', '', '', '', ''],
      ['3', '', '', '', '', '', ''],
      ['合计', '', '', '', '', '[合计金额]', ''],
    ], [50, 120, 100, 60, 80, 80, 100]),
    textComponent('大写金额：[大写金额]'),
    textComponent('备注说明：[备注说明]'),
    lineComponent(),
    textComponent('报价人：[报价人]    审核人：[审核人]    公司盖章：'),
  ]);
}
