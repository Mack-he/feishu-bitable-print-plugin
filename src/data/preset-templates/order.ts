import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function orderTemplate() {
  return buildTemplate([
    titleComponent('订购单'),
    textComponent('订单编号：[订单编号]    下单日期：[下单日期]'),
    textComponent('供应商：[供应商]    联系人：[联系人]    联系电话：[联系电话]'),
    lineComponent(),
    tableComponent([
      ['序号', '商品名称', '规格', '单位', '数量', '单价', '金额'],
      ['1', '[商品名称]', '[规格]', '[单位]', '[数量]', '[单价]', '[金额]'],
      ['2', '', '', '', '', '', ''],
      ['3', '', '', '', '', '', ''],
      ['合计', '', '', '', '', '', '[合计金额]'],
    ], [50, 140, 80, 50, 60, 70, 80]),
    textComponent('交货日期：[交货日期]    交货地点：[交货地点]'),
    textComponent('付款方式：[付款方式]'),
    lineComponent(),
    textComponent('制单人：[制单人]    审核人：[审核人]'),
  ]);
}
