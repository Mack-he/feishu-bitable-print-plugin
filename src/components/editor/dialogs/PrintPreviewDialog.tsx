'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEditorStore } from '@/store/editorStore';
import { PAGE_SIZES, CanvasComponentNode, Field } from '@/types/editor';
import { 
  Printer, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  CheckSquare,
  Square,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Database,
  Layout,
  RefreshCw,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { VariableTextRenderer } from '@/components/VariableTextRenderer';
import { UnifiedComponentRenderer, RenderMode } from '@/components/editor/canvas/UnifiedComponentRenderer';
import { FieldTypeMap } from '@/types/editor';
import { 
  processRecordAttachments, 
  getFeishuTable,
  isFeishuEnvironment 
} from '@/lib/attachment-processor';
import { fetchFields, fetchRecords, initEnvironment, getCurrentEnvironment } from '@/lib/feishu-service';

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 数据源类型
interface DataSource {
  id: string;
  name: string;
  type: 'template' | 'table';
  fields: Field[];
  records: Record<string, unknown>[];
}

export function PrintPreviewDialog({ open, onOpenChange }: PrintPreviewDialogProps) {
  const {
    components,
    pageConfig,
    styleConfig,
    templateName,
    fields,
    records,
    selectedRecordIds,
    toggleRecordSelection,
    selectAllRecords,
    clearRecordSelection,
    setRecords,
    setFields,
    attachmentConfigs,
  } = useEditorStore();
  
  const [previewMode, setPreviewMode] = useState<'default' | 'continuous' | 'label'>('default');
  const [currentPage, setCurrentPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [dataSourceMode, setDataSourceMode] = useState<'template' | 'data'>('template');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [processedRecords, setProcessedRecords] = useState<Record<string, unknown>[]>([]);
  const [isProcessingAttachments, setIsProcessingAttachments] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // 计算画布尺寸
  const mmToPx = 3.78;
  const pageSize = PAGE_SIZES[pageConfig.size];
  const isLandscape = pageConfig.orientation === 'landscape';
  const canvasWidth = isLandscape ? pageSize.height * mmToPx : pageSize.width * mmToPx;
  const canvasHeight = isLandscape ? pageSize.width * mmToPx : pageSize.height * mmToPx;

  // 缩放控制
  const handleZoomIn = () => {
    setScale(prev => Math.min(2, Math.round((prev + 0.1) * 10) / 10));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  // 获取预览记录
  const getPreviewRecords = useCallback(() => {
    // 模板预览模式：返回空记录，让组件显示占位符
    if (dataSourceMode === 'template') {
      return [{ id: 'template-preview', __mode__: 'template' }];
    }
    
    // 数据预览模式：使用预处理后的记录
    if (selectedRecordIds.length > 0) {
      return processedRecords.filter(r => selectedRecordIds.includes(r.id as string));
    }
    
    if (processedRecords.length > 0) {
      return processedRecords;
    }
    
    // 没有数据时返回空记录
    return [{ id: 'empty', __mode__: 'empty' }];
  }, [dataSourceMode, processedRecords, selectedRecordIds]);

  const previewRecords = getPreviewRecords();
  const isEmptyPreview = dataSourceMode === 'template' || (dataSourceMode === 'data' && records.length === 0);

  // 计算内容区域宽度（考虑页边距）- 与 CanvasArea 保持一致
  const contentWidth = canvasWidth - (pageConfig.margins.left + pageConfig.margins.right) * mmToPx;

  // 获取组件宽度样式 - 与 CanvasArea 保持一致
  const getComponentWidthStyle = useCallback((width: string) => {
    const gap = 12; // gap-3 = 12px
    switch (width) {
      case '50%': 
        return { 
          width: `calc((100% - ${gap}px) / 2)`,
          flexShrink: 0,
          boxSizing: 'border-box' as const,
        };
      case '33%': 
        return { 
          width: `calc((100% - ${2 * gap}px) / 3)`,
          flexShrink: 0,
          boxSizing: 'border-box' as const,
        };
      case '25%': 
        return { 
          width: `calc((100% - ${3 * gap}px) / 4)`,
          flexShrink: 0,
          boxSizing: 'border-box' as const,
        };
      default: 
        return { 
          width: '100%',
          flexShrink: 0,
          boxSizing: 'border-box' as const,
        };
    }
  }, []);

  // 构建 fieldTypeMap
  const fieldTypeMap = React.useMemo(() => {
    return fields.reduce((map, field) => {
      // 使用 fieldKind（如果已定义），否则根据 type 推断
      const fieldType = field.fieldKind || 
        (field.type === '17' || field.type === 'attachment' ? 'attachment' :
         field.type === '11' || field.type === 'user' ? 'person' :
         field.type === '1' || field.type === 'text' ? 'text' :
         field.type === '2' || field.type === 'number' ? 'number' :
         field.type === '5' || field.type === 'date' ? 'date' : 'other');
      map[field.name] = fieldType;
      return map;
    }, {} as FieldTypeMap);
  }, [fields]);

  // 预处理记录中的附件字段
  useEffect(() => {
    const processAttachments = async () => {
      // 只在数据模式且有记录时处理
      if (dataSourceMode !== 'data' || records.length === 0) {
        setProcessedRecords(records);
        return;
      }
      
      // 检查是否有附件字段
      const hasAttachmentFields = Object.values(fieldTypeMap).some(type => type === 'attachment');
      if (!hasAttachmentFields) {
        console.log('[PrintPreview] 没有附件字段，跳过预处理');
        setProcessedRecords(records);
        return;
      }
      
      setIsProcessingAttachments(true);
      console.log('[PrintPreview] 开始预处理附件字段...');
      
      try {
        // 获取飞书 table 对象
        const table = await getFeishuTable();
        
        // 批量处理记录
        const processed = await Promise.all(
          records.map(record => 
            processRecordAttachments(record, fields, fieldTypeMap, table, {
              maxImageWidth: 120,
              maxImageHeight: 120,
              includeFileName: false
            })
          )
        );
        
        console.log('[PrintPreview] 附件字段预处理完成');
        setProcessedRecords(processed);
      } catch (error) {
        console.error('[PrintPreview] 附件字段预处理失败:', error);
        // 降级：使用原始记录
        setProcessedRecords(records);
      } finally {
        setIsProcessingAttachments(false);
      }
    };
    
    processAttachments();
  }, [records, fields, fieldTypeMap, dataSourceMode]);

  // 渲染单页内容（流式布局）
  const renderPageContent = useCallback((record: Record<string, unknown>) => {
    // 空状态：没有组件时显示提示
    if (components.length === 0) {
      return (
        <div 
          className="flex flex-col items-center justify-center h-full text-muted-foreground"
          style={{ width: `${contentWidth}px`, minHeight: '200px' }}
        >
          <Layout className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">模板为空</p>
          <p className="text-sm mt-1">请先添加组件到画布</p>
        </div>
      );
    }

    return (
      <div 
        className="flex flex-wrap content-start gap-3"
        style={{ width: `${contentWidth}px` }}
      >
        {components.map((component) => {
          const layoutWidth = component.layout?.width || '100%';
          
          return (
            <div
              key={component.id}
              className="w-full"
              style={{
                ...getComponentWidthStyle(layoutWidth),
                boxSizing: 'border-box',
              }}
            >
              <UnifiedComponentRenderer
                component={component}
                mode="preview"
                styleConfig={styleConfig}
                fields={fields}
                fieldTypeMap={fieldTypeMap}
                record={record}
                attachmentConfigs={attachmentConfigs}
                isEmptyPreview={isEmptyPreview}
              />
            </div>
          );
        })}
      </div>
    );
  }, [components, fields, fieldTypeMap, styleConfig, contentWidth, getComponentWidthStyle, isEmptyPreview, attachmentConfigs]);

  // 加载飞书数据
  const loadFeishuData = useCallback(async () => {
    setIsLoadingData(true);
    setPrintError(null);
    
    try {
      // 使用统一的 feishu-service 获取字段和记录（场景：进入排版打印预览时读取）
      const appFields = await fetchFields({ scene: 'print_preview' });
      setFields(appFields);
      
      const appRecords = await fetchRecords({ processFields: true });
      setRecords(appRecords);
      
      // 切换到数据模式
      setDataSourceMode('data');
      
      // 重置页码
      setCurrentPage(0);
      
      if (appFields.length === 0) {
        setPrintError('未获取到字段数据，请检查数据源配置');
      }
    } catch (error) {
      console.error('加载飞书数据失败:', error);
      setPrintError('加载数据失败，请确保在飞书环境中并选择了表格');
    } finally {
      setIsLoadingData(false);
    }
  }, [setFields, setRecords]);

  // 导出为 PDF
  const handleExportPDF = useCallback(async () => {
    if (!previewRef.current) return;
    
    setIsExporting(true);
    setPrintError(null);
    
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: pageConfig.size,
      });
      
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${templateName || '打印预览'}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      setPrintError('PDF导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [previewRef, isLandscape, pageConfig.size, templateName]);

  // 全选/取消全选
  const allSelected = records.length > 0 && selectedRecordIds.length === records.length;
  const handleToggleSelectAll = () => {
    if (allSelected) {
      clearRecordSelection();
    } else {
      selectAllRecords();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* 头部工具栏 */}
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle>打印预览</DialogTitle>
            
            {/* 操作按钮 */}
            <div className="flex items-center gap-4">
              <Button
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? '导出中...' : '导出 PDF'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 主体内容 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧：数据源选择和记录选择 */}
          <div className="w-72 border-r flex flex-col">
            {/* 数据源选择 */}
            <div className="p-4 border-b bg-muted/30">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" />
                数据源
              </h3>
              <Tabs 
                value={dataSourceMode} 
                onValueChange={(v) => setDataSourceMode(v as 'template' | 'data')}
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="template" className="text-xs">
                    <Layout className="w-3 h-3 mr-1" />
                    点选模板
                  </TabsTrigger>
                  <TabsTrigger value="data" className="text-xs">
                    <Database className="w-3 h-3 mr-1" />
                    点选数据
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              {dataSourceMode === 'data' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={loadFeishuData}
                  disabled={isLoadingData}
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingData ? 'animate-spin' : ''}`} />
                  {isLoadingData ? '加载中...' : '加载表格数据'}
                </Button>
              )}
              
              {dataSourceMode === 'template' && (
                <p className="text-xs text-muted-foreground mt-2">
                  预览模板结构，变量将显示为占位符
                </p>
              )}
            </div>

            {/* 记录选择（仅在数据模式下显示） */}
            {dataSourceMode === 'data' && records.length > 0 && (
              <>
                <div className="p-3 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id="select-all"
                      checked={allSelected}
                      onCheckedChange={handleToggleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      全选 ({records.length})
                    </label>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    已选 {selectedRecordIds.length} 条
                  </Badge>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {records.map((record) => (
                      <div
                        key={record.id as string}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        onClick={() => {
                          // 🔍 输出数据结构，检查附件字段值
                          console.log('🔍 ====== 点击数据卡片，输出数据结构 ======');
                          console.log('📋 record.id:', record.id);
                          console.log('📋 record 所有字段:', Object.keys(record));
                          
                          // 🔍 查找附件字段
                          const attachmentFields = fields.filter(f => f.fieldKind === 'attachment' || f.type === '17' || f.type === 'attachment');
                          console.log('📋 附件字段列表:', attachmentFields.map(f => f.name));
                          
                          // 🔍 输出每个附件字段的值
                          attachmentFields.forEach(field => {
                            const value = record[field.name];
                            console.log(`📎 [${field.name}] 字段值:`, value);
                            if (Array.isArray(value)) {
                              console.log(`   - 数组长度: ${value.length}`);
                              value.forEach((item, idx) => {
                                console.log(`   - [${idx}]:`, item);
                              });
                            }
                          });
                          
                          // 🔥 同时发送到服务器日志（可通过 /app/work/logs/bypass/console.log 查看）
                          fetch('/api/debug/log', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              type: 'DATA_CARD_CLICK',
                              recordId: record.id,
                              fields: Object.keys(record),
                              attachmentFields: attachmentFields.map(f => ({
                                name: f.name,
                                value: record[f.name]
                              })),
                              fullRecord: record
                            })
                          }).catch(() => {});
                          
                          console.log('📋 完整 record 对象:', JSON.stringify(record, null, 2));
                          console.log('🔍 ===========================================');
                          
                          toggleRecordSelection(record.id as string);
                        }}
                      >
                        <Checkbox
                          checked={selectedRecordIds.includes(record.id as string)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {String(record['__tableName__'] || record.id)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
            
            {dataSourceMode === 'data' && records.length === 0 && !isLoadingData && (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <Database className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  暂无数据
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  点击上方按钮加载表格数据
                </p>
              </div>
            )}
            
            {dataSourceMode === 'template' && (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <Layout className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  模板预览模式
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  显示模板结构和变量占位符
                </p>
              </div>
            )}
          </div>

          {/* 中间：预览区域 */}
          <div className="flex-1 flex flex-col bg-gray-100" style={{ overflow: 'visible' }}>
            {/* 预览模式切换 */}
            <div className="p-4 border-b bg-background flex items-center justify-between">
              <Tabs value={previewMode} onValueChange={(v: any) => setPreviewMode(v)}>
                <TabsList>
                  <TabsTrigger value="default">单页模式</TabsTrigger>
                  <TabsTrigger value="continuous">连续模式</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* 模式指示器 */}
              <Badge variant={dataSourceMode === 'template' ? 'secondary' : 'default'} className="text-xs">
                {dataSourceMode === 'template' ? '模板预览' : '数据预览'}
              </Badge>
            </div>

            {/* 缩放控制栏 - 跟模板编辑一样，位于画布上方 */}
            <div className="flex items-center justify-center p-4 border-b bg-background">
              <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                  className="h-8 w-8"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={scale >= 2}
                  className="h-8 w-8"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <div className="w-px h-4 bg-gray-300 mx-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleResetZoom}
                  className="h-8 w-8"
                  title="重置缩放"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 预览内容 */}
            <ScrollArea className="flex-1">
              <div 
                className="p-8 flex flex-col items-center gap-8"
                style={{ minWidth: 'fit-content' }}
              >
                {printError && (
                  <Alert variant="destructive" className="max-w-lg">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{printError}</AlertDescription>
                  </Alert>
                )}

                {previewMode === 'continuous' ? (
                  // 连续模式
                  previewRecords.map((record, index) => (
                    <div
                      key={record.id as string}
                      ref={index === 0 ? previewRef : null}
                      className="bg-white shadow-lg relative"
                      style={{
                        width: `${canvasWidth * scale}px`,
                        minHeight: `${canvasHeight * scale}px`,
                        padding: `${pageConfig.margins.top * mmToPx * scale}px ${pageConfig.margins.right * mmToPx * scale}px ${pageConfig.margins.bottom * mmToPx * scale}px ${pageConfig.margins.left * mmToPx * scale}px`,
                        fontFamily: styleConfig.fontFamily,
                        marginBottom: '20px',
                      }}
                    >
                      <div className="absolute -top-6 left-0 text-sm text-muted-foreground">
                        第 {index + 1} 页
                      </div>
                      {renderPageContent(record)}
                    </div>
                  ))
                ) : (
                  // 单页模式
                  <>
                    {previewRecords.length > 1 && (
                      <div className="flex items-center gap-4 mb-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                          disabled={currentPage === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm">
                          {currentPage + 1} / {previewRecords.length}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(Math.min(previewRecords.length - 1, currentPage + 1))}
                          disabled={currentPage === previewRecords.length - 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    
                    <div
                      ref={previewRef}
                      className="bg-white shadow-lg"
                      style={{
                        width: `${canvasWidth * scale}px`,
                        minHeight: `${canvasHeight * scale}px`,
                        padding: `${pageConfig.margins.top * mmToPx * scale}px ${pageConfig.margins.right * mmToPx * scale}px ${pageConfig.margins.bottom * mmToPx * scale}px ${pageConfig.margins.left * mmToPx * scale}px`,
                        fontFamily: styleConfig.fontFamily,
                      }}
                    >
                      {renderPageContent(previewRecords[currentPage])}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
