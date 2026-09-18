// 预置模板索引 - 使用动态导入按需加载
// 每个模板单独一个文件，只有点击时才加载对应文件

const templateLoaders: Record<string, () => Promise<{ default: () => any }>> = {
  // 进销存
  'template-quote': () => import('./quote'),
  'template-order': () => import('./order'),
  'template-invoice': () => import('./invoice'),
  // 生产
  'template-inspection': () => import('./inspection'),
  'template-work-order': () => import('./work-order'),
  // 财务
  'template-reimbursement': () => import('./reimbursement'),
  'template-payment': () => import('./payment'),
  // 行政
  'template-leave': () => import('./leave'),
  'template-meeting': () => import('./meeting'),
  // 合同协议
  'template-contract': () => import('./contract'),
  'template-nda': () => import('./nda'),
  // 人事
  'template-resume': () => import('./resume'),
  'template-onboarding': () => import('./onboarding'),
  // 销售
  'template-sales-report': () => import('./sales-report'),
  'template-visit': () => import('./visit'),
  // 申请表
  'template-application': () => import('./application'),
  // 工程监理
  'template-supervision-notice': () => import('./supervision-notice'),
  'template-supervision-inspection': () => import('./supervision-inspection'),
};

const defaultPageConfig = {
  size: 'A4',
  orientation: 'portrait' as const,
  margins: { top: 20, bottom: 20, left: 20, right: 20 },
  continuous: false,
};

/**
 * 按需加载预置模板数据
 * 只有用户点击某个模板时，才会动态导入对应的模板文件
 */
export async function getPresetTemplateData(templateId: string): Promise<any> {
  const loader = templateLoaders[templateId];
  if (!loader) {
    return { components: [], pageConfig: defaultPageConfig };
  }
  try {
    const module = await loader();
    return module.default();
  } catch (error) {
    console.error(`[PresetTemplate] 加载模板 ${templateId} 失败:`, error);
    return { components: [], pageConfig: defaultPageConfig };
  }
}
