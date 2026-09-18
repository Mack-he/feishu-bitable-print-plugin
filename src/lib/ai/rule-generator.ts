// 本地规则生成器
//
// 未配置大模型、或大模型调用失败时使用：不依赖网络，按关键词 + 表格字段拼出
// 一个能直接用的模板，保证「AI 生成」按钮任何时候都有结果。

import { AiGenerateRequest, AiFieldBrief, sanitizeText } from './template-spec';

type RuleTemplateKind = 'form' | 'document' | 'card';

const FORM_KEYWORDS = ['登记', '申请', '签到', '记录', '检查', '巡查', '验收', '审批', '报销', '请假', '通知单', '单据', '明细', '台账', '报表', '清单', '表'];
const DOCUMENT_KEYWORDS = ['合同', '协议', '纪要', '声明', '承诺', '说明书', '须知', '制度'];
const CARD_KEYWORDS = ['证', '标签', '卡片', '挂牌', '合格证'];

const LAYOUT_TABLE_COLUMNS: Record<string, 2 | 4> = {
  single: 2,
  'header-content': 2,
  'form-style': 4,
  'card-style': 2,
  'table-style': 4,
};

function pickKind(request: AiGenerateRequest): RuleTemplateKind {
  const text = `${request.prompt || ''} ${request.layoutId || ''}`;
  if (request.layoutId === 'card-style' || request.layoutId === 'table-style' || request.layoutId === 'form-style') {
    return request.layoutId === 'card-style' ? 'card' : 'form';
  }
  if (CARD_KEYWORDS.some((word) => text.includes(word))) return 'card';
  if (DOCUMENT_KEYWORDS.some((word) => text.includes(word))) return 'document';
  if (FORM_KEYWORDS.some((word) => text.includes(word))) return 'form';
  return 'form';
}

function deriveName(request: AiGenerateRequest, kind: RuleTemplateKind): string {
  let candidate = sanitizeText(request.prompt, 60)
    .split(/[，,。；;\n]/)[0]
    .replace(/^(请|帮我|帮忙|我要|我想|需要)?(创建|制作|设计|生成|做|建)(一个|一张|一份|个)?/, '')
    .replace(/(的)?(模板|排版|表格|表单)$/, '')
    .replace(/[，,。；;：:\s]/g, '')
    .trim();

  if (candidate.length > 20) candidate = candidate.slice(0, 20);
  if (!candidate) {
    candidate = kind === 'document' ? '文档模板' : kind === 'card' ? '卡片模板' : '单据模板';
  }
  return candidate;
}

function usableFields(fields: AiFieldBrief[] | undefined, limit: number): AiFieldBrief[] {
  const list = (fields || []).filter((field) => field?.name && field.name !== '表格名');
  return list.slice(0, limit);
}

function buildFieldTable(fields: AiFieldBrief[], columns: 2 | 4) {
  const cells: { content: string }[][] = [];
  const colWidths = columns === 4 ? [90, 200, 90, 200] : [110, 380];

  for (let i = 0; i < fields.length; i += columns) {
    const row: { content: string }[] = [];
    for (let c = 0; c < columns; c += 1) {
      const field = fields[i + c];
      if (field) {
        row.push({ content: field.name });
        row.push({ content: `[${field.name}]` });
      } else {
        // 补齐单元格保持表格规则
        for (let k = 0; k < columns / 2; k += 1) row.push({ content: '' });
      }
    }
    cells.push(row);
  }

  return {
    tableConfig: {
      cells,
      colWidths,
      borderWidth: 1,
      borderColor: '#000000',
      showOuterBorder: true,
      showInnerBorder: true,
    },
  };
}

function buildSignatureRow() {
  return {
    tableConfig: {
      cells: [
        [{ content: '经办人签字' }, { content: '' }, { content: '日期' }, { content: '' }],
      ],
      colWidths: [110, 200, 60, 210],
      borderWidth: 1,
      borderColor: '#000000',
      showOuterBorder: true,
      showInnerBorder: true,
    },
  };
}

