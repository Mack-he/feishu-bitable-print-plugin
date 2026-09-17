// 排版打印插件核心类型定义 (v15.0 垂直流式布局)

// 飞书上下文类型
export interface FeishuAppMetadata {
  appId: string;
  name: string;
  defaultTableId: string;
  description?: string;
}

export interface FeishuContext {
  appToken: string;
  targetTableId: string;
  fieldNameToIdMap: Record<string, string>;
  firstRecordData: Record<string, unknown> | null;
  appMetadata: FeishuAppMetadata | null;
}

// ========== v15.0 更新：流式布局组件节点 ==========

// 组件边框样式
export interface ComponentBorderStyle {
  show: boolean;
  color: string;
  width: number;
}

// 文本样式
export interface ComponentTextStyle {
  fontSize: number;
  color: string;
  bold: boolean;
  italic?: boolean;
  underline?: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  backgroundColor?: string;
  border?: ComponentBorderStyle;
  lineHeight?: number;
  paragraphSpacing?: number;
  // 新增富文本属性
  linkUrl?: string;
  headingLevel?: 1 | 2 | null; // 标题级别
  listType?: 'ordered' | 'unordered' | null; // 列表类型
  textDecoration?: 'none' | 'underline' | 'line-through'; // 文本装饰
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'; // 文本转换
}

// 表格单元格边框样式
export interface TableCellBorderStyle {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
  width?: number;
  color?: string;
}

