// 多维表格数据类型定义

export interface BitableField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multiSelect' | 'date' | 'person' | 'checkbox' | 'url' | 'email';
  options?: string[]; // 用于 select 和 multiSelect
  isPrimary?: boolean;
}

export interface BitableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
  lastModifiedTime: string;
}

export interface BitableView {
  id: string;
  name: string;
  type: 'grid' | 'kanban' | 'calendar' | 'gallery' | 'timeline' | 'gantt';
  fieldConfig: {
    titleField?: string;
    statusField?: string;
    dateField?: string;
    assigneeField?: string;
    groupByField?: string;
  };
  sortBy?: {
    fieldId: string;
    desc?: boolean;
  };
  filterBy?: {
    fieldId: string;
    value: any;
  }[];
}

export interface BitableData {
  id: string;
  name: string;
  fields: BitableField[];
  records: BitableRecord[];
  views: BitableView[];
}

export interface ViewType {
  id: string;
  name: string;
  icon: string;
  description: string;
}