/** 生成模板（返回未规范化的原始结构，交给 normalizeGeneratedTemplate 收敛） */
export function generateTemplateByRules(request: AiGenerateRequest) {
  const kind = pickKind(request);
  const fields = usableFields(request.fields, 16);
  const name = deriveName(request, kind);
  const description = sanitizeText(request.prompt, 60) || '按当前表格字段生成的基础模板';
  const components: any[] = [];

  components.push({
    type: 'heading',
    level: 1,
    content: name,
    textStyle: { fontSize: 22, bold: true, align: 'center', paragraphSpacing: 14 },
  });

  if (kind === 'document') {
    components.push({
      type: 'text',
      content: `编号：[编号]        签订日期：[日期]`,
      textStyle: { fontSize: 12, align: 'right', paragraphSpacing: 10 },
    });
    components.push({
      type: 'paragraph',
      indent: 0,
      content: `${sanitizeText(request.prompt, 300) || '为明确双方权利义务，经协商一致，订立本文件。'}`,
      textStyle: { fontSize: 14, align: 'justify', lineHeight: 1.8, paragraphSpacing: 10 },
    });
    components.push({ type: 'line' });
    components.push({
      type: 'paragraph',
      indent: 0,
      content: '一、基本信息',
      textStyle: { fontSize: 14, bold: true, paragraphSpacing: 8 },
    });
    components.push({
      type: 'table',
      ...buildFieldTable(fields.length ? fields : [{ name: '名称' }, { name: '日期' }], 2),
    });
    components.push({ type: 'line' });
    components.push({
      type: 'paragraph',
      indent: 0,
      content: '二、其他约定\n1. 本文件自双方签字盖章之日起生效。\n2. 本文件一式两份，双方各执一份，具有同等效力。',
      textStyle: { fontSize: 14, align: 'justify', lineHeight: 1.8 },
    });
    components.push({
      type: 'table',
      tableConfig: {
        cells: [
          [{ content: '甲方（签章）' }, { content: '' }, { content: '乙方（签章）' }, { content: '' }],
          [{ content: '日期' }, { content: '' }, { content: '日期' }, { content: '' }],
        ],
        colWidths: [110, 200, 110, 240],
        borderWidth: 1,
        borderColor: '#000000',
        showOuterBorder: true,
        showInnerBorder: true,
      },
    });
  } else if (kind === 'card') {
    components.push({
      type: 'table',
      ...buildFieldTable(fields.length ? fields : [{ name: '名称' }, { name: '编号' }], 2),
    });
    components.push({
      type: 'text',
      content: '二维码：[编号]',
      textStyle: { fontSize: 12, align: 'center', paragraphSpacing: 6 },
    });
    components.push({ type: 'qrcode', content: '[编号]', size: 80 });
    components.push({
      type: 'text',
      content: `发证单位：[部门]        发证日期：[日期]`,
      textStyle: { fontSize: 12, align: 'center' },
    });
  } else {
    components.push({
      type: 'text',
      content: `编号：[编号]                                          填表日期：[日期]`,
      textStyle: { fontSize: 12, paragraphSpacing: 8 },
    });
    components.push({
      type: 'table',
      ...buildFieldTable(fields.length ? fields : [{ name: '姓名' }, { name: '部门' }, { name: '日期' }, { name: '备注' }], LAYOUT_TABLE_COLUMNS[request.layoutId || ''] || 4),
    });
    components.push({
      type: 'paragraph',
      indent: 0,
      content: `${sanitizeText(request.prompt, 200) || '事由说明：'}：[备注]`,
      textStyle: { fontSize: 13, lineHeight: 1.7, paragraphSpacing: 10 },
    });
    components.push({ type: 'line' });
    components.push({ type: 'table', ...buildSignatureRow() });
  }

  return { name, description, components };
}