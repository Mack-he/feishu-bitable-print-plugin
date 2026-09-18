import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function contractTemplate() {
  return buildTemplate([
    titleComponent('购销合同'),
    textComponent('合同编号：[合同编号]    签订日期：[签订日期]'),
    textComponent('甲方（卖方）：[甲方]'),
    textComponent('乙方（买方）：[乙方]'),
    lineComponent(),
    textComponent('根据《中华人民共和国民法典》及相关法律法规，甲乙双方本着平等互利的原则，经协商一致，签订本合同。'),
    textComponent('一、产品明细'),
    tableComponent([
      ['序号', '产品名称', '规格型号', '数量', '单价', '金额'],
      ['1', '[产品名称]', '[规格型号]', '[数量]', '[单价]', '[金额]'],
      ['2', '', '', '', '', ''],
      ['合计', '', '', '', '', '[合计金额]'],
    ], [50, 140, 100, 60, 80, 80]),
    textComponent('二、交货时间：[交货时间]'),
    textComponent('三、交货地点：[交货地点]'),
    textComponent('四、付款方式：[付款方式]'),
    textComponent('五、违约责任：[违约责任]'),
    lineComponent(),
    textComponent('甲方（盖章）：    乙方（盖章）：'),
    textComponent('代表签字：    代表签字：'),
    textComponent('日期：    日期：'),
  ]);
}
