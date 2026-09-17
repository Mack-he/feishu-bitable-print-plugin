// 打印相关类型定义

export interface PrintTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'document' | 'label' | 'card' | 'certificate';
  content: PrintTemplateContent;
  settings: PrintSettings;
  createdAt: string;
  updatedAt: string;
}

export interface PrintTemplateContent {
  layout: {
    width: number; // mm
    height: number; // mm
    orientation: 'portrait' | 'landscape';
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
  };
  elements: PrintElement[];
}

export interface PrintElement {
  id: string;
  type: 'text' | 'image' | 'barcode' | 'qrcode' | 'table' | 'line' | 'rectangle';
  position: {
    x: number; // mm
    y: number; // mm
    width?: number; // mm
    height?: number; // mm
  };
  style: {
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    fontFamily?: string;
    alignment?: 'left' | 'center' | 'right';
    borderWidth?: number;
    borderColor?: string;
    backgroundColor?: string;
    color?: string;
  };
  content: {
    text?: string;
    fieldValue?: string; // 从数据字段获取值
    imageUrl?: string;
    barcodeType?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC' | 'ITF14';
    barcodeValue?: string;
    qrcodeValue?: string;
    qrcodeSize?: number;
  };
}

export interface PrintSettings {
  copies: number;
  duplex: 'single' | 'double';
  colorMode: 'color' | 'grayscale';
  pageSize: 'A4' | 'A5' | 'Letter' | 'Custom';
  quality: 'low' | 'medium' | 'high';
  showHeader: boolean;
  showFooter: boolean;
  headerText?: string;
  footerText?: string;
}

export interface PrintJob {
  id: string;
  templateId: string;
  records: string[]; // 记录ID数组
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputFormat: 'pdf' | 'print';
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface PrintPreview {
  template: PrintTemplate;
  recordData: any;
  totalPages: number;
  currentPage: number;
}

export interface BarcodeOptions {
  format: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC' | 'ITF14';
  width: number;
  height: number;
  displayValue: boolean;
  fontSize: number;
  margin: number;
}

export interface QRCodeOptions {
  width: number;
  height: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  margin: number;
}