// 表格单元格数据
export interface TableCellData {
  id: string;
  content: string;
  rowSpan?: number;
  colSpan?: number;
  backgroundColor?: string;
  style?: Partial<ComponentTextStyle>;
  border?: TableCellBorderStyle;
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

// 表格配置
export interface TableConfig {
  headerRows: number;
  footerRows: number;
  borderColor: string;
  borderWidth: number;
  showOuterBorder: boolean;
  showInnerBorder: boolean;
  cells: TableCellData[][];
}

// 网格布局配置
export interface ComponentLayout {
  width: '100%' | '50%' | '33%' | '25%'; // 网格宽度占比
  columnSpan?: number; // 可选：跨列数（12列网格系统）
}

// 画布组件节点（网格布局 - v17.0）
export interface BaseCanvasNode {
  id: string;
  type: 'text' | 'heading' | 'paragraph' | 'list' | 'table' | 'image' | 'barcode' | 'qrcode' | 'line' | 'fieldContainer';
  width: number; // 保留兼容性
  height?: number;
  minHeight?: number;
  // 新增：网格布局属性
  layout?: ComponentLayout;
}

// 文本组件节点
export interface TextCanvasNode extends BaseCanvasNode {
  type: 'text';
  content: string;
  textStyle: ComponentTextStyle;
}

// 标题组件节点（H1-H6）
export interface HeadingCanvasNode extends BaseCanvasNode {
  type: 'heading';
  content: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  textStyle: ComponentTextStyle;
}

// 段落组件节点（支持首行缩进）
export interface ParagraphCanvasNode extends BaseCanvasNode {
  type: 'paragraph';
  content: string;
  indent: number; // 首行缩进（字符数）
  textStyle: ComponentTextStyle;
}

// 列表组件节点（有序/无序）
export interface ListCanvasNode extends BaseCanvasNode {
  type: 'list';
  items: string[];
  listType: 'ordered' | 'unordered';
  textStyle: ComponentTextStyle;
}

// 表格组件节点
export interface TableCanvasNode extends BaseCanvasNode {
  type: 'table';
  tableConfig: TableConfig;
}

// 图片组件节点
export interface ImageCanvasNode extends BaseCanvasNode {
  type: 'image';
  src: string;
  alt?: string;
  fit: 'contain' | 'cover' | 'fill';
  aspectRatio?: number;
}

// 条形码组件节点
export interface BarcodeCanvasNode extends BaseCanvasNode {
  type: 'barcode';
  content: string;
  format: string;
}

// 二维码组件节点
export interface QRCodeCanvasNode extends BaseCanvasNode {
  type: 'qrcode';
  content: string;
  size: number;
}

// 线条组件节点
export interface LineCanvasNode extends BaseCanvasNode {
  type: 'line';
  color: string;
  thickness: number;
  style: 'solid' | 'dashed' | 'dotted';
}

// 字段容器组件节点 - 根据字段是否有值决定是否显示
export interface FieldContainerCanvasNode extends BaseCanvasNode {
  type: 'fieldContainer';
  // 绑定的字段名列表
  fieldNames: string[];
  // 容器内的子组件
  children: CanvasComponentNode[];
  // 显示条件：'any' 任意字段有值显示 | 'all' 所有字段有值才显示
  showCondition?: 'any' | 'all';
}

// 画布组件节点联合类型
export type CanvasComponentNode = 
  | TextCanvasNode 
  | HeadingCanvasNode
  | ParagraphCanvasNode
  | ListCanvasNode
  | TableCanvasNode 
  | ImageCanvasNode 
  | BarcodeCanvasNode 
  | QRCodeCanvasNode 
  | LineCanvasNode
  | FieldContainerCanvasNode;

// 画布状态（流式布局）
export interface CanvasState {
  components: CanvasComponentNode[];
  selectedId: string | null;
}

// ========== 原有类型保持兼容，但简化 ==========

// 组件类型枚举
export type ComponentType = 
  | 'text'       // 文本组件
  | 'heading'    // 标题组件（H1-H6）
  | 'paragraph'  // 段落组件（支持首行缩进）
  | 'list'       // 列表组件（有序/无序）
  | 'table'      // 表格组件
  | 'image'      // 图片组件
  | 'qrcode'     // 二维码
  | 'barcode'    // 条形码
  | 'line'       // 水平线
  | 'freeElement' // 自由拖动元素（保留兼容）
  | 'article'    // 文章区块
  | 'autoTable'  // 自动表格
  | 'fieldContainer'; // 字段容器组件

// 字段类型
export interface Field {
  id: string;
  name: string;
  type: string;
  placeholder: string;
  isSystem?: boolean;
  // 【新增】字段种类：在获取字段时就确定，避免后续误判
  fieldKind?: 'attachment' | 'person' | 'text' | 'number' | 'date' | 'other';
}

// 【新增】字段类型映射（字段名 -> 字段种类）
export type FieldTypeMap = Record<string, 'attachment' | 'person' | 'text' | 'number' | 'date' | 'other'>;

// 组件基础属性（简化版 - 无x,y,zIndex）
export interface BaseComponentProps {
  id: string;
  type: ComponentType;
  width: number;
  height: number;
}

// 文本组件
export interface TextComponent extends BaseComponentProps {
  type: 'text';
  content: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
}

// 表格组件 UI 状态
export interface TableUIState {
  isHovered: boolean;
  isSelected: boolean;
  isEditing: boolean;
  selectedCells: string[];
}

// 表格组件配置
export interface TableConfig {
  headerRows: number;
  footerRows: number;
  borderColor: string;
  borderWidth: number;
  showOuterBorder: boolean;
  showInnerBorder: boolean;
}

// 表格组件
export interface TableComponent extends BaseComponentProps {
  type: 'table';
  content?: any;
  columns: {
    fieldId: string;
    fieldName: string;
    width: number;
  }[];
  showHeader: boolean;
  headerStyle: {
    backgroundColor: string;
    fontWeight: 'normal' | 'bold';
  };
  config?: Partial<TableConfig>;
  uiState?: Partial<TableUIState>;
}

// 图片组件
export interface ImageComponent extends BaseComponentProps {
  type: 'image';
  src: string;
  alt: string;
  fit: 'contain' | 'cover' | 'fill';
}

// 二维码组件
export interface QRCodeComponent extends BaseComponentProps {
  type: 'qrcode';
  content: string;
  size: number;
}

// 条形码组件
export interface BarcodeComponent extends BaseComponentProps {
  type: 'barcode';
  content: string;
  format: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC';
  width: number;
  height: number;
}

// 水平线组件
export interface LineComponent extends BaseComponentProps {
  type: 'line';
  color: string;
  thickness: number;
  style: 'solid' | 'dashed' | 'dotted';
}

// 自动表格组件
export interface AutoTableComponent extends BaseComponentProps {
  type: 'autoTable';
  viewId?: string;
  selectedFields: string[];
  showHeader: boolean;
  headerStyle: {
    backgroundColor: string;
    fontWeight: 'normal' | 'bold';
  };
}

// 自由拖动元素组件
export interface FreeElementComponent extends BaseComponentProps {
  type: 'freeElement';
  content?: string;
}

// 文章区块组件
export interface ArticleComponent extends BaseComponentProps {
  type: 'article';
  content: string;
}

// 组件联合类型
export type EditorComponent = 
  | TextComponent 
  | TableComponent 
  | ImageComponent 
  | QRCodeComponent 
  | BarcodeComponent 
  | LineComponent 
  | AutoTableComponent
  | FreeElementComponent
  | ArticleComponent;

// 页面设置
export interface PageConfig {
  size: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Custom';
  orientation: 'portrait' | 'landscape';
  customWidth?: number;
  customHeight?: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  continuous: boolean;
}

// 全局样式设置
export interface StyleConfig {
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  fontFamily: string;
}

// 排版模板
export interface PrintTemplate {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: string;
  tags: string[];
  components: (EditorComponent | CanvasComponentNode)[];
  pageConfig: PageConfig;
  styleConfig: StyleConfig;
  // 【新增】附件变量配置（按字段名存储）
  // 使用与 AttachmentVariableConfig 兼容的类型定义
  attachmentConfigs?: Record<string, {
    fieldName: string;
    displayMode: 'image_only' | 'basic_info' | 'advanced';
    sizeMode: 'auto' | 'fixed_width' | 'fixed_height' | 'fixed_size';
    width?: number;
    height?: number;
    onePerLine: boolean;
    align: 'left' | 'center' | 'right';
    emptyDisplay: 'default' | 'custom';
    emptyCustomText?: string;
  }>;
  createdAt: number;
  updatedAt: number;
}

// 预设模板
export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  format: 'DOCX' | 'PDF' | 'EXCEL';
  isPremium?: boolean;
}

