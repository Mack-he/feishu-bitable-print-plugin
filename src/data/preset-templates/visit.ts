import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function visitTemplate() {
  return buildTemplate([
    titleComponent('客户拜访记录'),
    textComponent('拜访日期：[拜访日期]    拜访人员：[拜访人员]'),
    tableComponent([
      ['项目', '内容'],
      ['客户名称', '[客户名称]'],
      ['客户地址', '[客户地址]'],
      ['联系人', '[联系人]'],
      ['联系电话', '[联系电话]'],
      ['拜访目的', '[拜访目的]'],
      ['沟通内容', '[沟通内容]'],
      ['客户需求', '[客户需求]'],
      ['竞品情况', '[竞品情况]'],
      ['下一步计划', '[下一步计划]'],
      ['跟进时间', '[跟进时间]'],
    ], [120, 420]),
    textComponent('拜访总结：[拜访总结]'),
  ]);
}
