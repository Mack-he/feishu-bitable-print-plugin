import { PresetTemplate } from '@/types/editor';

// 预设模板列表
export const presetTemplates: PresetTemplate[] = [
  // 进销存
  {
    id: 'template-quote',
    name: '报价单',
    description: '适用于商品报价、服务报价等场景',
    thumbnail: '/templates/quote.png',
    category: '进销存',
    format: 'DOCX',
  },
  {
    id: 'template-order',
    name: '订购单',
    description: '适用于商品订购、采购订单等场景',
    thumbnail: '/templates/order.png',
    category: '进销存',
    format: 'DOCX',
  },
  {
    id: 'template-invoice',
    name: '发货单',
    description: '适用于商品发货、物流单据等场景',
    thumbnail: '/templates/invoice.png',
    category: '进销存',
    format: 'DOCX',
  },
  
  // 生产
  {
    id: 'template-inspection',
    name: '巡检记录表',
    description: '适用于生产巡检、安全检查等场景',
    thumbnail: '/templates/inspection.png',
    category: '生产',
    format: 'DOCX',
  },
  {
    id: 'template-work-order',
    name: '工单',
    description: '适用于维修工单、服务工单等场景',
    thumbnail: '/templates/work-order.png',
    category: '生产',
    format: 'DOCX',
  },
  
  // 财务
  {
    id: 'template-reimbursement',
    name: '报销单',
    description: '适用于费用报销、差旅报销等场景',
    thumbnail: '/templates/reimbursement.png',
    category: '财务',
    format: 'DOCX',
  },
  {
    id: 'template-payment',
    name: '付款申请单',
    description: '适用于付款审批、资金申请等场景',
    thumbnail: '/templates/payment.png',
    category: '财务',
    format: 'DOCX',
  },
  
  // 行政
  {
    id: 'template-leave',
    name: '请假申请单',
    description: '适用于员工请假、休假申请等场景',
    thumbnail: '/templates/leave.png',
    category: '行政',
    format: 'DOCX',
  },
  {
    id: 'template-meeting',
    name: '会议纪要',
    description: '适用于会议记录、决议跟踪等场景',
    thumbnail: '/templates/meeting.png',
    category: '行政',
    format: 'DOCX',
  },
  
  // 合同协议
  {
    id: 'template-contract',
    name: '购销合同',
    description: '适用于商品买卖、服务合同等场景',
    thumbnail: '/templates/contract.png',
    category: '合同协议',
    format: 'DOCX',
    isPremium: true,
  },
  {
    id: 'template-nda',
    name: '保密协议',
    description: '适用于保密协议、NDA等场景',
    thumbnail: '/templates/nda.png',
    category: '合同协议',
    format: 'DOCX',
    isPremium: true,
  },
  
  // 人事
  {
    id: 'template-resume',
    name: '员工信息表',
    description: '适用于员工档案、人员管理等场景',
    thumbnail: '/templates/resume.png',
    category: '人事',
    format: 'DOCX',
  },
  {
    id: 'template-onboarding',
    name: '入职登记表',
    description: '适用于新员工入职、档案建立等场景',
    thumbnail: '/templates/onboarding.png',
    category: '人事',
    format: 'DOCX',
  },
  
  // 销售
  {
    id: 'template-sales-report',
    name: '销售日报',
    description: '适用于销售数据汇报、业绩追踪等场景',
    thumbnail: '/templates/sales-report.png',
    category: '销售',
    format: 'DOCX',
  },
  {
    id: 'template-visit',
    name: '客户拜访记录',
    description: '适用于客户拜访、商机跟进等场景',
    thumbnail: '/templates/visit.png',
    category: '销售',
    format: 'DOCX',
  },
  
  // 申请表
  {
    id: 'template-application',
    name: '通用申请表',
    description: '适用于各类申请、审批等场景',
    thumbnail: '/templates/application.png',
    category: '申请表/申请书',
    format: 'DOCX',
  },
  
  // 工程监理
  {
    id: 'template-supervision-notice',
    name: '监理通知单',
    description: '适用于工程安全隐患整改通知、质量问题整改等场景',
    thumbnail: '/templates/supervision-notice.png',
    category: '工程监理',
    format: 'DOCX',
  },
  {
    id: 'template-supervision-inspection',
    name: '监理巡查记录',
    description: '适用于日常监理巡查、施工质量检查等场景',
    thumbnail: '/templates/supervision-inspection.png',
    category: '工程监理',
    format: 'DOCX',
  },
];

// 模板分类
export const templateCategories = [
  { id: 'all', name: '全部' },
  { id: 'jxc', name: '进销存' },
  { id: 'production', name: '生产' },
  { id: 'finance', name: '财务' },
  { id: 'admin', name: '行政' },
  { id: 'ecommerce', name: '电商' },
  { id: 'sales', name: '销售' },
  { id: 'hr', name: '人事' },
  { id: 'contract', name: '合同协议' },
  { id: 'media', name: '新媒体' },
  { id: 'application', name: '申请表/申请书' },
  { id: 'supply', name: '供应链' },
  { id: 'engineering', name: '工程监理' },
];