// 打印记录
export interface PrintRecord {
  id: string;
  templateId: string;
  recordIds: string[];
  createdAt: number;
  status: 'pending' | 'completed' | 'failed';
}

// 页面尺寸常量 (单位: mm)
export const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 },
};

// 默认组件尺寸（流式布局版本）
export const DEFAULT_COMPONENT_SIZES: Record<ComponentType, { width: number; height: number }> = {
  text: { width: 100, height: 60 }, // 100% 宽度
  heading: { width: 100, height: 60 },
  paragraph: { width: 100, height: 80 },
  list: { width: 100, height: 100 },
  table: { width: 100, height: 200 },
  image: { width: 100, height: 150 },
  qrcode: { width: 100, height: 80 },
  barcode: { width: 100, height: 50 },
  line: { width: 100, height: 2 },
  freeElement: { width: 100, height: 100 },
  article: { width: 100, height: 150 },
  autoTable: { width: 100, height: 200 },
  fieldContainer: { width: 100, height: 60 }, // 字段容器
};

// 默认页面配置
export const DEFAULT_PAGE_CONFIG: PageConfig = {
  size: 'A4',
  orientation: 'portrait',
  margins: {
    top: 20,
    bottom: 20,
    left: 20,
    right: 20,
  },
  continuous: false,
};

// 默认样式配置
export const DEFAULT_STYLE_CONFIG: StyleConfig = {
  fontSize: 12,
  lineHeight: 1.5,
  paragraphSpacing: 6,
  fontFamily: 'system-ui, -apple-system, sans-serif',
};
