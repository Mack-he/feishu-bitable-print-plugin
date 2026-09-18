import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function onboardingTemplate() {
  return buildTemplate([
    titleComponent('员工入职登记表'),
    textComponent('登记日期：[登记日期]'),
    tableComponent([
      ['姓名', '[姓名]', '性别', '[性别]', '年龄', '[年龄]'],
      ['学历', '[学历]', '专业', '[专业]', '毕业院校', '[毕业院校]'],
      ['身份证号', '[身份证号]', '', '', '联系电话', '[联系电话]'],
      ['家庭住址', '[家庭住址]', '', '', '', ''],
      ['紧急联系人', '[紧急联系人]', '关系', '[关系]', '电话', '[电话]'],
      ['入职部门', '[入职部门]', '职位', '[职位]', '入职日期', '[入职日期]'],
      ['试用期', '[试用期]', '转正日期', '[转正日期]', '薪资', '[薪资]'],
    ], [80, 100, 80, 80, 80, 100]),
    textComponent('工作经历：[工作经历]'),
    textComponent('家庭成员：[家庭成员]'),
    lineComponent(),
    textComponent('员工签字：    人事确认：    部门负责人：'),
  ]);
}
