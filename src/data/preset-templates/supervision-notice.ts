import { titleComponent, textComponent, lineComponent, buildTemplate } from './_helpers';

export default function supervisionNoticeTemplate() {
  return buildTemplate([
    titleComponent('监理通知单'),
    textComponent('编号：[编号]    日期：[日期]'),
    textComponent('致：[施工单位]'),
    lineComponent(),
    textComponent('事由：[事由]'),
    textComponent('内容：[通知内容]'),
    textComponent('要求：[整改要求]'),
    textComponent('整改期限：[整改期限]'),
    textComponent('复查时间：[复查时间]'),
    lineComponent(),
    textComponent('监理单位（盖章）：'),
    textComponent('总监理工程师：[总监理工程师]'),
    textComponent('签收人：[签收人]    签收日期：[签收日期]'),
  ]);
}
