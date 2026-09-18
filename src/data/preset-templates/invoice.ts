import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function invoiceTemplate() {
  return buildTemplate([
    titleComponent('发货单'),
    textComponent('发货单号：[发货单号]    发货日期：[发货日期]'),
    textComponent('收货单位：[收货单位]    收货人：[收货人]    联系电话：[联系电话]'),
    textComponent('收货地址：[收货地址]'),
    lineComponent(),
    tableComponent([
      ['序号', '产品名称', '规格型号', '单位', '发货数量', '备注'],
      ['1', '[产品名称]', '[规格型号]', '[单位]', '[发货数量]', '[备注]'],
      ['2', '', '', '', '', ''],
      ['3', '', '', '', '', ''],
    ], [50, 140, 100, 50, 80, 120]),
    textComponent('物流公司：[物流公司]    运单号：[运单号]'),
    lineComponent(),
    textComponent('发货人：[发货人]    收货人签字：'),
  ]);
}
