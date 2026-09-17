'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// 自适应高度的文本域组件
const AutoResizingTextarea = ({ 
  value, 
  onChange, 
  onClick, 
  onKeyDown,
  onPaste,
  style
}: { 
  value: string;
  onChange: (value: string) => void;
  onClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  style?: React.CSSProperties;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 处理点击事件，确保阻止冒泡
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(e);
  }, [onClick]);

  // 处理键盘事件 - 先阻止冒泡，再调用外部处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    onKeyDown(e);
  }, [onKeyDown]);

  // 处理变化事件
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  // 自动调整高度 - 使用 requestAnimationFrame 避免干扰输入
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      requestAnimationFrame(() => {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.max(textarea.scrollHeight, 24)}px`;
      });
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPaste={onPaste}
      className="w-full border-0 outline-none resize-none overflow-hidden"
      style={{ 
        minHeight: '24px',
        backgroundColor: 'transparent',
        padding: '4px',
        boxSizing: 'border-box',
        lineHeight: '1.5',
        ...style,
      }}
    />
  );
};
import { CanvasComponentNode } from '@/types/editor';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { parseVariables } from '@/utils/variableParser';
import { VariableTextRenderer } from '@/components/VariableTextRenderer';
import { VARIABLE_CHIP_STYLES } from '@/utils/smartVariableRenderer';
import { InsertAttachmentDialog } from '@/components/editor/variables/InsertAttachmentDialog';
import { AttachmentVariableConfig } from '@/components/editor/variables/AttachmentVariable';
import { extractVariables } from '@/utils/variableParser';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { HoverToolbar } from '../table/HoverToolbar';
import { RowActionMenu } from '../table/RowActionMenu';
import { ColumnActionMenu } from '../table/ColumnActionMenu';
import { DocumentComponentRenderer } from './DocumentComponents';

interface CanvasComponentProps {
  component: CanvasComponentNode;
  isSelected: boolean;
  onSelect: () => void;
}

export function CanvasComponent({ component, isSelected, onSelect }: CanvasComponentProps) {
  // 使用选择器订阅状态，确保组件在 records 变化时重新渲染
  const records = useEditorStore(state => state.records);
  const fields = useEditorStore(state => state.fields);
  const fieldTypeMap = useEditorStore(state => state.fieldTypeMap);
  const styleConfig = useEditorStore(state => state.styleConfig);
  const tableEditing = useEditorStore(state => state.tableEditing);
  const setTableEditing = useEditorStore(state => state.setTableEditing);
  const tableCellEditing = useEditorStore(state => state.tableCellEditing);
  const setTableCellEditing = useEditorStore(state => state.setTableCellEditing);
  const updateComponent = useEditorStore(state => state.updateComponent);
  const duplicateComponent = useEditorStore(state => state.duplicateComponent);
  const deleteComponent = useEditorStore(state => state.deleteComponent);
  const selectComponent = useEditorStore(state => state.selectComponent);
  const attachmentConfigs = useEditorStore(state => state.attachmentConfigs);
  const setAttachmentConfig = useEditorStore(state => state.setAttachmentConfig);
  const deleteAttachmentConfig = useEditorStore(state => state.deleteAttachmentConfig);

  // 【调试】监听 records 变化
  useEffect(() => {
    // 【调试】检查 records 的原始结构
    if (records && records.length > 0) {
      console.log('[CanvasComponent] records[0] 原始结构:', {
        type: typeof records[0],
        keys: Object.keys(records[0] as object).slice(0, 10),
        hasId: 'id' in (records[0] as object),
        hasFields: 'fields' in (records[0] as object),
        idValue: (records[0] as any).id,
      });
    }
    
    console.log('[CanvasComponent] records 变化:', {
      recordsCount: records?.length || 0,
      firstRecordId: records?.[0]?.id,
      recordsPreview: records?.slice(0, 2).map(r => ({ id: r.id, _rowIndex: r._rowIndex })),
    });
    
    // 【新增】检查第一条记录是否包含 _html 字段
    if (records && records.length > 0) {
      const firstRecord = records[0] as any;
      const htmlFields = Object.keys(firstRecord).filter(key => key.endsWith('_html'));
      console.log('[CanvasComponent] 第一条记录的 _html 字段:', {
        htmlFields,
        htmlFieldsCount: htmlFields.length,
        allKeysCount: Object.keys(firstRecord).length,
        allKeys: Object.keys(firstRecord).filter(k => k.startsWith('_')),
        sampleHtmlField: htmlFields.length > 0 ? {
          fieldName: htmlFields[0],
          contentPreview: String(firstRecord[htmlFields[0]]).substring(0, 100)
        } : null
      });
    }
  }, [records]);

  // 获取预览用的记录（优先使用第一条记录）- 用于非编辑状态下的变量渲染
  const previewRecord = (() => {
    if (records && records.length > 0) {
      const firstRecord = records[0] as any;
      // 将 BitableRecord 格式转换为普通对象
      const recordData: Record<string, unknown> = {};
      
      // 优先处理直接在记录对象上的字段（飞书SDK返回的格式）
      Object.entries(firstRecord).forEach(([key, value]) => {
        if (key !== 'fields' && key !== 'id' && key !== 'createdTime' && key !== 'lastModifiedTime' && key !== '__tableName__') {
          recordData[key] = value;
        }
      });
      
      // 同时处理 fields 格式（兼容性处理）
      if (firstRecord.fields && typeof firstRecord.fields === 'object') {
        Object.entries(firstRecord.fields as Record<string, unknown>).forEach(([key, value]) => {
          if (recordData[key] === undefined) {
            recordData[key] = value;
          }
        });
      }
      
      // 关键：同时添加字段名到值的映射（支持通过字段名查找）
      if (fields && fields.length > 0) {
        fields.forEach(field => {
          // 优先从直接字段中获取
          let value = recordData[field.id];
          // 如果没有，尝试从 fields 对象中获取
          if (value === undefined && firstRecord.fields) {
            const fieldsObj = firstRecord.fields as Record<string, unknown>;
            value = fieldsObj[field.id];
          }
          if (value !== undefined) {
            recordData[field.name] = value;
          }
        });
      }
      
      // 【调试】检查 previewRecord 是否包含 _html 字段
      const htmlFieldsInPreview = Object.keys(recordData).filter(key => key.endsWith('_html'));
      if (htmlFieldsInPreview.length > 0) {
        console.log('[CanvasComponent] previewRecord 包含 _html 字段:', htmlFieldsInPreview);
        console.log('[CanvasComponent] previewRecord 样例:', {
          fieldName: htmlFieldsInPreview[0],
          contentPreview: String(recordData[htmlFieldsInPreview[0]]).substring(0, 100)
        });
      } else {
        console.warn('[CanvasComponent] ⚠️ previewRecord 不包含任何 _html 字段！');
      }
      
      return recordData;
    }
    return {};
  })();
  
  // 【关键修复】构建用于 VariableTextRenderer 的 records 数组
  // 确保包含字段名到值的映射，使附件和人员字段能正确读取
  const recordsForVariableRenderer = (() => {
    if (records && records.length > 0) {
      // 使用处理后的 previewRecord 作为第一条记录
      return [previewRecord, ...records.slice(1)];
    }
    return records;
  })();
  
  // 添加全局键盘事件监听器来检测事件是否逃逸
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 如果这里能捕获到 Enter 或 Backspace，说明事件逃逸了！
      if (e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete') {
        // 事件逃逸检测
      }
    };
    
    const handleGlobalKeyUp = (_e: KeyboardEvent) => {
      // 事件处理
    };
    
    const handleGlobalKeyPress = (_e: KeyboardEvent) => {
      // 事件处理
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown, true); // 捕获阶段监听
    document.addEventListener('keyup', handleGlobalKeyUp, true);
    document.addEventListener('keypress', handleGlobalKeyPress, true);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
      document.removeEventListener('keyup', handleGlobalKeyUp, true);
      document.removeEventListener('keypress', handleGlobalKeyPress, true);
    };
  }, [component.id]);
  
  // 通用状态
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 附件变量弹窗状态
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [attachmentDialogField, setAttachmentDialogField] = useState<string>('');
  const [attachmentDialogConfig, setAttachmentDialogConfig] = useState<AttachmentVariableConfig | undefined>(undefined);
  const [editingVariable, setEditingVariable] = useState<string | null>(null);
  
  // 【新增】计算附件预览数据（用于弹窗预览）
  const attachmentPreviewData = useMemo(() => {
    if (!attachmentDialogField || !records || records.length === 0) return null;
    
    const firstRecord = records[0] as any;
    if (!firstRecord) return null;
    
    // 获取附件数据（优先从 _html 字段获取处理后的数据，否则获取原始数据）
    const htmlContent = firstRecord[`_${attachmentDialogField}_html`];
    const rawAttachments = firstRecord[attachmentDialogField];
    
    // 如果是预处理后的 HTML 内容，提取图片 URL
    if (htmlContent && typeof htmlContent === 'string') {
      // 从 HTML 中提取图片 URL
      const imgRegex = /<img[^>]+src="([^"]+)"/g;
      const matches = [];
      let match;
      while ((match = imgRegex.exec(htmlContent)) !== null) {
        matches.push({
          name: '图片',
          url: match[1],
          type: 'image/jpeg'
        });
      }
      
      if (matches.length > 0) {
        console.log('[CanvasComponent] 从 HTML 提取的预览数据:', matches.length, '张图片');
        return {
          fieldName: attachmentDialogField,
          attachments: matches
        };
      }
    }
    
    // 使用原始附件数据
    if (Array.isArray(rawAttachments) && rawAttachments.length > 0) {
      const attachments = rawAttachments.map((att: any) => ({
        name: att.name || '未命名文件',
        url: att.url || att.tmpUrl || att.tmp_url || att.fileUrl || att.previewUrl,
        token: att.token || att.file_token,
        type: att.type || 'image/jpeg',
        size: att.size
      }));
      
      console.log('[CanvasComponent] 原始附件预览数据:', attachments.length, '个附件');
      return {
        fieldName: attachmentDialogField,
        attachments
      };
    }
    
    return null;
  }, [attachmentDialogField, records]);
  
  // 【关键修复】计算所有可用的附件字段列表
  const availableAttachmentFields = useMemo(() => {
    if (!fields || fields.length === 0) return [];
    
    // 从 fieldTypeMap 中筛选附件字段（value = 'attachment' 表示附件）
    const attachmentFieldIds = Object.entries(fieldTypeMap || {})
      .filter(([_, type]) => type === 'attachment')
      .map(([id]) => id);
    
    // 根据字段 ID 获取字段名
    const attachmentFieldNames = fields
      .filter(field => attachmentFieldIds.includes(field.id))
      .map(field => field.name);
    
    console.log('[CanvasComponent] 可用附件字段:', {
      totalFields: fields.length,
      attachmentFieldIds,
      attachmentFieldNames
    });
    
    return attachmentFieldNames;
  }, [fields, fieldTypeMap]);
  
  const textComponentRef = useRef<HTMLDivElement>(null);
  
  // 组件容器 ref - 用于检测点击外部
  const componentContainerRef = useRef<HTMLDivElement>(null);
  
  // 表格编辑状态（本地数据，UI 状态在 store）
  const [tableEditData, setTableEditData] = useState<any[][]>([]);
  
  // 使用 ref 跟踪最新的 tableEditData，避免闭包问题
  const tableEditDataRef = useRef<any[][]>([]);
  useEffect(() => {
    tableEditDataRef.current = tableEditData;
  }, [tableEditData]);
  
  // 表格单元格选择状态（用于拖动选择）
  const [cellSelection, setCellSelection] = useState<{
    startRow: number | null;
    startCol: number | null;
    endRow: number | null;
    endCol: number | null;
    isSelecting: boolean;
  }>({
    startRow: null,
    startCol: null,
    endRow: null,
    endCol: null,
    isSelecting: false,
  });
  
  // 行/列操作菜单的悬停状态
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [hoveredColIndex, setHoveredColIndex] = useState<number | null>(null);
  // 菜单自身的悬停状态
  const [isRowMenuHovered, setIsRowMenuHovered] = useState(false);
  const [isColMenuHovered, setIsColMenuHovered] = useState(false);
  // 定时器引用，用于延迟关闭菜单
  const rowMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const colMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 用于区分点击和拖拽的定时器
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mouseDownPositionRef = useRef<{ x: number; y: number } | null>(null);



  // 组件卸载时清理所有定时器
  useEffect(() => {
    return () => {
      if (rowMenuTimeoutRef.current) clearTimeout(rowMenuTimeoutRef.current);
      if (colMenuTimeoutRef.current) clearTimeout(colMenuTimeoutRef.current);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  // 拖动调整行高列宽的状态
  const [resizingRow, setResizingRow] = useState<{ rowIndex: number; startY: number; startHeight: number } | null>(null);
  const [resizingCol, setResizingCol] = useState<{ colIndex: number; startX: number; startWidth: number } | null>(null);
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (rowMenuTimeoutRef.current) {
        clearTimeout(rowMenuTimeoutRef.current);
      }
      if (colMenuTimeoutRef.current) {
        clearTimeout(colMenuTimeoutRef.current);
      }
    };
  }, []);

  // 判断当前是否在编辑这个表格
  const isCurrentTableEditing = tableEditing.isEditing && tableEditing.tableId === component.id;

  // 当表格退出编辑状态时，重置本地状态
  useEffect(() => {
    if (!isCurrentTableEditing) {
      // 重置单元格选择状态
      setCellSelection({
        startRow: null,
        startCol: null,
        endRow: null,
        endCol: null,
        isSelecting: false,
      });
    }
  }, [isCurrentTableEditing]);

  // 检查单元格是否在选中范围内
  const isCellInSelection = (rowIndex: number, colIndex: number): boolean => {
    if (cellSelection.startRow === null || cellSelection.startCol === null) {
      return false;
    }
    
    const minRow = Math.min(cellSelection.startRow, cellSelection.endRow ?? cellSelection.startRow);
    const maxRow = Math.max(cellSelection.startRow, cellSelection.endRow ?? cellSelection.startRow);
    const minCol = Math.min(cellSelection.startCol, cellSelection.endCol ?? cellSelection.startCol);
    const maxCol = Math.max(cellSelection.startCol, cellSelection.endCol ?? cellSelection.startCol);
    
    return rowIndex >= minRow && rowIndex <= maxRow && 
           colIndex >= minCol && colIndex <= maxCol;
  };

  // 获取选中的所有单元格ID
  const getSelectedCellIds = (tableComp: any): string[] => {
    if (!tableComp.tableConfig?.cells) return [];
    
    const selectedIds: string[] = [];
    if (cellSelection.startRow === null || cellSelection.startCol === null) {
      return [];
    }
    
    const minRow = Math.min(cellSelection.startRow, cellSelection.endRow ?? cellSelection.startRow);
    const maxRow = Math.max(cellSelection.startRow, cellSelection.endRow ?? cellSelection.startRow);
    const minCol = Math.min(cellSelection.startCol, cellSelection.endCol ?? cellSelection.startCol);
    const maxCol = Math.max(cellSelection.startCol, cellSelection.endCol ?? cellSelection.startCol);
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellId = tableComp.tableConfig.cells[row]?.[col]?.id || `cell-${row}-${col}`;
        selectedIds.push(cellId);
      }
    }
    
    return selectedIds;
  };

  // 全局引用，用于访问当前表格数据
  const tableDataRef = useRef<{
    tableComp: any;
  } | null>(null);

  // 处理单元格鼠标按下
  const handleCellMouseDown = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isCurrentTableEditing) {
      return;
    }
    
    // 记录鼠标按下位置和时间
    mouseDownPositionRef.current = { x: e.clientX, y: e.clientY };
    
    // 先选中当前单元格
    const cellId = (component as any).tableConfig?.cells?.[rowIndex]?.[colIndex]?.id || `cell-${rowIndex}-${colIndex}`;
    setTableEditing({
      selectedCells: [cellId],
    });
    
    // 设置选择开始（但不立即标记为正在选择，等待 mouseMove 触发）
    const tableComp = component as any;
    tableDataRef.current = { tableComp };
    
    setCellSelection({
      startRow: rowIndex,
      startCol: colIndex,
      endRow: rowIndex,
      endCol: colIndex,
      isSelecting: false, // 先不标记为正在选择
    });
  };

  // 处理单元格鼠标移动
  const handleCellMouseMove = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrentTableEditing) {
      return;
    }
    
    // 如果还没有开始选择，但鼠标已经移动，则标记为开始选择
    if (!cellSelection.isSelecting && cellSelection.startRow !== null) {
      setCellSelection(prev => ({
        ...prev,
        isSelecting: true,
      }));
    }
    
    if (!cellSelection.isSelecting) {
      return;
    }
    
    setCellSelection(prev => ({
      ...prev,
      endRow: rowIndex,
      endCol: colIndex,
    }));
  };

  // 全局鼠标移动监听 - 处理拖拽选择到单元格外部的情况
  useEffect(() => {
    if (!isCurrentTableEditing || !cellSelection.isSelecting || !tableDataRef.current) {
      return;
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // 通过 elementFromPoint 找到当前鼠标位置的单元格
      const elem = document.elementFromPoint(e.clientX, e.clientY);
      if (!elem) return;
      
      // 查找有 data-row 和 data-col 属性的元素
      const cellElem = elem.closest('[data-row][data-col]');
      if (cellElem) {
        const row = parseInt(cellElem.getAttribute('data-row') || '0', 10);
        const col = parseInt(cellElem.getAttribute('data-col') || '0', 10);
        
        setCellSelection(prev => ({
          ...prev,
          endRow: row,
          endCol: col,
        }));
      }
    };

    const handleGlobalMouseUp = () => {
      if (cellSelection.isSelecting && tableDataRef.current) {
        setCellSelection(prev => ({
          ...prev,
          isSelecting: false,
        }));
        
        // 更新 store 中的选中单元格
        const selectedIds = getSelectedCellIds(tableDataRef.current.tableComp);
        
        if (selectedIds.length > 0) {
          setTableEditing({
            selectedCells: selectedIds,
          });
        }
      }
      tableDataRef.current = null;
      mouseDownPositionRef.current = null;
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isCurrentTableEditing, cellSelection.isSelecting, getSelectedCellIds, setTableEditing]);

  // 处理单元格鼠标释放
  const handleCellMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrentTableEditing) return;
    
    if (cellSelection.isSelecting) {
      setCellSelection(prev => ({
        ...prev,
        isSelecting: false,
      }));
      
      // 更新 store 中的选中单元格
      const tableComp = component as any;
      const selectedIds = getSelectedCellIds(tableComp);
      if (selectedIds.length > 0) {
        setTableEditing({
          selectedCells: selectedIds,
        });
      }
    }
  };

  // 处理鼠标离开表格
  const handleTableMouseLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrentTableEditing) return;
    
    if (cellSelection.isSelecting) {
      setCellSelection(prev => ({
        ...prev,
        isSelecting: false,
      }));
      
      // 更新 store 中的选中单元格
      const tableComp = component as any;
      const selectedIds = getSelectedCellIds(tableComp);
      if (selectedIds.length > 0) {
        setTableEditing({
          selectedCells: selectedIds,
        });
      }
    }
  };

  // 文本组件编辑
  const handleDoubleClickText = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (component.type === 'text') {
      // 双击时先选中组件，确保全局工具栏显示
      onSelect();
      setIsEditing(true);
      setEditContent((component as any).content && (component as any).content !== '显示' ? (component as any).content : '');
    }
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    if (component.type === 'text') {
      // 确保保存内容时保留 width 和 height
      const textComp = component as any;
      updateComponent(component.id, { 
        content: editContent,
        // 显式保留 width 和 height，防止它们被重置
        ...(textComp.width && { width: textComp.width }),
        ...(textComp.height && { height: textComp.height }),
      });
    }
  };

  // 处理粘贴事件 - 检测附件字段
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    // 获取粘贴的文本内容
    const pastedText = e.clipboardData.getData('text');
    
    if (!pastedText) return;
    
    // 提取变量
    const variables = extractVariables(pastedText);
    
    if (variables.length === 0) return;
    
    // 检查是否有附件字段（使用 fieldTypeMap 判断）
    const attachmentFields = variables.filter(fieldName => {
      // 🔥 优先使用 fieldTypeMap 判断
      if (fieldTypeMap && fieldTypeMap[fieldName]) {
        return fieldTypeMap[fieldName] === 'attachment';
      }
      
      // 回退：通过值特征判断
      if (!records || records.length === 0) return false;
      const record = records[0] as any;
      const value = record[fieldName] || record.fields?.[fieldName];
      
      if (!Array.isArray(value) || value.length === 0) return false;
      
      const firstItem = value[0];
      // 附件字段特征：有 permission 对象（包含 tableId/fieldId/recordId）
      return firstItem && (
        ('token' in firstItem && firstItem.permission) || 
        'fileToken' in firstItem || 
        'previewUrl' in firstItem
      );
    });
    
    if (attachmentFields.length > 0) {
      // 阻止默认粘贴行为
      e.preventDefault();
      
      // 处理第一个附件字段
      const fieldName = attachmentFields[0];
      
      // 检查是否已有配置
      const existingConfig = attachmentConfigs[fieldName];
      
      if (!existingConfig) {
        // 没有配置，打开弹窗
        setAttachmentDialogField(fieldName);
        setAttachmentDialogOpen(true);
        
        // 将变量插入到文本中（临时）
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newContent = editContent.substring(0, start) + `[${fieldName}]` + editContent.substring(end);
          setEditContent(newContent);
        }
      }
      
      // 如果有多个附件字段，提示用户
      if (attachmentFields.length > 1) {
        toast.info(`检测到 ${attachmentFields.length} 个附件字段，请先配置第一个`);
      }
    }
  }, [records, attachmentConfigs, editContent]);

  // 处理表格单元格粘贴事件 - 检测所有字段变量
  const cellPasteDataRef = useRef<{rowIndex: number, colIndex: number, cursorPosition: number} | null>(null);
  
  const handleCellPaste = useCallback((rowIndex: number, colIndex: number) => (e: React.ClipboardEvent) => {
    console.log('[CanvasComponent] handleCellPaste called:', { rowIndex, colIndex });
    
    // 获取粘贴的文本内容
    const pastedText = e.clipboardData.getData('text');
    console.log('[CanvasComponent] pastedText:', pastedText.substring(0, 50));
    
    if (!pastedText) return;
    
    // 提取变量
    const variables = extractVariables(pastedText);
    console.log('[CanvasComponent] extracted variables:', variables);
    
    if (variables.length === 0) {
      // 没有变量，允许默认粘贴行为
      return;
    }
    
    // 有变量，阻止默认粘贴行为，手动处理
    e.preventDefault();
    
    // 从 ref 获取最新内容，避免闭包问题
    const currentContent = tableEditDataRef.current[rowIndex]?.[colIndex] || '';
    console.log('[CanvasComponent] currentContent from ref:', currentContent.substring(0, 50));
    
    // 尝试从当前活动的 textarea 获取光标位置
    const activeElement = document.activeElement as HTMLTextAreaElement;
    let selectionStart = currentContent.length; // 默认在末尾
    let selectionEnd = currentContent.length;
    
    if (activeElement && activeElement.tagName === 'TEXTAREA') {
      selectionStart = activeElement.selectionStart || 0;
      selectionEnd = activeElement.selectionEnd || 0;
    }
    console.log('[CanvasComponent] cursor position:', { selectionStart, selectionEnd });
    
    // 处理每个变量
    let variablesText = '';
    const attachmentFields: string[] = [];
    
    variables.forEach(fieldName => {
      // 检查是否为附件字段（使用 fieldTypeMap 判断）
      let isAttachment = false;
      
      // 🔥 优先使用 fieldTypeMap 判断
      if (fieldTypeMap && fieldTypeMap[fieldName]) {
        isAttachment = fieldTypeMap[fieldName] === 'attachment';
      } else if (records && records.length > 0) {
        // 回退：通过值特征判断
        const record = records[0] as any;
        const value = record[fieldName] || record.fields?.[fieldName];
        
        if (Array.isArray(value) && value.length > 0) {
          const firstItem = value[0];
          // 附件字段特征：有 permission 对象或 fileToken
          isAttachment = firstItem && (
            ('token' in firstItem && firstItem.permission) || 
            'fileToken' in firstItem || 
            'previewUrl' in firstItem
          );
        }
      }
      
      if (isAttachment) {
        attachmentFields.push(fieldName);
      }
      
      // 将变量插入到内容中（使用 [字段名] 格式）
      variablesText += `[${fieldName}]`;
    });
    
    // 在光标位置插入变量文本
    const newContent = currentContent.substring(0, selectionStart) + variablesText + currentContent.substring(selectionEnd);
    console.log('[CanvasComponent] newContent:', newContent.substring(0, 50));
    
    // 记录光标位置，用于后续恢复
    const newCursorPosition = selectionStart + variablesText.length;
    cellPasteDataRef.current = { rowIndex, colIndex, cursorPosition: newCursorPosition };
    
    // 更新单元格内容 - 让 React 自然处理渲染
    handleTableCellChange(rowIndex, colIndex, newContent);
    
    // 如果有附件字段且没有配置，打开配置弹窗（只处理第一个）
    if (attachmentFields.length > 0) {
      const firstAttachmentField = attachmentFields[0];
      const existingConfig = attachmentConfigs[firstAttachmentField];
      
      if (!existingConfig) {
        setAttachmentDialogField(firstAttachmentField);
        setAttachmentDialogOpen(true);
      }
      
      if (attachmentFields.length > 1) {
        toast.info(`检测到 ${attachmentFields.length} 个附件字段，请先配置第一个`);
      }
    }
  }, [records, attachmentConfigs]);

  // 处理附件变量配置确认
  const handleAttachmentConfirm = useCallback((config: AttachmentVariableConfig) => {
    // 【关键修复】如果字段名发生变化，需要更新组件中的变量
    if (attachmentDialogField && attachmentDialogField !== config.fieldName) {
      // 字段切换：从旧字段名更新为新字段名
      console.log('[CanvasComponent] 字段切换:', attachmentDialogField, '->', config.fieldName);
      
      if (component.type === 'text') {
        // 文本组件：更新 content 中的变量名
        const textComp = component as any;
        const oldPattern = new RegExp(`\\[${attachmentDialogField}\\]|\\{\\{${attachmentDialogField}\\}\\}`, 'g');
        const newContent = textComp.content.replace(oldPattern, `[${config.fieldName}]`);
        
        if (newContent !== textComp.content) {
          updateComponent(component.id, { content: newContent });
          console.log('[CanvasComponent] 文本组件内容已更新');
        }
      } else if (component.type === 'table') {
        // 表格组件：更新 tableConfig.cells 中的变量名
        const tableComp = component as any;
        const cells = tableComp.tableConfig?.cells;
        
        if (cells) {
          const newCells = cells.map((row: any[]) => 
            row.map((cell: any) => {
              if (cell && typeof cell.content === 'string') {
                const oldPattern = new RegExp(`\\[${attachmentDialogField}\\]|\\{\\{${attachmentDialogField}\\}\\}`, 'g');
                return {
                  ...cell,
                  content: cell.content.replace(oldPattern, `[${config.fieldName}]`)
                };
              }
              return cell;
            })
          );
          
          if (JSON.stringify(newCells) !== JSON.stringify(cells)) {
            updateComponent(component.id, { 
              tableConfig: { 
                ...tableComp.tableConfig, 
                cells: newCells 
              } 
            });
            console.log('[CanvasComponent] 表格组件 cells 已更新');
          }
        }
      }
      
      // 删除旧字段的配置
      deleteAttachmentConfig(attachmentDialogField);
    }
    
    // 保存配置到 store
    setAttachmentConfig(config.fieldName, config);
    
    // 关闭弹窗
    setAttachmentDialogOpen(false);
    setAttachmentDialogField('');
    
    toast.success(`附件字段 "${config.fieldName}" 配置已保存`);
  }, [setAttachmentConfig, deleteAttachmentConfig, updateComponent, component, attachmentDialogField]);

  // 在渲染后恢复光标位置（用于粘贴后）
  useEffect(() => {
    if (cellPasteDataRef.current && tableCellEditing.isEditing) {
      const { rowIndex, colIndex, cursorPosition } = cellPasteDataRef.current;
      // 检查当前编辑的单元格是否匹配
      if (tableCellEditing.rowIndex === rowIndex && tableCellEditing.colIndex === colIndex) {
        const textarea = document.activeElement as HTMLTextAreaElement;
        if (textarea && textarea.tagName === 'TEXTAREA') {
          // 使用 setTimeout 确保 DOM 已更新
          setTimeout(() => {
            textarea.setSelectionRange(cursorPosition, cursorPosition);
          }, 0);
        }
      }
      // 清除 ref
      cellPasteDataRef.current = null;
    }
  }, [tableEditData, tableCellEditing]);

  // 处理编辑附件变量
  const handleEditAttachmentVariable = useCallback((fieldName: string) => {
    setEditingVariable(fieldName);
    setAttachmentDialogField(fieldName);
    // 获取已有配置并传递给弹窗
    setAttachmentDialogConfig(attachmentConfigs[fieldName]);
    setAttachmentDialogOpen(true);
  }, [attachmentConfigs]);

  // 处理删除附件变量
  const handleDeleteAttachmentVariable = useCallback((fieldName: string) => {
    // 从配置中删除
    deleteAttachmentConfig(fieldName);
    
    // 从文本中删除
    const content = (component as any).content || '';
    const newContent = content.replace(new RegExp(`\\[${fieldName}\\]|\\{\\{${fieldName}\\}\\}`, 'g'), '');
    updateComponent(component.id, { content: newContent });
    
    toast.success(`附件字段 "${fieldName}" 已删除`);
  }, [component.id, deleteAttachmentConfig, updateComponent]);

  // 监听文本内容变化，自动计算并保存高度
  useEffect(() => {
    if (isEditing && component.type === 'text' && textComponentRef.current) {
      // 使用 setTimeout 确保 DOM 已更新
      setTimeout(() => {
        if (textComponentRef.current) {
          const textComp = component as any;
          const newHeight = textComponentRef.current.scrollHeight;
          // 只在高度变化时更新
          if (textComp.height !== newHeight) {
            updateComponent(component.id, {
              height: newHeight,
            });
          }
        }
      }, 0);
    }
  }, [editContent, isEditing, component.id, component.type, updateComponent]);

  // 【表格编辑】切换编辑状态
  // 注意：退出编辑时不取消选中，只有在完成编辑时才会取消选中
  const handleEditTable = useCallback((e?: React.MouseEvent) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
    if (isCurrentTableEditing) {
      // 退出编辑 - 只清除编辑状态，不取消选中
      setTableEditing({
        isEditing: false,
        tableId: null,
        selectedCells: [],
      });
    } else {
      // 进入编辑 - 只设置基本状态，不改变选中状态
      setTableEditing({
        isEditing: true,
        tableId: component.id,
        selectedCells: [],
      });
    }
  }, [component.id, isCurrentTableEditing, setTableEditing]);

  // 双击表格进入编辑
  const handleDoubleClickTable = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrentTableEditing) {
      handleEditTable();
    }
  };

  // 复制组件
  const handleCopyComponent = (e?: React.MouseEvent) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    duplicateComponent(component.id);
  };

  // 删除组件
  const handleDeleteComponent = (e?: React.MouseEvent) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    deleteComponent(component.id);
  };

  // 表格单元格编辑
  const handleTableCellChange = useCallback((row: number, col: number, value: string) => {
    console.log('[CanvasComponent] handleTableCellChange called:', { 
      row, 
      col, 
      valuePreview: value.substring(0, 50),
      valueLength: value.length,
      refCurrentPreview: tableEditDataRef.current[row]?.[col]?.substring(0, 50),
      componentId: component.id
    });
    
    // 先同步更新 ref，确保立即生效
    const currentData = tableEditDataRef.current;
    if (currentData[row]) {
      const newData = [...currentData];
      newData[row] = [...newData[row]];
      newData[row][col] = value;
      tableEditDataRef.current = newData;
      console.log('[CanvasComponent] tableEditDataRef updated:', {
        row, col, newValuePreview: value.substring(0, 30)
      });
    }
    
    // 使用函数式更新确保状态同步
    setTableEditData(prevData => {
      console.log('[CanvasComponent] setTableEditData functional update:', {
        row, col, prevValuePreview: prevData[row]?.[col]?.substring(0, 30)
      });
      const newData = [...prevData];
      if (newData[row]) {
        newData[row] = [...newData[row]];
        newData[row][col] = value;
      }
      return newData;
    });
    
    const tableComp = component as any;
    if (tableComp.tableConfig?.cells) {
      // 关键修复：保留所有原始单元格属性，特别是 rowSpan 和 colSpan！
      const newCells = tableComp.tableConfig.cells.map((rowData: any[], rowIndex: number) =>
        rowData.map((originalCell: any, colIndex: number) => {
          // 如果是当前编辑的单元格，更新 content，其他属性完全保留！
          if (rowIndex === row && colIndex === col) {
            return {
              ...originalCell, // 保留所有原始属性！包括 rowSpan、colSpan 等！
              content: value, // 只更新 content 字段
            };
          }
          // 其他单元格完全不变，原样返回
          return originalCell;
        })
      );
      
      console.log('[CanvasComponent] Calling updateComponent for cell:', { row, col });
      updateComponent(component.id, {
        tableConfig: {
          ...tableComp.tableConfig,
          cells: newCells,
        },
      });
    }
  }, [component.id, updateComponent]);

  // ========== 表格行/列操作核心逻辑 ==========
  
  // 在指定行上方插入新行
  const addRowAbove = useCallback((rowIndex: number) => {
    const tableComp = component as any;
    if (!tableComp.tableConfig?.cells) return;
    
    const colCount = tableComp.tableConfig.cells[0]?.length || 3;
    
    // 使用更可靠的唯一 ID 生成方式（时间戳 + 随机数 + 行/列索引）
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    // 修复：正确处理合并单元格的情况
    // 遍历当前行的每个单元格，检查是否需要调整合并属性
    const newRow = Array(colCount).fill(null).map((_, colIndex) => {
      const cell = tableComp.tableConfig.cells[rowIndex]?.[colIndex];
      // 如果被合并的单元格（rowSpan === 0）在当前行上方插入新行，
      // 需要找到实际的合并单元格并增加其 rowSpan
      return {
        id: `cell-${timestamp}-${random}-${rowIndex}-${colIndex}`,
        content: '',
        rowSpan: 1,
        colSpan: 1,
        backgroundColor: undefined,
        verticalAlign: 'middle',
        border: undefined,
        style: {},
      };
    });
    
    // 创建新的 cells 数组，同时调整可能跨越新行的合并单元格
    const newCells = tableComp.tableConfig.cells.map((row: any[]) => 
      row.map((cell: any) => ({ ...cell }))
    );
    
    // 在指定位置插入新行
    newCells.splice(rowIndex, 0, newRow);
    
    // 调整跨越新行的合并单元格：如果合并单元格的 rowSpan 跨越了插入位置，需要增加 rowSpan
    newCells.forEach((row: any[], rIndex: number) => {
      row.forEach((cell: any, cIndex: number) => {
        if (cell.rowSpan && cell.rowSpan > 1) {
          // 找到合并单元格的起始位置
          const mergeStartRow = rIndex;
          const mergeEndRow = rIndex + cell.rowSpan - 1;
          
          // 如果插入位置在合并区域内（不包括起始行），需要增加 rowSpan
          if (rowIndex > mergeStartRow && rowIndex <= mergeEndRow) {
            cell.rowSpan += 1;
          }
        }
      });
    });
    
    // 同时更新 tableEditData
    const newEditData = [...tableEditData];
    newEditData.splice(rowIndex, 0, Array(colCount).fill(''));
    setTableEditData(newEditData);
    
    updateComponent(component.id, {
      tableConfig: {
        ...tableComp.tableConfig,
        cells: newCells,
      },
    });
  }, [component, tableEditData, updateComponent]);

  // 在指定行下方插入新行
  const addRowBelow = useCallback((rowIndex: number) => {
    addRowAbove(rowIndex + 1);
  }, [addRowAbove]);

  // 删除指定行
  const deleteRow = useCallback((rowIndex: number) => {
    const tableComp = component as any;
    if (!tableComp.tableConfig?.cells || tableComp.tableConfig.cells.length <= 1) return;
    
    // 修复：在删除前，调整可能跨越该行的合并单元格
    const cellsToUpdate: { row: number; col: number; newRowSpan: number }[] = [];
    
    tableComp.tableConfig.cells.forEach((row: any[], rIndex: number) => {
      row.forEach((cell: any, cIndex: number) => {
        if (cell.rowSpan && cell.rowSpan > 1) {
          const mergeStartRow = rIndex;
          const mergeEndRow = rIndex + cell.rowSpan - 1;
          
          // 如果要删除的行在合并区域内（不包括起始行）
          if (rowIndex > mergeStartRow && rowIndex <= mergeEndRow) {
            cellsToUpdate.push({ row: rIndex, col: cIndex, newRowSpan: cell.rowSpan - 1 });
          }
          // 如果要删除的行是合并单元格的起始行，需要转移合并属性到下一行
          else if (rowIndex === mergeStartRow && cell.rowSpan > 1) {
            const nextRow = rIndex + 1;
            if (nextRow < tableComp.tableConfig.cells.length) {
              cellsToUpdate.push({ row: rIndex, col: cIndex, newRowSpan: -1 }); // -1 表示需要转移
            }
          }
        }
      });
    });
    
    // 创建新的 cells 数组
    let newCells = tableComp.tableConfig.cells.map((row: any[]) => 
      row.map((cell: any) => ({ ...cell }))
    );
    
    // 处理需要转移的合并单元格
    cellsToUpdate.forEach(({ row, col, newRowSpan }) => {
      if (newRowSpan === -1) {
        // 转移合并属性到下一行
        const nextRow = row + 1;
        if (nextRow < newCells.length) {
          const cell = newCells[row][col];
          newCells[nextRow][col] = {
            ...newCells[nextRow][col],
            rowSpan: cell.rowSpan - 1,
            colSpan: cell.colSpan,
            content: cell.content,
          };
        }
      } else {
        // 调整 rowSpan
        newCells[row][col].rowSpan = newRowSpan;
      }
    });
    
    // 删除指定行
    newCells = newCells.filter((_: any, index: number) => index !== rowIndex);
    const newEditData = tableEditData.filter((_: any, index: number) => index !== rowIndex);
    
    setTableEditData(newEditData);
    updateComponent(component.id, {
      tableConfig: {
        ...tableComp.tableConfig,
        cells: newCells,
      },
    });
  }, [component, tableEditData, updateComponent]);

  // 在指定列左侧插入新列
  const addColumnLeft = useCallback((colIndex: number) => {
    const tableComp = component as any;
    if (!tableComp.tableConfig?.cells) return;
    
    // 使用更可靠的唯一 ID 生成方式
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    // 修复：正确处理列合并的情况
    // 创建新的 cells 数组
    const newCells = tableComp.tableConfig.cells.map((row: any[], rowIdx: number) => {
      const newRow = row.map((cell: any) => ({ ...cell }));
      
      // 在指定位置插入新单元格
      const newCell = {
        id: `cell-${timestamp}-${random}-${rowIdx}-${colIndex}`,
        content: '',
        rowSpan: 1,
        colSpan: 1,
        backgroundColor: undefined,
        verticalAlign: 'middle',
        border: undefined,
        style: {},
      };
      newRow.splice(colIndex, 0, newCell);
      
      return newRow;
    });
    
    // 调整跨越新列的合并单元格：如果合并单元格的 colSpan 跨越了插入位置，需要增加 colSpan
    newCells.forEach((row: any[]) => {
      row.forEach((cell: any, cIndex: number) => {
        if (cell.colSpan && cell.colSpan > 1) {
          // 找到合并单元格的起始位置
          const mergeStartCol = cIndex;
          const mergeEndCol = cIndex + cell.colSpan - 1;
          
          // 如果插入位置在合并区域内（不包括起始列），需要增加 colSpan
          if (colIndex > mergeStartCol && colIndex <= mergeEndCol) {
            cell.colSpan += 1;
          }
        }
      });
    });
    
    const newEditData = tableEditData.map((row: any[]) => {
      const newRow = [...row];
      newRow.splice(colIndex, 0, '');
      return newRow;
    });
    
    setTableEditData(newEditData);
    updateComponent(component.id, {
      tableConfig: {
        ...tableComp.tableConfig,
        cells: newCells,
      },
    });
  }, [component, tableEditData, updateComponent]);

  // 在指定列右侧插入新列
  const addColumnRight = useCallback((colIndex: number) => {
    addColumnLeft(colIndex + 1);
  }, [addColumnLeft]);

  // 删除指定列
  const deleteColumn = useCallback((colIndex: number) => {
    const tableComp = component as any;
    if (!tableComp.tableConfig?.cells || tableComp.tableConfig.cells[0]?.length <= 1) return;
    
    // 修复：在删除前，调整可能跨越该列的合并单元格
    const cellsToUpdate: { row: number; col: number; newColSpan: number }[] = [];
    
    tableComp.tableConfig.cells.forEach((row: any[], rIndex: number) => {
      row.forEach((cell: any, cIndex: number) => {
        if (cell.colSpan && cell.colSpan > 1) {
          const mergeStartCol = cIndex;
          const mergeEndCol = cIndex + cell.colSpan - 1;
          
          // 如果要删除的列在合并区域内（不包括起始列）
          if (colIndex > mergeStartCol && colIndex <= mergeEndCol) {
            cellsToUpdate.push({ row: rIndex, col: cIndex, newColSpan: cell.colSpan - 1 });
          }
          // 如果要删除的列是合并单元格的起始列，需要转移合并属性到下一列
          else if (colIndex === mergeStartCol && cell.colSpan > 1) {
            const nextCol = cIndex + 1;
            if (nextCol < row.length) {
              cellsToUpdate.push({ row: rIndex, col: cIndex, newColSpan: -1 }); // -1 表示需要转移
            }
          }
        }
      });
    });
    
    // 创建新的 cells 数组
    let newCells = tableComp.tableConfig.cells.map((row: any[]) => 
      row.map((cell: any) => ({ ...cell }))
    );
    
    // 处理需要转移的合并单元格
    cellsToUpdate.forEach(({ row, col, newColSpan }) => {
      if (newColSpan === -1) {
        // 转移合并属性到下一列
        const nextCol = col + 1;
        if (nextCol < newCells[row].length) {
          const cell = newCells[row][col];
          newCells[row][nextCol] = {
            ...newCells[row][nextCol],
            rowSpan: cell.rowSpan,
            colSpan: cell.colSpan - 1,
            content: cell.content,
          };
        }
      } else {
        // 调整 colSpan
        newCells[row][col].colSpan = newColSpan;
      }
    });
    
    // 删除指定列
    newCells = newCells.map((row: any[]) => 
      row.filter((_: any, index: number) => index !== colIndex)
    );
    
    const newEditData = tableEditData.map((row: any[]) => 
      row.filter((_: any, index: number) => index !== colIndex)
    );
    
    setTableEditData(newEditData);
    updateComponent(component.id, {
      tableConfig: {
        ...tableComp.tableConfig,
        cells: newCells,
      },
    });
  }, [component, tableEditData, updateComponent]);

  // 🔥 拖动调整行高
  const handleRowResizeMouseDown = useCallback((rowIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const tableComp = component as any;
    const rowHeights = tableComp.tableConfig?.rowHeights || [];
    const startHeight = rowHeights[rowIndex] || 40; // 默认高度
    
    setResizingRow({
      rowIndex,
      startY: e.clientY,
      startHeight,
    });
  }, [component]);

  // 🔥 拖动调整列宽
  const handleColResizeMouseDown = useCallback((colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const tableComp = component as any;
    const colWidths = tableComp.tableConfig?.colWidths || [];
    const startWidth = colWidths[colIndex] || 100; // 默认宽度
    
    setResizingCol({
      colIndex,
      startX: e.clientX,
      startWidth,
    });
  }, [component]);

  // 🔥 处理全局鼠标移动（用于拖动调整）
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {

      if (resizingRow) {
        const deltaY = e.clientY - resizingRow.startY;
        const newHeight = Math.max(20, resizingRow.startHeight + deltaY); // 最小高度20px
        
        const tableComp = component as any;
        const rowHeights = [...(tableComp.tableConfig?.rowHeights || [])];
        rowHeights[resizingRow.rowIndex] = newHeight;
        
        updateComponent(component.id, {
          tableConfig: {
            ...tableComp.tableConfig,
            rowHeights,
          },
        });
      }
      
      if (resizingCol) {
        const deltaX = e.clientX - resizingCol.startX;
        const newWidth = Math.max(50, resizingCol.startWidth + deltaX); // 最小宽度50px
        
        const tableComp = component as any;
        const colWidths = [...(tableComp.tableConfig?.colWidths || [])];
        colWidths[resizingCol.colIndex] = newWidth;
        
        updateComponent(component.id, {
          tableConfig: {
            ...tableComp.tableConfig,
            colWidths,
          },
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setResizingRow(null);
      setResizingCol(null);
    };

    if (resizingRow || resizingCol) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [resizingRow, resizingCol, component, updateComponent]);

  // 【全局点击监听】点击画布空白区域时取消选中
  // 注意：表格编辑状态下点击外部不退出表格编辑，而是在完成编辑时取消选中
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // 表格编辑状态下，点击外部不做任何处理
      // 在完成编辑时才会取消选中
      if (isCurrentTableEditing) return;
      
      // 如果当前不是选中状态，不需要处理
      if (!isSelected) return;
      
      const target = e.target as HTMLElement;
      
      // 检查点击是否在画布区域内（#canvas 或 #canvas-grid）
      const isInCanvas = target.closest('#canvas') !== null || target.closest('#canvas-grid') !== null;
      
      // 如果点击不在画布区域内，保持选中状态（例如点击侧边栏、工具栏等）
      if (!isInCanvas) return;
      
      // 检查点击是否在组件容器内部
      const isInComponent = componentContainerRef.current?.contains(target) ?? false;
      
      // 如果点击在画布内但不在组件内部，则取消选中和退出编辑
      if (!isInComponent) {
        // 如果正在编辑文本，先退出编辑并保存
        if (isEditing && component.type === 'text') {
          setIsEditing(false);
          const textComp = component as any;
          updateComponent(component.id, { 
            content: editContent,
            // 显式保留 width 和 height，防止它们被重置
            ...(textComp.width && { width: textComp.width }),
            ...(textComp.height && { height: textComp.height }),
          });
        }
        
        // 取消选中当前组件
        selectComponent(null);
      }
    };

    // 在选中状态下添加监听器（表格编辑状态下不添加）
    if (isSelected && !isCurrentTableEditing) {
      // 使用 capture 阶段来确保在其他事件处理之前执行
      document.addEventListener('mousedown', handleGlobalClick, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleGlobalClick, true);
    };
  }, [isSelected, isCurrentTableEditing, isEditing, component.id, component.type, editContent, updateComponent, selectComponent]);

  // 自动聚焦到编辑框
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // 文本编辑时自动调整高度
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      // 重置高度以获取准确的 scrollHeight
      textarea.style.height = 'auto';
      // 设置为内容的 scrollHeight
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [isEditing, editContent]);

  // 初始化/同步表格编辑数据
  useEffect(() => {
    console.log('[CanvasComponent] tableEditData sync effect triggered:', {
      componentId: component.id,
      hasCells: !!(component as any).tableConfig?.cells,
      tableCellEditing: {
        isEditing: tableCellEditing.isEditing,
        tableId: tableCellEditing.tableId,
        rowIndex: tableCellEditing.rowIndex,
        colIndex: tableCellEditing.colIndex,
      }
    });
    
    if (component.type === 'table') {
      const tableComp = component as any;
      if (tableComp.tableConfig?.cells) {
        const cells = tableComp.tableConfig.cells;
        setTableEditData(prev => {
          // 如果行数或列数不匹配，重新初始化
          const prevRows = prev.length;
          const prevCols = prev[0]?.length || 0;
          const newRows = cells.length;
          const newCols = cells[0]?.length || 0;
          
          console.log('[CanvasComponent] setTableEditData sync:', {
            prevRows, prevCols, newRows, newCols,
            prevPreview: prev[0]?.[0]?.substring(0, 20),
            cellsPreview: cells[0]?.[0]?.content?.substring(0, 20),
          });
          
          if (prevRows !== newRows || prevCols !== newCols) {
            console.log('[CanvasComponent] Reinitializing tableEditData (dimension changed)');
            return cells.map((row: any[]) => 
              row.map((cell: any) => cell?.content || '')
            );
          }
          
          // 🔥🔥🔥 关键修复：只要当前表格有单元格在编辑中，就保留所有本地数据！
          // 不要只保留当前编辑的单元格，因为切换单元格时会导致其他单元格丢失
          const isCurrentTableBeingEdited = tableCellEditing.isEditing && tableCellEditing.tableId === component.id;
          
          if (isCurrentTableBeingEdited) {
            console.log('[CanvasComponent] Table being edited, preserving all local data');
            // 保留所有本地编辑数据，不从 cells 同步
            return prev;
          }
          
          // 没有单元格在编辑中，从 cells 同步最新内容
          console.log('[CanvasComponent] Syncing from cells (no cell editing)');
          return cells.map((row: any[]) => 
            row.map((cell: any) => cell?.content || '')
          );
        });
      } else {
        setTableEditData([
          ['', '', ''],
          ['', '', ''],
        ]);
      }
    }
  }, [component.id, component.type, (component as any).tableConfig?.cells, tableCellEditing.isEditing, tableCellEditing.tableId, tableCellEditing.rowIndex, tableCellEditing.colIndex]);

  // 生成二维码
  useEffect(() => {
    if (component.type === 'qrcode' && canvasRef.current) {
      const qrcodeComponent = component as any;
      // 🔥 使用变量替换后的内容生成二维码
      const content = parseVariables(qrcodeComponent.content || '', previewRecord, fields);
      QRCode.toCanvas(canvasRef.current, content, {
        width: Math.min(qrcodeComponent.size || 150, 200),
        margin: 1,
      }).catch(console.error);
    }
  }, [component, previewRecord, fields]);

  // 生成条形码
  useEffect(() => {
    if (component.type === 'barcode' && canvasRef.current) {
      const barcodeComponent = component as any;
      try {
        canvasRef.current.innerHTML = '';
        // 🔥 使用变量替换后的内容生成条形码
        const content = parseVariables(barcodeComponent.content || '', previewRecord, fields);
        JsBarcode(canvasRef.current, content, {
          format: barcodeComponent.format || 'CODE128',
          width: 2,
          height: 50,
          displayValue: true,
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }, [component, previewRecord, fields]);

  // 辅助函数：生成列标（A, B, C... AA, AB...）
  const getColumnLabel = (index: number): string => {
    let label = '';
    let remaining = index;
    while (true) {
      label = String.fromCharCode(65 + (remaining % 26)) + label;
      remaining = Math.floor(remaining / 26) - 1;
      if (remaining < 0) break;
    }
    return label;
  };

  // 辅助函数：判断行是否可见（只要这一行有任何可见的单元格就显示行号）
  const isRowVisible = (tableComp: any, rowIndex: number): boolean => {
    if (!tableComp.tableConfig?.cells) return true;
    const row = tableComp.tableConfig.cells[rowIndex];
    if (!row) return false;
    // 只要这一行有任何一个单元格的 rowSpan 不是 0，就显示行号
    return row.some((cell: any) => cell?.rowSpan !== 0);
  };

  // 辅助函数：判断列是否可见（只要这一列有任何可见的单元格就显示列标）
  const isColumnVisible = (tableComp: any, colIndex: number): boolean => {
    if (!tableComp.tableConfig?.cells) return true;
    // 只要这一列有任何一个单元格的 colSpan 不是 0，就显示列标
    return tableComp.tableConfig.cells.some((row: any[]) => {
      const cell = row[colIndex];
      return cell?.colSpan !== 0;
    });
  };

  // 渲染表格内容
  const renderTableContent = (tableComp: any) => {
    if (!tableComp.tableConfig?.cells) {
      return (
        <div className="p-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Pencil className="w-4 h-4" />
            <span>表格组件</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button variant="default" size="sm" onClick={handleEditTable}>
              编辑表格
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCopyComponent}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={handleDeleteComponent}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    const colCount = tableEditData[0]?.length || 0;
    const colWidths = tableComp.tableConfig?.colWidths || [];
    const rowHeights = tableComp.tableConfig?.rowHeights || [];

    return (
      <div 
        data-table-id={component.id}
        onMouseUp={handleCellMouseUp}
        onMouseLeave={handleTableMouseLeave}
      >
        {/* 注入变量芯片样式 */}
        <style dangerouslySetInnerHTML={{ __html: VARIABLE_CHIP_STYLES }} />
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <tbody>
            {/* 列标行 */}
            {isCurrentTableEditing && (
              <tr>
                {/* 左上角角落单元格 */}
                <td 
                  style={{
                    width: '40px',
                    minWidth: '40px',
                    maxWidth: '40px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                  }}
                />
                {/* 列标单元格 - 只显示可见的列 */}
                {Array(colCount).fill(null).map((_, colIndex) => {
                  if (!isColumnVisible(tableComp, colIndex)) {
                    return null;
                  }
                  const colWidth = colWidths[colIndex];
                  return (
                    <td
                      key={`col-header-${colIndex}`}
                      className="relative group cursor-pointer select-none"
                      style={{
                        backgroundColor: hoveredColIndex === colIndex ? '#e5e7eb' : '#f9fafb',
                        border: '1px solid #e5e7eb',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        padding: '4px 8px',
                        fontWeight: 500,
                        fontSize: '12px',
                        color: '#374151',
                        width: colWidth ? `${colWidth}px` : undefined,
                        minWidth: colWidth ? `${colWidth}px` : undefined,
                      }}
                      onMouseEnter={() => {
                        // 清除之前的定时器
                        if (colMenuTimeoutRef.current) {
                          clearTimeout(colMenuTimeoutRef.current);
                          colMenuTimeoutRef.current = null;
                        }
                        setHoveredColIndex(colIndex);
                      }}
                      onMouseLeave={() => {
                        // 延迟 300ms 关闭，给用户时间移动鼠标到菜单上
                        colMenuTimeoutRef.current = setTimeout(() => {
                          if (!isColMenuHovered) {
                            setHoveredColIndex(null);
                          }
                        }, 300);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getColumnLabel(colIndex)}
                      {/* 列操作菜单 */}
                      {(hoveredColIndex === colIndex || isColMenuHovered) && hoveredColIndex === colIndex && (
                        <ColumnActionMenu
                          onAddLeft={() => addColumnLeft(colIndex)}
                          onAddRight={() => addColumnRight(colIndex)}
                          onDelete={() => deleteColumn(colIndex)}
                          position="top"
                          onMouseEnter={() => {
                            if (colMenuTimeoutRef.current) {
                              clearTimeout(colMenuTimeoutRef.current);
                              colMenuTimeoutRef.current = null;
                            }
                            setIsColMenuHovered(true);
                          }}
                          onMouseLeave={() => {
                            setIsColMenuHovered(false);
                            // 延迟 300ms 关闭
                            colMenuTimeoutRef.current = setTimeout(() => {
                              setHoveredColIndex(null);
                            }, 300);
                          }}
                        />
                      )}
                      {/* 🔥 列宽调整手柄 - 仅在编辑模式下显示 */}
                      {isCurrentTableEditing && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                          style={{ zIndex: 10 }}
                          onMouseDown={(e) => handleColResizeMouseDown(colIndex, e)}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            )}
            
            {/* 数据行 */}
            {tableEditData.map((row: any[], rowIndex: number) => {
              const isHeader = rowIndex < (tableComp.tableConfig?.headerRows || 0);
              const isFooter = rowIndex >= tableEditData.length - (tableComp.tableConfig?.footerRows || 0);
              const isVisible = isRowVisible(tableComp, rowIndex);
              
              return (
                <tr 
                  key={rowIndex}
                  className={isHeader ? 'bg-gray-100 font-semibold' : isFooter ? 'bg-gray-50' : ''}
                >
                {/* 行号单元格 - 只显示可见的行 */}
                {isCurrentTableEditing && isVisible && (
                  <td
                    key={`row-header-${rowIndex}`}
                    className="relative group cursor-pointer select-none"
                    style={{
                      width: '40px',
                      minWidth: '40px',
                      maxWidth: '40px',
                      backgroundColor: hoveredRowIndex === rowIndex ? '#e5e7eb' : '#f9fafb',
                      border: '1px solid #e5e7eb',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      padding: '4px 8px',
                      fontWeight: 500,
                      fontSize: '12px',
                      color: '#374151',
                      height: rowHeights[rowIndex] ? `${rowHeights[rowIndex]}px` : undefined,
                    }}
                    onMouseEnter={() => {
                      // 清除之前的定时器
                      if (rowMenuTimeoutRef.current) {
                        clearTimeout(rowMenuTimeoutRef.current);
                        rowMenuTimeoutRef.current = null;
                      }
                      setHoveredRowIndex(rowIndex);
                    }}
                    onMouseLeave={() => {
                      // 延迟 300ms 关闭，给用户时间移动鼠标到菜单上
                      rowMenuTimeoutRef.current = setTimeout(() => {
                        if (!isRowMenuHovered) {
                          setHoveredRowIndex(null);
                        }
                      }, 300);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {rowIndex + 1}
                    {/* 行操作菜单 */}
                    {(hoveredRowIndex === rowIndex || isRowMenuHovered) && hoveredRowIndex === rowIndex && (
                      <RowActionMenu
                        onAddAbove={() => addRowAbove(rowIndex)}
                        onAddBelow={() => addRowBelow(rowIndex)}
                        onDelete={() => deleteRow(rowIndex)}
                        position="left"
                        onMouseEnter={() => {
                          if (rowMenuTimeoutRef.current) {
                            clearTimeout(rowMenuTimeoutRef.current);
                            rowMenuTimeoutRef.current = null;
                          }
                          setIsRowMenuHovered(true);
                        }}
                        onMouseLeave={() => {
                          setIsRowMenuHovered(false);
                          // 延迟 300ms 关闭
                          rowMenuTimeoutRef.current = setTimeout(() => {
                            setHoveredRowIndex(null);
                          }, 300);
                        }}
                      />
                    )}
                    {/* 🔥 行高调整手柄 - 仅在编辑模式下显示 */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-blue-500"
                      style={{ zIndex: 10 }}
                      onMouseDown={(e) => handleRowResizeMouseDown(rowIndex, e)}
                    />
                  </td>
                )}
                
                {/* 数据单元格 */}
                {row.map((cellContent: any, colIndex: number) => {
                  const cell = tableComp.tableConfig?.cells?.[rowIndex]?.[colIndex];
                  const cellId = cell?.id || `cell-${rowIndex}-${colIndex}`;
                  
                  // 检查是否是被合并的单元格（rowSpan 或 colSpan 为 0）
                  const rowSpan = cell?.rowSpan;
                  const colSpan = cell?.colSpan;
                  
                  // 如果是被合并的单元格，不渲染
                  if (rowSpan === 0 || colSpan === 0) {
                    return null;
                  }
                  
                  const isCellInRange = isCellInSelection(rowIndex, colIndex);
                  const isCellSelected = tableEditing.selectedCells.includes(cellId) || isCellInRange;
                  const cellBorder = cell?.border;
                  const borderWidth = cellBorder?.width || tableComp.tableConfig?.borderWidth || 2;
                  const borderColor = cellBorder?.color || tableComp.tableConfig?.borderColor || '#6b7280';
                  
                  // 🔥 获取列宽和行高
                  const colWidth = colWidths[colIndex];
                  const rowHeight = rowHeights[rowIndex];
                  
                  // 构建边框样式
                  const borderStyles: any = {};
                  if (cellBorder?.top) {
                    borderStyles.borderTop = `${borderWidth}px solid ${borderColor}`;
                  }
                  if (cellBorder?.right) {
                    borderStyles.borderRight = `${borderWidth}px solid ${borderColor}`;
                  }
                  if (cellBorder?.bottom) {
                    borderStyles.borderBottom = `${borderWidth}px solid ${borderColor}`;
                  }
                  if (cellBorder?.left) {
                    borderStyles.borderLeft = `${borderWidth}px solid ${borderColor}`;
                  }
                  
                  // 如果没有设置单元格边框，使用默认边框
                  const hasCellBorder = cellBorder?.top || cellBorder?.right || cellBorder?.bottom || cellBorder?.left;
                  
                  return (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      data-row={rowIndex}
                      data-col={colIndex}
                      rowSpan={rowSpan && rowSpan > 1 ? rowSpan : undefined}
                      colSpan={colSpan && colSpan > 1 ? colSpan : undefined}
                      className={`p-1 text-sm cursor-pointer transition-colors select-none`}
                      style={{
                        backgroundColor: (() => {
                          const cellBgColor = cell?.backgroundColor;
                          const cellTextBgColor = cell?.style?.backgroundColor;
                          
                          // 选中状态不改变背景色，使用边框高亮
                          if (isCellSelected) {
                            return cellBgColor || cellTextBgColor || 'transparent';
                          }
                          
                          // 优先使用单元格背景色，其次是文本背景色
                          return cellBgColor || cellTextBgColor || 'transparent';
                        })(),
                        color: undefined, // 选中状态不改变文字颜色
                        userSelect: 'none',
                        verticalAlign: cell?.verticalAlign || 'middle',
                        width: colWidth ? `${colWidth}px` : undefined,
                        minWidth: colWidth ? `${colWidth}px` : undefined,
                        height: rowHeight ? `${rowHeight}px` : undefined,
                        // 强制添加默认边框，确保表格线明显
                        border: !hasCellBorder ? `${borderWidth}px solid ${borderColor}` : undefined,
                        // 选中状态使用蓝色边框高亮
                        outline: isCellSelected ? '2px solid #3b82f6' : undefined,
                        outlineOffset: '-2px',
                        ...borderStyles,
                      }}
                      onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
                      onMouseEnter={(e) => {
                        // 只有在已经开始拖动选择的情况下才处理鼠标进入
                        if (cellSelection.isSelecting && cellSelection.startRow !== null) {
                          handleCellMouseMove(rowIndex, colIndex, e);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isCurrentTableEditing) return;
                        
                        // 检查当前单元格是否已经在编辑中
                        const isCurrentCellAlreadyEditing = tableCellEditing.isEditing && 
                          tableCellEditing.tableId === component.id &&
                          tableCellEditing.cellId === cellId;
                        
                        // 如果已经在编辑中，不做任何操作
                        if (isCurrentCellAlreadyEditing) {
                          return;
                        }
                        
                        // 直接进入当前单元格编辑模式（会自动关闭其他单元格的编辑）
                        setTableEditing({
                          selectedCells: [cellId],
                        });
                        setTableCellEditing({
                          isEditing: true,
                          tableId: component.id,
                          cellId,
                          rowIndex,
                          colIndex,
                        });
                      }}
                    >
                    {(() => {
                      const cellStyle = tableComp.tableConfig?.cells?.[rowIndex]?.[colIndex]?.style || {};
                      
                      // 构建单元格文本样式
                      const textStyles: React.CSSProperties = {
                        fontSize: `${cellStyle.fontSize || styleConfig.fontSize}px`,
                        fontWeight: cellStyle.bold ? 'bold' : 'normal',
                        fontStyle: cellStyle.italic ? 'italic' : 'normal',
                        color: cellStyle.color || '#000000',
                        backgroundColor: cellStyle.backgroundColor || 'transparent',
                        textAlign: cellStyle.align || 'left',
                        lineHeight: cellStyle.lineHeight || styleConfig.lineHeight,
                        textDecoration: cellStyle.underline ? 'underline' : cellStyle.textDecoration || 'none',
                        textTransform: cellStyle.textTransform || 'none',
                        paddingBottom: cellStyle.paragraphSpacing ? `${cellStyle.paragraphSpacing}px` : 0,
                        width: '100%',
                        minHeight: '20px',
                      };

                      // 渲染带样式的内容函数定义
                      const renderContentWithStyle = () => {
                        // 基础文本样式
                        const baseTextStyle: React.CSSProperties = {
                          fontSize: `${cellStyle.fontSize || styleConfig.fontSize}px`,
                          fontWeight: cellStyle.bold ? 'bold' : 'normal',
                          fontStyle: cellStyle.italic ? 'italic' : 'normal',
                          color: cellStyle.color || '#000000',
                          textAlign: cellStyle.align || 'left',
                          lineHeight: cellStyle.lineHeight || styleConfig.lineHeight,
                          textDecoration: cellStyle.underline ? 'underline' : cellStyle.textDecoration || 'none',
                          textTransform: cellStyle.textTransform || 'none',
                          margin: 0,
                          padding: 0,
                          display: 'block',
                          width: '100%',
                        };

                        // 标题样式
                        if (cellStyle.headingLevel === 1) {
                          return (
                            <h1 style={{ 
                              ...baseTextStyle,
                              fontSize: cellStyle.fontSize ? `${cellStyle.fontSize}px` : '24px',
                              fontWeight: 'bold',
                            }}>
                              <VariableTextRenderer
                                text={cellContent || ''}
                                records={recordsForVariableRenderer || []}
                                fields={fields || []}
                                fieldTypeMap={fieldTypeMap} // 【新增】
                                tagName="span"
                                textStyle={cellStyle}
                                attachmentConfigs={attachmentConfigs}
                                isEditing={isCurrentTableEditing}
                                onEditAttachment={handleEditAttachmentVariable}
                                onDeleteAttachment={(fieldName) => {
                                  // 从单元格内容中删除该字段
                                  const newContent = cellContent.replace(
                                    new RegExp(`\\[${fieldName}\\]|\\{\\{${fieldName}\\}\\}`, 'g'), 
                                    ''
                                  );
                                  handleTableCellChange(rowIndex, colIndex, newContent);
                                  toast.success(`字段 "${fieldName}" 已删除`);
                                }}
                              />
                            </h1>
                          );
                        }
                        if (cellStyle.headingLevel === 2) {
                          return (
                            <h2 style={{ 
                              ...baseTextStyle,
                              fontSize: cellStyle.fontSize ? `${cellStyle.fontSize}px` : '18px',
                              fontWeight: 'bold',
                            }}>
                              <VariableTextRenderer
                                text={cellContent || ''}
                                records={recordsForVariableRenderer || []}
                                fields={fields || []}
                                fieldTypeMap={fieldTypeMap}
                                tagName="span"
                                textStyle={cellStyle}
                                attachmentConfigs={attachmentConfigs}
                                isEditing={isCurrentTableEditing}
                                onEditAttachment={handleEditAttachmentVariable}
                                onDeleteAttachment={(fieldName) => {
                                  const newContent = cellContent.replace(
                                    new RegExp(`\\[${fieldName}\\]|\\{\\{${fieldName}\\}\\}`, 'g'), 
                                    ''
                                  );
                                  handleTableCellChange(rowIndex, colIndex, newContent);
                                  toast.success(`字段 "${fieldName}" 已删除`);
                                }}
                              />
                            </h2>
                          );
                        }
                        // 列表样式
                        if (cellStyle.listType === 'unordered' && !cellStyle.headingLevel) {
                          return (
                            <ul style={{ 
                              marginLeft: '1.5rem', 
                              paddingLeft: 0,
                              textAlign: baseTextStyle.textAlign,
                              lineHeight: baseTextStyle.lineHeight,
                            }}>
                              <li style={{
                                fontSize: baseTextStyle.fontSize,
                                fontWeight: baseTextStyle.fontWeight,
                                fontStyle: baseTextStyle.fontStyle,
                                color: baseTextStyle.color,
                                textDecoration: baseTextStyle.textDecoration,
                              }}>
                                <VariableTextRenderer
                                  text={cellContent || ''}
                                  records={recordsForVariableRenderer || []}
                                  fields={fields || []}
                                  fieldTypeMap={fieldTypeMap}
                                  tagName="span"
                                  textStyle={cellStyle}
                                  isEditing={isCurrentTableEditing}
                                  attachmentConfigs={attachmentConfigs}
                                  onEditAttachment={handleEditAttachmentVariable}
                                  onDeleteAttachment={(fieldName) => {
                                    const newContent = cellContent.replace(
                                      new RegExp(`\\[${fieldName}\\]|\\{\\{${fieldName}\\}\\}`, 'g'), 
                                      ''
                                    );
                                    handleTableCellChange(rowIndex, colIndex, newContent);
                                    toast.success(`字段 "${fieldName}" 已删除`);
                                  }}
                                />
                              </li>
                            </ul>
                          );
                        }
                        if (cellStyle.listType === 'ordered' && !cellStyle.headingLevel) {
                          return (
                            <ol style={{ 
                              marginLeft: '1.5rem', 
                              paddingLeft: 0,
                              textAlign: baseTextStyle.textAlign,
                              lineHeight: baseTextStyle.lineHeight,
                            }}>
                              <li style={{
                                fontSize: baseTextStyle.fontSize,
                                fontWeight: baseTextStyle.fontWeight,
                                fontStyle: baseTextStyle.fontStyle,
                                color: baseTextStyle.color,
                                textDecoration: baseTextStyle.textDecoration,
                              }}>
                                <VariableTextRenderer
                                  text={cellContent || ''}
                                  records={recordsForVariableRenderer || []}
                                  fields={fields || []}
                                  fieldTypeMap={fieldTypeMap}
                                  tagName="span"
                                  textStyle={cellStyle}
                                  isEditing={isCurrentTableEditing}
                                  attachmentConfigs={attachmentConfigs}
                                  onEditAttachment={handleEditAttachmentVariable}
                                  onDeleteAttachment={(fieldName) => {
                                    const newContent = cellContent.replace(
                                      new RegExp(`\\[${fieldName}\\]|\\{\\{${fieldName}\\}\\}`, 'g'), 
                                      ''
                                    );
                                    handleTableCellChange(rowIndex, colIndex, newContent);
                                    toast.success(`字段 "${fieldName}" 已删除`);
                                  }}
                                />
                              </li>
                            </ol>
                          );
                        }
                        // 链接样式
                        if (cellStyle.link) {
                          return (
                            <a 
                              href={cellStyle.link}
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{
                                ...baseTextStyle,
                                color: '#3b82f6',
                                textDecoration: 'underline',
                                display: 'inline',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <VariableTextRenderer
                                text={cellContent || ''}
                                records={recordsForVariableRenderer || []}
                                fields={fields || []}
                                fieldTypeMap={fieldTypeMap}
                                tagName="span"
                                textStyle={cellStyle}
                                attachmentConfigs={attachmentConfigs}
                                isEditing={isCurrentTableEditing}
                                onEditAttachment={handleEditAttachmentVariable}
                                onDeleteAttachment={(fieldName) => {
                                  const newContent = cellContent.replace(
                                    new RegExp(`\\[${fieldName}\\]|\\{\\{${fieldName}\\}\\}`, 'g'), 
                                    ''
                                  );
                                  handleTableCellChange(rowIndex, colIndex, newContent);
                                  toast.success(`字段 "${fieldName}" 已删除`);
                                }}
                              />
                            </a>
                          );
                        }
                        // 默认文本样式
                        return (
                          <span style={baseTextStyle}>
                            <VariableTextRenderer
                              text={cellContent || ''}
                              records={recordsForVariableRenderer || []}
                              fields={fields || []}
                              fieldTypeMap={fieldTypeMap}
                              tagName="span"
                              textStyle={cellStyle}
                              attachmentConfigs={attachmentConfigs}
                              isEditing={isCurrentTableEditing}
                              onEditAttachment={handleEditAttachmentVariable}
                              onDeleteAttachment={(fieldName) => {
                                const newContent = cellContent.replace(
                                  new RegExp(`\\[${fieldName}\\]|\\{\\{${fieldName}\\}\\}`, 'g'), 
                                  ''
                                );
                                handleTableCellChange(rowIndex, colIndex, newContent);
                                toast.success(`字段 "${fieldName}" 已删除`);
                              }}
                            />
                          </span>
                        );
                      };

                      // 判断当前单元格是否处于编辑状态
                      const isCurrentCellEditing = tableCellEditing.isEditing && 
                        tableCellEditing.tableId === component.id &&
                        tableCellEditing.cellId === cellId;

                      // 当前单元格处于编辑状态 - 显示 textarea
                      if (isCurrentCellEditing) {
                        return (
                          <AutoResizingTextarea
                            value={cellContent || ''}
                            onChange={(value) => handleTableCellChange(rowIndex, colIndex, value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              // Escape 退出单元格编辑
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                setTableCellEditing({
                                  isEditing: false,
                                  tableId: null,
                                  cellId: null,
                                  rowIndex: null,
                                  colIndex: null,
                                });
                              }
                              // Enter 保存并退出（Shift+Enter 换行）
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                setTableCellEditing({
                                  isEditing: false,
                                  tableId: null,
                                  cellId: null,
                                  rowIndex: null,
                                  colIndex: null,
                                });
                              }
                            }}
                            onPaste={handleCellPaste(rowIndex, colIndex)}
                            style={{
                              fontSize: `${cellStyle.fontSize || styleConfig.fontSize}px`,
                              fontWeight: cellStyle.bold ? 'bold' : 'normal',
                              fontStyle: cellStyle.italic ? 'italic' : 'normal',
                              color: cellStyle.color || '#000000',
                              backgroundColor: 'transparent',
                              textAlign: cellStyle.align || 'left',
                              lineHeight: cellStyle.lineHeight || styleConfig.lineHeight,
                              textDecoration: cellStyle.underline ? 'underline' : cellStyle.textDecoration || 'none',
                            }}
                          />
                        );
                      }

                      // 表格编辑模式但当前单元格不处于编辑状态 - 显示变量标签
                      if (isCurrentTableEditing) {
                        return renderContentWithStyle();
                      }

                      // 预览模式 - 显示读入的字段值
                      return (
                        <div className="whitespace-pre-wrap" style={textStyles}>
                          <VariableTextRenderer
                            text={cellContent || ''}
                            records={recordsForVariableRenderer || []}
                            fields={fields || []}
                            fieldTypeMap={fieldTypeMap}
                            tagName="span"
                            textStyle={cellStyle}
                            attachmentConfigs={attachmentConfigs}
                            isEditing={false}
                          />
                        </div>
                      );
                    })()}
                  </td>
                );
              })}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    );
  };

  // 渲染不同类型的组件
  const renderContent = () => {
    switch (component.type) {
      case 'text':
        const textComp = component as any;
        
        if (isEditing) {
          return (
            <div
              ref={textComponentRef}
              className="relative cursor-text whitespace-pre-wrap"
              style={{
                width: '100%', // 修复：文本组件应该占满容器宽度，而不是使用固定像素宽度
                height: 'auto',
                minHeight: '40px',
                padding: '0.5rem',
                fontSize: `${textComp.textStyle?.fontSize || styleConfig.fontSize}px`,
                fontWeight: textComp.textStyle?.bold ? 'bold' : 'normal',
                fontStyle: textComp.textStyle?.italic ? 'italic' : 'normal',
                color: textComp.textStyle?.color || '#000000',
                backgroundColor: textComp.textStyle?.backgroundColor || 'transparent',
                textAlign: textComp.textStyle?.align || 'left',
                lineHeight: textComp.textStyle?.lineHeight || styleConfig.lineHeight,
                marginBottom: textComp.textStyle?.paragraphSpacing ? `${textComp.textStyle.paragraphSpacing}px` : 0,
                textDecoration: textComp.textStyle?.underline ? 'underline' : textComp.textStyle?.textDecoration || 'none',
                textTransform: textComp.textStyle?.textTransform || 'none',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',        // ✅ 允许单词内换行
                overflowWrap: 'anywhere',      // ✅ 更激进的换行策略
                maxWidth: '100%',              // ✅ 不超过父容器
                border: '1px solid transparent',
              }}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              <AutoResizingTextarea
                value={editContent}
                onChange={(value) => {
                  setEditContent(value);
                }}
                onClick={(e) => {}}
                onKeyDown={(e) => {
                  // Ctrl+Enter 或 Cmd+Enter 保存并退出编辑
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleTextBlur();
                  }
                  // Escape 退出编辑
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                  }
                }}
                onPaste={handlePaste}
                style={{
                  fontSize: '1em',
                  fontWeight: 'inherit',
                  fontStyle: 'inherit',
                  color: 'inherit',
                  textAlign: 'inherit',
                  lineHeight: 'inherit',
                  backgroundColor: 'transparent',
                  fontFamily: 'inherit',
                  cursor: 'text',
                }}
              />
            </div>
          );
        }

        return (
          <div
            ref={textComponentRef}
            className="relative cursor-text whitespace-pre-wrap"
            style={{
              width: '100%', // 修复：文本组件应该占满容器宽度，而不是使用固定像素宽度
              height: 'auto',
              minHeight: '40px',
              padding: '0.5rem',
              fontSize: `${textComp.textStyle?.fontSize || styleConfig.fontSize}px`,
              fontWeight: textComp.textStyle?.bold ? 'bold' : 'normal',
              fontStyle: textComp.textStyle?.italic ? 'italic' : 'normal',
              color: textComp.textStyle?.color || '#000000',
              backgroundColor: textComp.textStyle?.backgroundColor || 'transparent',
              textAlign: textComp.textStyle?.align || 'left',
              lineHeight: textComp.textStyle?.lineHeight || styleConfig.lineHeight,
              marginBottom: textComp.textStyle?.paragraphSpacing ? `${textComp.textStyle.paragraphSpacing}px` : 0,
              textDecoration: textComp.textStyle?.underline ? 'underline' : textComp.textStyle?.textDecoration || 'none',
              textTransform: textComp.textStyle?.textTransform || 'none',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',        // ✅ 允许单词内换行
              overflowWrap: 'anywhere',      // ✅ 更激进的换行策略
              maxWidth: '100%',              // ✅ 不超过父容器
              border: '1px solid transparent',
            }}
            onDoubleClick={handleDoubleClickText}
          >
            {/* 注入变量芯片样式 */}
            <style dangerouslySetInnerHTML={{ __html: VARIABLE_CHIP_STYLES }} />
            
            {textComp.textStyle?.headingLevel === 1 && (
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                marginBottom: '0.5rem' 
              }}>
                <VariableTextRenderer
                  text={textComp.content || '显示'}
                  records={recordsForVariableRenderer || []}
                  fields={fields || []}
                  fieldTypeMap={fieldTypeMap}
                  tagName="span"
                  textStyle={textComp.textStyle}
                  attachmentConfigs={attachmentConfigs}
                  isEditing={isEditing || isSelected}
                  onEditAttachment={handleEditAttachmentVariable}
                  onDeleteAttachment={handleDeleteAttachmentVariable}
                />
              </h1>
            )}
            {textComp.textStyle?.headingLevel === 2 && (
              <h2 style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                marginBottom: '0.5rem' 
              }}>
                <VariableTextRenderer
                  text={textComp.content || '显示'}
                  records={recordsForVariableRenderer || []}
                  fields={fields || []}
                  fieldTypeMap={fieldTypeMap}
                  tagName="span"
                  textStyle={textComp.textStyle}
                  attachmentConfigs={attachmentConfigs}
                  isEditing={isEditing || isSelected}
                  onEditAttachment={handleEditAttachmentVariable}
                  onDeleteAttachment={handleDeleteAttachmentVariable}
                />
              </h2>
            )}
            {textComp.textStyle?.listType === 'unordered' && !textComp.textStyle?.headingLevel && (
              <ul style={{ marginLeft: '1.5rem', paddingLeft: 0 }}>
                <li>
                  <VariableTextRenderer
                    text={textComp.content || '显示'}
                    records={recordsForVariableRenderer || []}
                    fields={fields || []}
                    fieldTypeMap={fieldTypeMap}
                    tagName="span"
                    textStyle={textComp.textStyle}
                    attachmentConfigs={attachmentConfigs}
                    isEditing={isEditing || isSelected}
                    onEditAttachment={handleEditAttachmentVariable}
                    onDeleteAttachment={handleDeleteAttachmentVariable}
                  />
                </li>
              </ul>
            )}
            {textComp.textStyle?.listType === 'ordered' && !textComp.textStyle?.headingLevel && (
              <ol style={{ marginLeft: '1.5rem', paddingLeft: 0 }}>
                <li>
                  <VariableTextRenderer
                    text={textComp.content || '显示'}
                    records={recordsForVariableRenderer || []}
                    fields={fields || []}
                    fieldTypeMap={fieldTypeMap}
                    tagName="span"
                    textStyle={textComp.textStyle}
                    attachmentConfigs={attachmentConfigs}
                    isEditing={isEditing || isSelected}
                    onEditAttachment={handleEditAttachmentVariable}
                    onDeleteAttachment={handleDeleteAttachmentVariable}
                  />
                </li>
              </ol>
            )}
            {!textComp.textStyle?.headingLevel && !textComp.textStyle?.listType && (
              <span>
                {textComp.textStyle?.linkUrl ? (
                  <a 
                    href={textComp.textStyle.linkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#3b82f6', textDecoration: 'underline' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <VariableTextRenderer
                      text={textComp.content || '显示'}
                      records={recordsForVariableRenderer || []}
                      fields={fields || []}
                      fieldTypeMap={fieldTypeMap}
                      tagName="span"
                      textStyle={textComp.textStyle}
                      attachmentConfigs={attachmentConfigs}
                    />
                  </a>
                ) : (
                  <VariableTextRenderer
                    text={textComp.content || '显示'}
                    records={recordsForVariableRenderer || []}
                    fields={fields || []}
                    fieldTypeMap={fieldTypeMap}
                    tagName="span"
                    textStyle={textComp.textStyle}
                    attachmentConfigs={attachmentConfigs}
                    isEditing={isEditing || isSelected}
                    onEditAttachment={handleEditAttachmentVariable}
                    onDeleteAttachment={handleDeleteAttachmentVariable}
                  />
                )}
              </span>
            )}
          </div>
        );

      case 'table':
        const tableComp = component as any;
        
        // 编辑状态：表格内容，工具栏在 EditorPage 层面
        if (isCurrentTableEditing) {
          return (
            <div onDoubleClick={handleDoubleClickTable}>
              {renderTableContent(tableComp)}
            </div>
          );
        }
        
        // 非编辑状态：工具栏在右上角悬浮
        return (
          <div 
            className="relative" 
            onDoubleClick={handleDoubleClickTable}
          >
            <div className="absolute -top-9 right-0 z-10">
              <HoverToolbar
                onEdit={handleEditTable}
                onDelete={handleDeleteComponent}
                onCopy={handleCopyComponent}
                isSelected={isSelected}
              />
            </div>
            {renderTableContent(tableComp)}
          </div>
        );

      case 'image':
        const imageComp = component as any;
        return (
          <div className="w-full flex items-center justify-center p-2">
            {imageComp.src ? (
              <img
                src={imageComp.src}
                alt={imageComp.alt || '图片'}
                className="max-w-full max-h-[300px] object-contain"
                style={{ objectFit: imageComp.fit || 'contain' }}
              />
            ) : (
              <div className="w-full h-32 flex items-center justify-center bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded">
                <span className="text-sm text-muted-foreground">点击选择图片</span>
              </div>
            )}
          </div>
        );

      case 'qrcode':
        const qrcodeComp = component as any;
        // 🔥 二维码内容也进行变量替换
        const qrcodeContent = parseVariables(qrcodeComp.content || '二维码内容', previewRecord, fields);
        return (
          <div className="w-full flex flex-col items-center justify-center p-4">
            <canvas ref={canvasRef} />
            <p className="text-xs text-muted-foreground mt-2">
              {qrcodeContent}
            </p>
          </div>
        );

      case 'barcode':
        const barcodeComp = component as any;
        // 🔥 条形码内容也进行变量替换
        const barcodeContent = parseVariables(barcodeComp.content || '条形码内容', previewRecord, fields);
        return (
          <div className="w-full flex flex-col items-center justify-center p-4">
            <canvas ref={canvasRef} />
            <p className="text-xs text-muted-foreground mt-2">
              {barcodeContent}
            </p>
          </div>
        );

      case 'line':
        const lineComp = component as any;
        return (
          <div className="w-full p-2">
            <hr
              style={{
                border: 'none',
                height: `${lineComp.thickness || 1}px`,
                backgroundColor: lineComp.color || '#000000',
                borderTop: lineComp.style === 'dashed' ? '1px dashed #000' : 
                          lineComp.style === 'dotted' ? '1px dotted #000' : 'none',
              }}
            />
          </div>
        );

      case 'heading':
      case 'paragraph':
      case 'list':
        return (
          <div className="w-full p-4">
            <DocumentComponentRenderer
              component={component}
              isEditing={isEditing}
              isSelected={isSelected}
              onChange={(content) => {
                updateComponent(component.id, { content });
              }}
              onItemsChange={(items) => {
                updateComponent(component.id, { items });
              }}
              onLevelChange={(level) => {
                updateComponent(component.id, { level: level as 1 | 2 | 3 | 4 | 5 | 6 });
              }}
            />
          </div>
        );

      default:
        const unknownComp = component as any;
        return (
          <div className="w-full p-4 text-center text-muted-foreground">
            未知组件类型: {unknownComp.type || 'unknown'}
          </div>
        );
    }
  };

  return (
    <div ref={componentContainerRef} className="w-full">
      {renderContent()}
      
      {/* 附件配置弹窗 */}
      <InsertAttachmentDialog
        isOpen={attachmentDialogOpen}
        onClose={() => {
          setAttachmentDialogOpen(false);
          setAttachmentDialogField('');
          setAttachmentDialogConfig(undefined);
        }}
        availableFields={availableAttachmentFields}
        initialField={attachmentDialogField}
        initialConfig={attachmentDialogConfig}
        previewData={attachmentPreviewData}
        onConfirm={handleAttachmentConfirm}
      />
    </div>
  );
}
