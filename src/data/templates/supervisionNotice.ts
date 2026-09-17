/**
 * 监理通知单模板配置
 * 适用于工程安全隐患整改通知、质量问题整改等场景
 */
export const supervisionNoticeTemplate = {
  id: 'template-supervision-notice',
  name: '监理通知单（安全）',
  description: '适用于工程安全隐患整改通知、质量问题整改等场景',
  category: '工程监理',
  format: 'DOCX',
  pageConfig: {
    size: 'A4',
    orientation: 'portrait',
    margins: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
    },
  },
  style: {
    fontFamily: '"SimSun", "宋体", serif',
    fontSize: 14,
    lineHeight: 1.6,
    color: '#000',
  },
  elements: [
    {
      id: 'title',
      type: 'text',
      content: '监 理 通 知 单（安 全）',
      style: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: 2,
        marginBottom: 30,
      },
    },
    {
      id: 'header-row',
      type: 'row',
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 20,
        fontSize: 14,
      },
      children: [
        {
          id: 'project-name',
          type: 'text',
          content: '工程名称：[工程名称]',
          style: { fontSize: 14 },
        },
        {
          id: 'doc-number',
          type: 'text',
          content: '编号：[编号]',
          style: { fontSize: 14, textAlign: 'right' },
        },
      ],
    },
    {
      id: 'main-content',
      type: 'container',
      style: {
        border: '2px solid #000',
        padding: 20,
        marginBottom: 30,
        minHeight: 400,
      },
      children: [
        {
          id: 'recipient',
          type: 'text',
          content: '致：[施工单位名称]（项目经理部）',
          style: { fontWeight: 'bold', marginBottom: 15 },
        },
        {
          id: 'subject',
          type: 'text',
          content: '事由：[整改事由]；',
          style: { fontWeight: 'bold', marginBottom: 15 },
        },
        {
          id: 'content-label',
          type: 'text',
          content: '内容：',
          style: { fontWeight: 'bold', marginBottom: 15 },
        },
        {
          id: 'content-body',
          type: 'paragraph',
          content: '[详细整改内容描述，包括问题发现时间、具体隐患情况、风险评估、整改要求等]',
          style: { 
            marginBottom: 15, 
            textIndent: '2em',
            textAlign: 'justify',
          },
        },
        {
          id: 'content-requirement',
          type: 'paragraph',
          content: '[具体整改措施和要求]',
          style: { 
            textIndent: '2em',
            textAlign: 'justify',
          },
        },
      ],
    },
    {
      id: 'signature-area',
      type: 'container',
      style: {
        textAlign: 'right',
        marginTop: 50,
        lineHeight: 2.5,
      },
      children: [
        {
          id: 'signature-stamp',
          type: 'text',
          content: '项目监理机构（盖章）',
          style: { marginBottom: 10 },
        },
        {
          id: 'signature-engineer',
          type: 'text',
          content: '总/专业监理工程师（签字）：',
          style: { marginBottom: 10 },
        },
        {
          id: 'signature-date',
          type: 'text',
          content: '年    月    日',
        },
      ],
    },
    {
      id: 'footer-note',
      type: 'text',
      content: '注：本表一式三份，项目监理机构、建设单位、施工单位各一份。',
      style: {
        position: 'absolute',
        bottom: '15mm',
        left: '20mm',
        right: '20mm',
        fontSize: 12,
        color: '#666',
        borderTop: '1px dashed #ccc',
        paddingTop: 10,
      },
    },
  ],
  // 数据字段映射
  dataFields: [
    { id: 'projectName', name: '工程名称', placeholder: '[工程名称]' },
    { id: 'docNumber', name: '编号', placeholder: '[编号]' },
    { id: 'recipient', name: '致送单位', placeholder: '[施工单位名称]' },
    { id: 'subject', name: '事由', placeholder: '[整改事由]' },
    { id: 'contentBody', name: '内容正文', placeholder: '[详细整改内容描述]' },
    { id: 'requirement', name: '整改要求', placeholder: '[具体整改措施和要求]' },
    { id: 'engineerName', name: '监理工程师', placeholder: '[工程师姓名]' },
    { id: 'signDate', name: '签发日期', placeholder: '[日期]' },
  ],
};

/**
 * 监理通知单模板 - 简版配置
 * 适用于快速生成标准化通知单
 */
export const supervisionNoticeSimpleTemplate = {
  id: 'template-supervision-notice-simple',
  name: '监理通知单（简版）',
  description: '简化的监理通知单，适用于一般性整改通知',
  category: '工程监理',
  format: 'DOCX',
  pageConfig: {
    size: 'A4',
    orientation: 'portrait',
    margins: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
    },
  },
  elements: [
    {
      id: 'title',
      type: 'text',
      content: '监理通知单',
      style: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 25,
      },
    },
    {
      id: 'basic-info',
      type: 'table',
      style: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: 20,
      },
      rows: [
        [
          { content: '工程名称', width: '20%', style: { fontWeight: 'bold', border: '1px solid #000', padding: 8 } },
          { content: '[工程名称]', width: '50%', style: { border: '1px solid #000', padding: 8 } },
          { content: '编号', width: '10%', style: { fontWeight: 'bold', border: '1px solid #000', padding: 8 } },
          { content: '[编号]', width: '20%', style: { border: '1px solid #000', padding: 8 } },
        ],
        [
          { content: '致送单位', style: { fontWeight: 'bold', border: '1px solid #000', padding: 8 } },
          { content: '[施工单位名称]', colSpan: 3, style: { border: '1px solid #000', padding: 8 } },
        ],
        [
          { content: '事由', style: { fontWeight: 'bold', border: '1px solid #000', padding: 8 } },
          { content: '[整改事由]', colSpan: 3, style: { border: '1px solid #000', padding: 8 } },
        ],
      ],
    },
    {
      id: 'content-area',
      type: 'container',
      style: {
        border: '1px solid #000',
        padding: 15,
        minHeight: 300,
        marginBottom: 20,
      },
      children: [
        {
          id: 'content-label',
          type: 'text',
          content: '内容：',
          style: { fontWeight: 'bold', marginBottom: 10 },
        },
        {
          id: 'content-body',
          type: 'paragraph',
          content: '[整改内容详细描述]',
          style: { textIndent: '2em', lineHeight: 1.8 },
        },
      ],
    },
    {
      id: 'signature-table',
      type: 'table',
      style: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: 30,
      },
      rows: [
        [
          { content: '项目监理机构（盖章）', width: '50%', style: { border: '1px solid #000', padding: 15, textAlign: 'center', height: 60 } },
          { content: '签收人', width: '25%', style: { border: '1px solid #000', padding: 8, textAlign: 'center' } },
          { content: '', width: '25%', style: { border: '1px solid #000', padding: 8 } },
        ],
        [
          { content: '总/专业监理工程师（签字）：', style: { border: '1px solid #000', padding: 8 } },
          { content: '日期', style: { border: '1px solid #000', padding: 8, textAlign: 'center' } },
          { content: '', style: { border: '1px solid #000', padding: 8 } },
        ],
      ],
    },
  ],
};

export default supervisionNoticeTemplate;
