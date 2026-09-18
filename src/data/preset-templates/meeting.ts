import { titleComponent, textComponent, tableComponent, lineComponent, buildTemplate } from './_helpers';

export default function meetingTemplate() {
  return buildTemplate([
    titleComponent('会议纪要'),
    textComponent('会议主题：[会议主题]'),
    textComponent('会议时间：[会议时间]    会议地点：[会议地点]'),
    textComponent('主持人：[主持人]    记录人：[记录人]'),
    textComponent('参会人员：[参会人员]'),
    lineComponent(),
    textComponent('一、会议内容'),
    textComponent('[会议内容]'),
    textComponent('二、决议事项'),
    tableComponent([
      ['序号', '决议内容', '负责人', '完成时间'],
      ['1', '[决议内容]', '[负责人]', '[完成时间]'],
      ['2', '', '', ''],
      ['3', '', '', ''],
    ], [50, 280, 100, 100]),
    lineComponent(),
    textComponent('记录人签字：    主持人签字：'),
  ]);
}
