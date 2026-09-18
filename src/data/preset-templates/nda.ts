import { titleComponent, textComponent, lineComponent, buildTemplate } from './_helpers';

export default function ndaTemplate() {
  return buildTemplate([
    titleComponent('保密协议'),
    textComponent('协议编号：[协议编号]    签订日期：[签订日期]'),
    textComponent('甲方：[甲方]'),
    textComponent('乙方：[乙方]'),
    lineComponent(),
    textComponent('鉴于甲乙双方在合作过程中可能接触到对方的商业秘密，为保护双方合法权益，经协商一致，签订本保密协议。'),
    textComponent('一、保密信息范围：[保密信息范围]'),
    textComponent('二、保密义务：[保密义务]'),
    textComponent('三、保密期限：[保密期限]'),
    textComponent('四、违约责任：[违约责任]'),
    textComponent('五、争议解决：[争议解决]'),
    lineComponent(),
    textComponent('甲方（盖章）：    乙方（盖章）：'),
    textComponent('代表签字：    代表签字：'),
  ]);
}
