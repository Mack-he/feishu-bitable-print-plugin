// 变量组件系统入口
export { AttachmentVariable, AttachmentVariablePreview } from './AttachmentVariable';
export type { AttachmentVariableConfig } from './AttachmentVariable';

export { AttachmentVariableTag } from './AttachmentVariableTag';

export { TextVariableTag } from './TextVariableTag';

export { InsertAttachmentDialog } from './InsertAttachmentDialog';

export { 
  VariableRenderer, 
  detectFieldType, 
  isAttachmentConfig,
  type VariableConfig,
  type BaseVariableConfig,
  type VariableType 
} from './VariableRenderer';

export { 
  MixedContentRenderer, 
  extractVariables, 
  hasAttachmentVariable 
} from './MixedContentRenderer';
export type { ContentSegment, FieldTypeMap, FieldIdMap } from './MixedContentRenderer';
