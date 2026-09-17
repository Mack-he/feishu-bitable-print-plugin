// 打印配置类型定义

export interface PrintFieldMapping {
  fieldId: string;          // 飞书字段 ID
  fieldName: string;        // 字段名称
  fieldType: string;        // 字段类型
  displayName?: string;     // 显示名称（自定义）
  include: boolean;         // 是否包含在打印中
  order: number;            // 排序
}

export interface PrintTemplate {
  id: string;
  name: string;
  description: string;
  type: 'card' | 'list' | 'table' | 'label' | 'custom';
  layout: {
    columns: number;        // 每行卡片数
    paperSize: 'A4' | 'A5' | 'Letter' | 'Custom';
    orientation: 'portrait' | 'landscape';
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  style: {
    fontSize: number;
    fontFamily: string;
    showBorder: boolean;
    showHeader: boolean;
    showFooter: boolean;
    headerText?: string;
    footerText?: string;
  };
  fieldMappings: PrintFieldMapping[];
}

export interface PrintConfig {
  template: PrintTemplate;
  selectedRecords: string[];
  options: {
    includeQRCode: boolean;
    includeBarcode: boolean;
    qrCodeField?: string;
    barcodeField?: string;
    barcodeFormat: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';
    generateIndex: boolean;
    indexPrefix?: string;
  };
}

// 预设模板
export const PRESET_TEMPLATES: PrintTemplate[] = [
  {
    id: 'card-standard',
    name: '标准卡片',
    description: '适合打印任务卡片，包含标题、状态、负责人等信息',
    type: 'card',
    layout: {
      columns: 2,
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 10, right: 10, bottom: 10, left: 10 }
    },
    style: {
      fontSize: 12,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      showBorder: true,
      showHeader: true,
      showFooter: true,
      headerText: '任务清单',
      footerText: '生成日期：{date}'
    },
    fieldMappings: []
  },
  {
    id: 'card-compact',
    name: '紧凑卡片',
    description: '适合批量打印，每行显示更多卡片',
    type: 'card',
    layout: {
      columns: 3,
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 5, right: 5, bottom: 5, left: 5 }
    },
    style: {
      fontSize: 10,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      showBorder: true,
      showHeader: false,
      showFooter: false
    },
    fieldMappings: []
  },
  {
    id: 'list-simple',
    name: '简洁列表',
    description: '适合打印任务清单，表格形式展示',
    type: 'list',
    layout: {
      columns: 1,
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 10, right: 10, bottom: 10, left: 10 }
    },
    style: {
      fontSize: 11,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      showBorder: false,
      showHeader: true,
      showFooter: true,
      headerText: '任务列表',
      footerText: '共 {count} 条记录'
    },
    fieldMappings: []
  },
  {
    id: 'label',
    name: '标签模式',
    description: '适合打印标签、贴纸等',
    type: 'label',
    layout: {
      columns: 4,
      paperSize: 'A4',
      orientation: 'portrait',
      margins: { top: 5, right: 5, bottom: 5, left: 5 }
    },
    style: {
      fontSize: 9,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      showBorder: true,
      showHeader: false,
      showFooter: false
    },
    fieldMappings: []
  }
];
