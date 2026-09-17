'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Printer, ChevronLeft, ChevronRight, Eye, FileText, Pencil, Download, ScanSearch, X, Plus, LayoutGrid, List, Tag, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useTemplateStore, type Template } from '@/store/templateStore';
import { useSelectedDataStore, type SelectedRecord } from '@/store/selectedDataStore';
import { useEditorStore } from '@/store/editorStore';
import { PageSettingsDialog } from '@/components/editor/dialogs/PageSettingsDialog';
import { PAGE_SIZES, PageConfig } from '@/types/editor';
import { feishuEnv } from '@/lib/feishu-env';
import { onSelectionChange } from '@/lib/feishu-env';
import { MixedContentRenderer, extractVariables, FieldTypeMap, type VariableType } from '@/components/editor/variables';


interface TemplatePreviewProps {
  baseId?: string;
  tableId?: string;
  onEditTemplate?: (template: Template) => void;
}

// 排版方式类型
type LayoutMode = 'default' | 'continuous' | 'label';

// 检测表格是否匹配模板（纯函数，不依赖 React 状态）
const checkTableMatch = (template: { data?: { tableId?: string } } | null, tableId: string | null): boolean => {
  if (!template) {
    return true;
  }
  
  if (!tableId) {
    return true;
  }
  
  // 获取模板关联的表格ID
  const templateTableId = template.data?.tableId;
  
  // 如果模板没有记录表格ID，说明是旧模板或通用模板，允许任何表格
  if (!templateTableId) {
    return true;
  }
  
  // 比较表格ID
  return templateTableId === tableId;
};

// 选中的数据记录类型（用于TemplatePreview内部）
interface PreviewSelectedRecord {
  id: string;
  data: Record<string, any>;
  addedAt: number;
}

// 日期时间戳转换函数
const formatTimestamp = (value: any): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  
  // 处理数组格式的日期字段（飞书多维表格格式）
  if (Array.isArray(value) && value.length > 0) {
    return formatTimestamp(value[0]);
  }
  
  // 如果是对象格式，尝试提取时间值
  if (typeof value === 'object' && value !== null) {
    // 尝试从常见的时间字段中提取
    if (value.text !== undefined) return formatTimestamp(value.text);
    if (value.name !== undefined) return formatTimestamp(value.name);
    if (value.value !== undefined) return formatTimestamp(value.value);
    if (value.id !== undefined) return formatTimestamp(value.id);
  }
  
  // 如果是数字且是13位时间戳（毫秒）
  if (typeof value === 'number' && value.toString().length === 13) {
    try {
      const date = new Date(value);
      // 验证日期有效性
      if (!isNaN(date.getTime())) {
        // 格式化为 YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // 继续尝试其他格式
    }
  }
  
  // 如果是数字且是10位时间戳（秒）
  if (typeof value === 'number' && value.toString().length === 10) {
    try {
      const date = new Date(value * 1000);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // 继续尝试其他格式
    }
  }
  
  // 如果已经是日期字符串，直接返回
  if (typeof value === 'string') {
    // 已经是 YYYY-MM-DD 格式
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value;
    }
    // 尝试从字符串中解析时间戳
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      return formatTimestamp(numValue);
    }
  }
  
  return String(value);
};

// 通用函数：从飞书 SDK 返回的复杂单元格数据中提取纯文本/值
const extractFeishuCellValue = (cellData: any): string => {
  // 1. 处理空值
  if (cellData === null || cellData === undefined) {
    return '';
  }

  // 2. 如果是数组 (飞书最常见的情况：文本、日期、人员、单选、多选等)
  if (Array.isArray(cellData)) {
    if (cellData.length === 0) return ''; // 空数组
    
    // 多选字段：遍历数组提取每个元素的文本并拼接
    const values = cellData.map(item => {
      if (typeof item === 'object' && item !== null) {
        // 优先级：text > name > value > url > id
        return item.text || item.name || item.value || item.url || String(item.id || '');
      }
      return String(item);
    });
    
    return values.filter(v => v !== '').join(', ');
  }

  // 3. 如果是对象 (数组里的元素，或者直接返回的对象)
  if (typeof cellData === 'object' && cellData !== null) {
    // 飞书某些字段格式为 {type: 'text', text: '实际内容'}
    // 优先处理这种格式
    if (cellData.text !== undefined) return String(cellData.text);
    if (cellData.name !== undefined && cellData.name !== '') return String(cellData.name);
    if (cellData.title !== undefined && cellData.title !== '') return String(cellData.title);
    if (cellData.label !== undefined && cellData.label !== '') return String(cellData.label);
    if (cellData.status !== undefined && cellData.status !== '') return String(cellData.status);
    if (cellData.value !== undefined && cellData.value !== '') return String(cellData.value);
    if (cellData.enumValue !== undefined && cellData.enumValue !== '') return String(cellData.enumValue);
    if (cellData.url !== undefined) return String(cellData.url);
    if (cellData.id !== undefined) return String(cellData.id);
    
    // 如果都找不到，返回 JSON 字符串以便调试
    try {
      return JSON.stringify(cellData).slice(0, 50);
    } catch (e) {
      return '[对象]';
    }
  }

  // 4. 基础类型 (字符串、数字、布尔)，直接返回
  return String(cellData);
};

// 格式化字段值的通用函数 - 仅用于纯文本场景
const formatFieldValue = (key: string, value: any): string => {
  // 处理日期相关字段
  if (key.includes('日期') || key.includes('date') || key.includes('Date') || key.includes('time') || key.includes('Time')) {
    return formatTimestamp(value);
  }
  
  // 处理所有其他字段（包括状态/流程、单选、多选等）
  // 使用统一的 extractFeishuCellValue 函数处理所有字段类型
  const extractedValue = extractFeishuCellValue(value);
  
  // 确保返回字符串，防止对象直接渲染导致错误
  // 注意：虽然 extractFeishuCellValue 声明返回 string，但运行时可能返回对象
  const valueAsAny = extractedValue as any;
  if (typeof valueAsAny === 'object' && valueAsAny !== null) {
    // 尝试从对象中提取可读的文本
    if (valueAsAny.text !== undefined) return String(valueAsAny.text);
    if (valueAsAny.name !== undefined) return String(valueAsAny.name);
    if (valueAsAny.value !== undefined) return String(valueAsAny.value);
    // 兜底：返回 JSON 字符串
    try {
      return JSON.stringify(valueAsAny).slice(0, 50);
    } catch {
      return '[对象]';
    }
  }
  
  // 对空值做特殊处理
  if (extractedValue === null || extractedValue === undefined || extractedValue === '') {
    // 状态/流程字段显示"未设置"，其他显示"-"
    if (key.includes('状态') || key.includes('status') || key.includes('Status') || key.includes('流程') || key.includes('workflow') || key.includes('Workflow')) {
      return '未设置';
    }
    return '-';
  }
  
  return String(extractedValue);
};

// ==================== 附件URL调试函数 ====================
// 用于测试 getAttachmentUrls API 是否能获取附件URL
const debugAttachmentUrls = async (recordId: string, fieldId: string, fieldName: string) => {
  try {
    const { bitable } = await import('@lark-base-open/js-sdk');
    const base = await bitable.base;
    const table = await base.getActiveTable();
    const attachmentField = await table.getField(fieldId);
    const attachmentUrls = await (attachmentField as any).getAttachmentUrls(recordId);
    return attachmentUrls;
  } catch (error) {
    return null;
  }
};

// 检查记录中的附件字段并调试
const debugRecordAttachments = async (record: any, fieldMetaList: any[]) => {
  console.log('[AttachmentDebug] 开始检查记录中的附件字段');
  
  // 查找附件类型字段
  const attachmentFields = fieldMetaList.filter(f => f.type === 17 || f.type === 'Attachment'); // 17 是附件字段类型
  console.log('[AttachmentDebug] 找到附件字段数量:', attachmentFields.length);
  
  if (attachmentFields.length === 0) {
    console.log('[AttachmentDebug] 没有找到附件字段');
    return;
  }
  
  for (const field of attachmentFields) {
    console.log(`[AttachmentDebug] 检查附件字段: ${field.name} (ID: ${field.id})`);
    
    // 获取字段值
    const fieldValue = record[field.id] || record[field.name];
    console.log(`[AttachmentDebug] 字段值:`, fieldValue);
    
    if (fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0) {
      console.log(`[AttachmentDebug] 字段包含 ${fieldValue.length} 个附件`);
      
      // 测试 getAttachmentUrls API
      await debugAttachmentUrls(record.id || record._sourceRecordId, field.id, field.name);
      
      // 同时输出直接从 record 获取的 URL
      console.log('[AttachmentDebug] 从 record 直接获取的 URL:');
      fieldValue.forEach((item: any, idx: number) => {
        console.log(`[AttachmentDebug] [${idx}] name: ${item.name || item.fileName}`);
        console.log(`[AttachmentDebug] [${idx}] url: ${(item.url || item.fileUrl || '').substring(0, 100)}...`);
        console.log(`[AttachmentDebug] [${idx}] token: ${item.token || '无 token'}`);
        console.log(`[AttachmentDebug] [${idx}] type: ${item.type || item.mimeType || '未知类型'}`);
      });
    }
  }
};
// ==================== 附件URL调试函数结束 ====================

// ==================== 专用附件处理服务（基于飞书JS-SDK） ====================

/**
 * 附件处理器类
 * 专门处理飞书多维表格附件字段的识别、URL获取和HTML转换
 */
class AttachmentProcessor {
  private urlCache = new Map<string, { url: string; expiry: number }>();
  
  /**
   * 【简化修复】识别附件字段
   * 只根据飞书 FieldType 枚举判断，不再使用值特征扫描
   * FieldType.Attachment = 17
   */
  isAttachmentField(fieldValue: any, fieldType?: number | string): boolean {
    // 只根据字段元数据的 type 判断（FieldType.Attachment = 17）
    if (fieldType !== undefined) {
      const typeNum = typeof fieldType === 'string' ? parseInt(fieldType, 10) : fieldType;
      return typeNum === 17;
    }
    
    // 没有 fieldType 时，无法确定是否为附件字段，返回 false
    // 不再使用值特征扫描，避免误判
    return false;
  }
  
  /**
   * 获取附件临时URL（带缓存）
   * @param token - 附件token
   * @param fieldId - 字段ID
   * @param recordId - 记录ID
   * @param attachmentIndex - 附件在数组中的索引（用于获取对应URL）
   * @param table - 表格对象
   */
  async getAttachmentUrl(
    token: string, 
    fieldId: string, 
    recordId: string,
    attachmentIndex: number,
    table: any
  ): Promise<string | null> {
    const cacheKey = `${token}-${fieldId}-${recordId}`;
    
    // 检查缓存
    const cached = this.urlCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.url;
    }
    
    try {
      // 获取附件字段对象
      const attachmentField = await table.getField(fieldId);
      
      // 调用 getAttachmentUrls 方法获取临时URL
      let url: string | null = null;
      
      if (typeof (attachmentField as any).getAttachmentUrls === 'function') {
        const urls = await (attachmentField as any).getAttachmentUrls(recordId);
        // 【关键修复】根据索引获取对应的URL
        if (Array.isArray(urls) && urls.length > attachmentIndex) {
          url = urls[attachmentIndex];
          console.log(`[AttachmentProcessor] 通过 getAttachmentUrls 获取到URL，索引 ${attachmentIndex}:`, url?.substring(0, 50));
        } else {
          console.warn(`[AttachmentProcessor] URL数组长度 ${urls?.length} 小于索引 ${attachmentIndex}`);
        }
      }
      
      if (url) {
        // 缓存URL，设置9分钟过期（略小于飞书的有效期）
        this.urlCache.set(cacheKey, {
          url,
          expiry: Date.now() + 9 * 60 * 1000
        });
      }
      
      return url;
    } catch (error) {
      console.error(`[AttachmentProcessor] 获取附件URL失败:`, { token: token.substring(0, 20), error });
      return null;
    }
  }
  
  /**
   * 转换附件字段为HTML
   * @param attachmentData - 附件数据数组
   * @param fieldId - 字段ID
   * @param recordId - 记录ID
   * @param table - 表格对象
   * @param options - 输出选项 { includeFileName: 是否包含文件名, includeDetails: 是否包含详细信息 }
   * @returns HTML字符串
   */
  async convertAttachmentFieldToHTML(
    attachmentData: any[], 
    fieldId: string,
    recordId: string,
    table: any,
    options: { includeFileName?: boolean; includeDetails?: boolean } = {}
  ): Promise<string> {
    if (!attachmentData || attachmentData.length === 0) {
      return '';
    }
    
    try {
      // 处理每个附件
      const imageHtmls = await Promise.all(
        attachmentData.map(async (attachment, index) => {
          try {
            // 优先使用已有的URL（支持多种字段名）
            let url = attachment.url || attachment.fileUrl || attachment.tmpUrl || attachment.tmp_url || attachment.previewUrl;
            
            // 如果没有URL或URL已过期，尝试获取新的临时URL
            if (!url && attachment.token) {
              url = await this.getAttachmentUrl(
                attachment.token,
                fieldId,
                recordId,
                index,  // 【关键修复】传入附件索引，确保获取正确的URL
                table
              );
            }
            
            if (!url) {
              return `<div style="color: #999; padding: 5px; border: 1px dashed #ccc; margin: 5px 0;">
                       无法加载: ${attachment.name || '未命名附件'}
                     </div>`;
            }
            
            const name = attachment.name || attachment.fileName || `图片${index + 1}`;
            
            // 根据选项决定是否包含文件名
            const fileNameHtml = options.includeFileName ? `
                <div style="
                  font-size: 11px;
                  color: #6b7280;
                  margin-top: 4px;
                  max-width: 120px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                ">${name}</div>
            ` : '';
            
            // 根据选项决定是否包含详细信息（用于 advanced 模式）
            const detailsHtml = options.includeDetails ? `
                <div style="
                  font-size: 10px;
                  color: #9ca3af;
                  margin-top: 2px;
                  max-width: 120px;
                ">
                  <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">File: [${name}]</div>
                  <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">URL: [${url.substring(0, 30)}...]</div>
                </div>
            ` : '';
            
            return `
              <div style="
                display: inline-block;
                margin: 4px;
                text-align: center;
                vertical-align: top;
              ">
                <img 
                  src="${url}" 
                  alt="${name}"
                  style="
                    max-width: 120px;
                    max-height: 120px;
                    width: auto;
                    height: auto;
                    object-fit: contain;
                    border: 1px solid #e5e7eb;
                    border-radius: 4px;
                    padding: 2px;
                    background: #f9fafb;
                  "
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                />
                <div style="
                  display: none;
                  padding: 8px;
                  background: #f3f4f6;
                  border-radius: 4px;
                  font-size: 12px;
                  color: #6b7280;
                  max-width: 120px;
                  word-break: break-word;
                ">${name}</div>
                ${fileNameHtml}${detailsHtml}
              </div>
            `;
          } catch (error) {
            console.warn(`[AttachmentProcessor] 处理单个附件失败:`, attachment.name, error);
            return `<div style="color: #999; padding: 5px;">加载失败</div>`;
          }
        })
      );
      
      return `<div style="display: flex; flex-wrap: wrap; gap: 4px;">${imageHtmls.join('')}</div>`;
    } catch (error) {
      console.error('[AttachmentProcessor] 转换附件字段失败:', error);
      // 降级：显示文件名列表
      const fileNames = attachmentData
        .map(a => a.name || a.fileName || '未命名附件')
        .join(', ');
      return `<span style="color: #6b7280; font-style: italic;">${fileNames}</span>`;
    }
  }
  
  /**
   * 处理记录中的所有附件字段
   * @param record - 记录数据
   * @param fieldMetaList - 字段元数据列表
   * @param table - 表格对象
   * @returns 处理后的记录数据（包含HTML格式的附件字段）
   */
  async processRecordAttachments(
    record: Record<string, any>,
    fieldMetaList: any[],
    table: any
  ): Promise<Record<string, any>> {
    // 创建深拷贝，避免修改原始数据引用
    const processedRecord = JSON.parse(JSON.stringify(record));
    
    // 【简化修复】只使用字段元数据的 type 属性识别附件字段（FieldType.Attachment = 17）
    // 不再使用值特征扫描，避免误判
    const attachmentFieldMetas = fieldMetaList.filter(f => {
      const typeNum = typeof f.type === 'string' ? parseInt(f.type, 10) : f.type;
      return typeNum === 17;
    });
    
    console.log(`[AttachmentProcessor] 字段元数据总数: ${fieldMetaList.length}`);
    console.log(`[AttachmentProcessor] 附件字段元数据 (type=17):`, attachmentFieldMetas.map(f => ({ id: f.id, name: f.name, type: f.type })));
    
    if (attachmentFieldMetas.length === 0) {
      console.log('[AttachmentProcessor] 没有附件字段元数据');
      return processedRecord;
    }
    
    // 收集所有附件处理Promise
    const processingResults: { fieldName: string; success: boolean; error?: string }[] = [];
    const processingPromises: Promise<void>[] = [];
    
    for (const fieldMeta of attachmentFieldMetas) {
      const fieldName = fieldMeta.name;
      const fieldId = fieldMeta.id;
      
      if (!fieldName) {
        console.warn('[AttachmentProcessor] 字段元数据缺少 name:', fieldMeta);
        continue;
      }
      
      // 从记录中获取字段值
      let fieldValue = processedRecord[fieldName];
      
      // 如果字段名找不到，尝试用字段ID查找
      if (fieldValue === undefined && fieldId) {
        fieldValue = processedRecord[fieldId];
      }
      
      if (fieldValue === undefined) {
        console.log(`[AttachmentProcessor] 记录中不存在字段 "${fieldName}" (ID: ${fieldId})`);
        continue;
      }
      
      console.log(`[AttachmentProcessor] 检查字段 "${fieldName}" (ID: ${fieldId}):`, 
        Array.isArray(fieldValue) ? `数组(${fieldValue.length}项)` : typeof fieldValue
      );
      
      // 只处理数组类型的附件字段
      if (!Array.isArray(fieldValue)) {
        console.log(`[AttachmentProcessor] ⚠️ 字段 "${fieldName}" 不是数组，跳过:`, typeof fieldValue);
        continue;
      }
      
      console.log(`[AttachmentProcessor] ✅ 确认是附件字段: ${fieldName} (${fieldValue.length} 个附件)`);
      
      if (fieldValue.length > 0) {
        console.log(`[AttachmentProcessor] 附件数据样例:`, {
          name: fieldValue[0].name,
          type: fieldValue[0].type,
          hasToken: !!(fieldValue[0].token || fieldValue[0].fileToken),
          hasUrl: !!(fieldValue[0].url || fieldValue[0].fileUrl || fieldValue[0].tmpUrl)
        });
      }
      
      const processPromise = (async () => {
        try {
          // 确保获取正确的记录ID
          const recordId = processedRecord.id || processedRecord._sourceRecordId || processedRecord.recordId;
          
          if (!recordId) {
            console.error(`[AttachmentProcessor] ❌ 无法获取记录ID用于处理附件字段 "${fieldName}"`);
            processingResults.push({ fieldName, success: false, error: '缺少记录ID' });
            return;
          }
          
          // 【修改】默认生成纯图片HTML（不包含文件名），渲染时根据配置决定是否显示
          // 文件名单独存储在 _${fieldName}_names 字段
          const htmlContent = await this.convertAttachmentFieldToHTML(
            fieldValue, 
            fieldId || fieldName, 
            recordId,
            table,
            { includeFileName: false, includeDetails: false }  // 默认纯图片模式
          );
          
          // 提取文件名列表单独存储，供渲染时使用
          const fileNames = fieldValue.map((a: any) => a.name || a.fileName || '未命名附件');
          
          // 存储处理后的HTML内容
          if (htmlContent) {
            // 保留原始附件数组数据
            processedRecord[fieldName] = fieldValue;
            // HTML 内容存储在 _字段名_html 中（默认纯图片）
            processedRecord[`_${fieldName}_html`] = htmlContent;
            // 文件名列表存储在 _字段名_names 中
            processedRecord[`_${fieldName}_names`] = fileNames;
            processingResults.push({ fieldName, success: true });
            console.log(`[AttachmentProcessor] ✅ 附件字段 "${fieldName}" 处理完成，HTML存储在 _${fieldName}_html`);
            
            // 同时按字段ID存储HTML
            if (fieldId && fieldId !== fieldName) {
              processedRecord[fieldId] = fieldValue;
              processedRecord[`_${fieldId}_html`] = htmlContent;
            }
          } else {
            processingResults.push({ fieldName, success: false, error: 'HTML内容为空' });
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          processingResults.push({ fieldName, success: false, error: errorMsg });
          console.error(`[AttachmentProcessor] ❌ 处理附件字段 "${fieldName}" 失败:`, error);
        }
      })();
      
      processingPromises.push(processPromise);
    }
    
    // 等待所有附件处理完成
    if (processingPromises.length > 0) {
      await Promise.allSettled(processingPromises);
      const successCount = processingResults.filter(r => r.success).length;
      console.log(`[AttachmentProcessor] 所有附件字段处理完成，成功: ${successCount}/${processingResults.length}`);
    }
    
    // 【调试】验证 processedRecord 中是否有 _html 字段
    const htmlFields = Object.keys(processedRecord).filter(k => k.includes('_html'));
    console.log('[AttachmentProcessor] 返回前验证，所有 _html 字段:', htmlFields);
    if (htmlFields.length > 0) {
      htmlFields.forEach(field => {
        const value = processedRecord[field];
        console.log(`[AttachmentProcessor]   ${field}: 类型=${typeof value}, 长度=${typeof value === 'string' ? value.length : 0}`);
      });
    } else {
      console.warn('[AttachmentProcessor] ⚠️ 没有找到任何 _html 字段！');
    }
    
    return processedRecord;
  }
}

// 创建全局附件处理器实例
const attachmentProcessor = new AttachmentProcessor();

// 便捷函数：识别附件字段（向后兼容）
const isAttachmentField = (fieldValue: any): boolean => {
  return attachmentProcessor.isAttachmentField(fieldValue);
};

// 便捷函数：处理记录附件（向后兼容）
async function processRecordAttachments(
  record: Record<string, any>,
  fieldMetaList: any[],
  table: any
): Promise<Record<string, any>> {
  return attachmentProcessor.processRecordAttachments(record, fieldMetaList, table);
}

// ==================== 专用附件处理服务结束 ====================

// 格式化字段值为带样式的HTML（用于打印预览）
const formatFieldValueToHTML = (key: string, value: any, textStyle?: any): string => {
  // 构建基础样式字符串
  let baseStyleStr = '';
  if (textStyle) {
    const styleParts: string[] = [];
    if (textStyle.fontSize) styleParts.push(`font-size: ${textStyle.fontSize}px`);
    if (textStyle.bold) styleParts.push('font-weight: bold');
    else if (textStyle.fontWeight) styleParts.push(`font-weight: ${textStyle.fontWeight}`);
    if (textStyle.italic) styleParts.push('font-style: italic');
    if (textStyle.color) styleParts.push(`color: ${textStyle.color}`);
    if (textStyle.backgroundColor) styleParts.push(`background-color: ${textStyle.backgroundColor}`);
    if (textStyle.align) styleParts.push(`text-align: ${textStyle.align}`);
    if (textStyle.lineHeight) styleParts.push(`line-height: ${textStyle.lineHeight}`);
    if (textStyle.underline) styleParts.push('text-decoration: underline');
    else if (textStyle.textDecoration) styleParts.push(`text-decoration: ${textStyle.textDecoration}`);
    if (textStyle.textTransform) styleParts.push(`text-transform: ${textStyle.textTransform}`);
    baseStyleStr = styleParts.join('; ');
  }
  
  // 对空值做特殊处理
  if (value === null || value === undefined) {
    // 状态/流程字段显示"未设置"，其他显示"-"
    const emptyStyle = baseStyleStr ? `style="${baseStyleStr}; color: #9ca3af;"` : 'style="color: #9ca3af;"';
    if (key.includes('状态') || key.includes('status') || key.includes('Status') || key.includes('流程') || key.includes('workflow') || key.includes('Workflow')) {
      return `<span ${emptyStyle}>未设置</span>`;
    }
    return `<span ${emptyStyle}>-</span>`;
  }
  
  // 处理日期相关字段
  if (key.includes('日期') || key.includes('date') || key.includes('Date') || key.includes('time') || key.includes('Time')) {
    const dateValue = formatTimestamp(value);
    if (baseStyleStr) {
      return `<span style="${baseStyleStr}">${dateValue}</span>`;
    }
    return dateValue;
  }
  
  // 检查是否是图片附件
  // 附件字段数据格式：[{name: 'xxx.jpg', url: '...', type: 'image/jpeg', token: '...'}, ...]
  const isImageAttachment = (item: any): boolean => {
    if (typeof item !== 'object' || item === null) return false;
    const name = item.name || item.fileName || '';
    const url = item.url || item.fileUrl || '';
    const type = item.type || item.mimeType || '';
    // 检查文件名后缀或类型
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const isImageByName = imageExtensions.some(ext => name.toLowerCase().endsWith(ext));
    const isImageByType = type.startsWith('image/');
    return isImageByName || isImageByType;
  };

  // 检查值是否已经是HTML字符串（通过附件处理器转换后的）
  // 更精确地检测附件HTML：包含 <img 或 <div 标签
  if (typeof value === 'string' && (value.includes('<img') || (value.includes('<') && value.includes('</div>')))) {
    // 确认是HTML内容，直接返回
    console.log(`[formatFieldValueToHTML] 检测到HTML字符串，直接返回，长度: ${value.length}`);
    return value;
  }
  
  // 单个图片附件（直接对象格式）
  if (!Array.isArray(value) && isImageAttachment(value)) {
    const url = value.url || value.fileUrl || '';
    const name = value.name || value.fileName || '图片';
    if (url) {
      return `
        <div style="text-align: center;">
          <img 
            src="${url}" 
            alt="${name}"
            style="
              max-width: 200px;
              max-height: 200px;
              width: auto;
              height: auto;
              object-fit: contain;
              border: 1px solid #e5e7eb;
              border-radius: 4px;
              padding: 4px;
              background: #f9fafb;
            "
            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
          />
          <div style="
            display: none;
            padding: 8px;
            background: #f3f4f6;
            border-radius: 4px;
            font-size: 12px;
            color: #6b7280;
          ">${name}</div>
        </div>
      `;
    }
  }
  
  // 检查是否是流程选项（有颜色信息）
  if (!Array.isArray(value) && isImageAttachment(value)) {
    const url = value.url || value.fileUrl || '';
    const name = value.name || value.fileName || '图片';
    if (url) {
      return `
        <div style="text-align: center;">
          <img 
            src="${url}" 
            alt="${name}"
            style="
              max-width: 200px;
              max-height: 200px;
              width: auto;
              height: auto;
              object-fit: contain;
              border: 1px solid #e5e7eb;
              border-radius: 4px;
              padding: 4px;
              background: #f9fafb;
            "
            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
          />
          <div style="
            display: none;
            padding: 8px;
            background: #f3f4f6;
            border-radius: 4px;
            font-size: 12px;
            color: #6b7280;
          ">${name}</div>
        </div>
      `;
    }
  }
  
  // 检查是否是流程选项（有颜色信息）
  // 流程字段数据通常是数组，每个元素有 text, color, bgColor 等属性
  let isWorkflowOption = false;
  let optionText = '';
  let optionColor = '';
  let optionBgColor = '';
  
  if (Array.isArray(value) && value.length > 0) {
    const firstItem = value[0];
    if (typeof firstItem === 'object' && firstItem !== null) {
      // 检查是否有颜色相关字段
      if (firstItem.text && (firstItem.color || firstItem.bgColor || firstItem.textColor || firstItem.backgroundColor)) {
        isWorkflowOption = true;
        optionText = firstItem.text;
        optionColor = firstItem.textColor || firstItem.color || '#000000';
        optionBgColor = firstItem.backgroundColor || firstItem.bgColor || '#f3f4f6';
      }
    }
  }
  
  // 如果是单个对象（非数组）
  if (!isWorkflowOption && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    if (value.text && (value.color || value.bgColor || value.textColor || value.backgroundColor)) {
      isWorkflowOption = true;
      optionText = value.text;
      optionColor = value.textColor || value.color || '#000000';
      optionBgColor = value.backgroundColor || value.bgColor || '#f3f4f6';
    }
  }
  
  if (isWorkflowOption) {
    // 合并基础样式和流程选项样式
    const combinedStyle = [
      baseStyleStr,
      'display: inline-block',
      'padding: 2px 8px',
      'border-radius: 4px',
      'font-size: 0.85em',
      'font-weight: 500',
      `color: ${optionColor}`,
      `background-color: ${optionBgColor}`,
      '-webkit-print-color-adjust: exact',
      'print-color-adjust: exact'
    ].filter(Boolean).join('; ');
    
    // 生成带颜色样式的 HTML（类似 VariableTextRenderer）
    return `<span style="${combinedStyle}">${optionText}</span>`;
  }
  
  // 对于普通字段，使用纯文本，但应用样式
  const plainValue = formatFieldValue(key, value);
  if (baseStyleStr) {
    return `<span style="${baseStyleStr}">${plainValue}</span>`;
  }
  return plainValue;
};

// 检测模板中的变量 - 支持 [字段名] 和 {{字段名}} 两种格式
const extractVariablesFromComponents = (components: any[]): string[] => {
  const variables: string[] = [];
  // 支持 [字段名]、[字段名:格式]、{{字段名}}、{{字段名:格式}}
  const variableRegex = /\[([^\]]+)(?::([^\]]+))?\]|\{\{([^}]+)(?::([^}]+))?\}\}/g;

  const traverse = (comp: any, depth: number = 0) => {
    if (!comp) return;

    // 检测文本中的变量
    const extractFromText = (text: string) => {
      if (!text) return;
      let match;
      // 必须重置 regex 的 lastIndex
      variableRegex.lastIndex = 0;
      while ((match = variableRegex.exec(text)) !== null) {
        // match[1] 是 [字段名] 的字段名, match[3] 是 {{字段名}} 的字段名
        const varName = (match[1] || match[3])?.trim();
        if (varName && !variables.includes(varName)) {
          variables.push(varName);
        }
      }
    };

    if (comp.text) extractFromText(comp.text);
    if (comp.content) extractFromText(comp.content);

    // 递归检查子组件
    if (comp.children && Array.isArray(comp.children)) {
      comp.children.forEach((child: any) => traverse(child, depth + 1));
    }
  };

  components.forEach((comp, idx) => traverse(comp, 0));
  return variables;
};

// 安全地构建样式对象，避免不合法的 CSS 属性
const buildSafeStyle = (baseStyle: any, additionalStyle: any): React.CSSProperties => {
  const safeStyle: React.CSSProperties = { ...baseStyle };
  
  // 只添加合法的 CSS 属性，避免索引属性
  if (additionalStyle && typeof additionalStyle === 'object') {
    Object.keys(additionalStyle).forEach(key => {
      // 跳过数字索引属性（如 [0], [1] 等）
      if (!/^\d+$/.test(key)) {
        const value = additionalStyle[key];
        // 只添加有意义的值
        if (value !== undefined && value !== null && value !== '') {
          (safeStyle as any)[key] = value;
        }
      }
    });
  }
  
  return safeStyle;
};

// 替换文本中的变量为实际值 - 支持 [字段名] 和 {{字段名}} 两种格式（纯文本版本）
const replaceVariables = (text: string, data: Record<string, any>): string => {
  if (!text || typeof text !== 'string') return text;

  // 支持 [字段名]、[字段名:格式]、{{字段名}}、{{字段名:格式}}
  return text.replace(/\[([^\]]+)(?::([^\]]+))?\]|\{\{([^}]+)(?::([^}]+))?\}\}/g, (match, bracketName, bracketFormat, braceName, braceFormat) => {
    const varName = (bracketName || braceName)?.trim();
    if (!varName) return match;
    
    const value = data[varName];
    if (value === undefined || value === null) {
      return match; // 保留原变量格式
    }
    
    // 使用 formatFieldValue 格式化字段值，特别是流程字段和日期字段
    return formatFieldValue(varName, value);
  });
};

/**
 * 替换文本中的变量为带样式的HTML - 用于打印预览（HTML版本）
 * 🔒 [已验证] 核心功能：支持附件字段的 HTML 渲染
 */
const replaceVariablesToHTML = (text: string, data: Record<string, any>, textStyle?: any): string => {
  if (!text || typeof text !== 'string') return text;

  // 支持 [字段名]、[字段名:格式]、{{字段名}}、{{字段名:格式}}
  return text.replace(/\[([^\]]+)(?::([^\]]+))?\]|\{\{([^}]+)(?::([^}]+))?\}\}/g, (match, bracketName, bracketFormat, braceName, braceFormat) => {
    const varName = (bracketName || braceName)?.trim();
    if (!varName) return match;
    
    // lock
    // [核心逻辑] 优先使用预处理的HTML内容（_字段名_html），用于附件等复杂字段
    const htmlValue = data[`_${varName}_html`];
    const originalValue = data[varName];
    
    // 如果有预处理的HTML内容，直接使用它
    if (htmlValue !== undefined && htmlValue !== null) {
      return htmlValue;
    }
    // lock
    
    if (originalValue === undefined || originalValue === null) {
      return match; // 保留原变量格式
    }
    
    // 使用 formatFieldValueToHTML 格式化字段值，特别是流程字段的颜色样式
    return formatFieldValueToHTML(varName, originalValue, textStyle);
  });
};

// 渲染表格组件
const renderTableComponent = (component: any, data: Record<string, any>): React.ReactNode => {
  const { id, tableConfig, style = {} } = component;
  
  if (!tableConfig) {
    return null;
  }

  const { cells = [], borderWidth = 1, borderColor = '#000000', showOuterBorder = true, showInnerBorder = true } = tableConfig;

  // 计算列宽 - 如果有 colWidths 配置则使用，否则平均分配
  const colWidths = tableConfig.colWidths || [];
  const maxCols = cells.reduce((max: number, row: any[]) => {
    const visibleCols = row.filter((cell: any) => {
      const rowSpan = cell?.rowSpan ?? 1;
      const colSpan = cell?.colSpan ?? 1;
      return rowSpan > 0 && colSpan > 0;
    }).length;
    return Math.max(max, visibleCols);
  }, 0);

  // 简化表格容器样式 - 让表格自然流动在纸张容器内
  const tableContainerStyle = buildSafeStyle({
    position: 'relative',
    width: '100%',             // 相对于父容器（纸张）的宽度
    maxWidth: '100%',          // 【关键】限制最大宽度为父容器宽度
    boxSizing: 'border-box',
    marginLeft: '0',
    marginRight: '0',
    overflow: 'hidden',        // 【关键】隐藏溢出内容
  }, style);

  return (
    <div 
      key={id}
      style={tableContainerStyle}
    >
      <table 
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          maxWidth: '100%',        // 【关键】限制表格最大宽度
          tableLayout: 'fixed',    // 【关键】固定表格布局，防止内容撑开
          border: showOuterBorder ? `${borderWidth}px solid ${borderColor}` : 'none',
        }}
      >
        <tbody>
          {cells.map((row: any[], rowIndex: number) => {
            // 过滤掉 rowSpan 或 colSpan 为 0 的单元格（被合并的单元格）
            const visibleCells = row.filter((cell: any) => {
              const rowSpan = cell?.rowSpan ?? 1;
              const colSpan = cell?.colSpan ?? 1;
              return rowSpan > 0 && colSpan > 0;
            });
            
            if (visibleCells.length === 0) return null;

            return (
              <tr key={rowIndex}>
                {visibleCells.map((cell: any, colIndex: number) => {
                  if (!cell) return null;
                  
                  const rowSpan = cell.rowSpan ?? 1;
                  const colSpan = cell.colSpan ?? 1;
                  const content = cell.content || '';
                  // lock
                  // [已验证] 使用 replaceVariablesToHTML 支持附件字段的 HTML 渲染
                  // 优先使用预处理的 _字段名_html 字段，确保附件图片正确显示
                  const processedContent = replaceVariablesToHTML(content, data, cell.style);
                  // lock
                  
                  // 获取列宽配置
                  const colWidth = colWidths[colIndex];
                  
                  return (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      rowSpan={rowSpan > 1 ? rowSpan : undefined}
                      colSpan={colSpan > 1 ? colSpan : undefined}
                      style={buildSafeStyle({
                        border: showInnerBorder ? `${borderWidth}px solid ${borderColor}` : 'none',
                        padding: '8px',
                        verticalAlign: 'top',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        width: colWidth ? `${colWidth}px` : `${100 / maxCols}%`, // 【关键】设置列宽
                        minWidth: colWidth ? `${colWidth}px` : undefined,
                        maxWidth: colWidth ? `${colWidth}px` : `${100 / maxCols}%`,
                      }, cell.style)}
                    >
                      {/* lock */}
                      {/* [已验证] 检测内容是否包含 HTML 标签，使用 dangerouslySetInnerHTML 渲染 */}
                      {processedContent && processedContent.includes('<') ? (
                        <span dangerouslySetInnerHTML={{ __html: processedContent }} />
                      ) : (
                        processedContent
                      )}
                      {/* lock */}
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

// 将组件渲染为 HTML 字符串（用于打印）
const renderComponentToHTML = (component: any, data: Record<string, any>): string => {
  if (!component) return '';

  const { type, text, content, style = {}, textStyle = {} } = component;
  
  // 兼容处理：编辑器中使用 textStyle，模板预览中可能使用 style
  const actualTextStyle = Object.keys(textStyle).length > 0 ? textStyle : style;
  
  const processedText = text ? replaceVariablesToHTML(text, data, actualTextStyle) : '';
  const processedContent = content ? replaceVariablesToHTML(content, data, actualTextStyle) : '';
  
  // 计算宽度 - 与 CanvasArea.tsx 保持一致
  const getWidthCalc = (width: string) => {
    const gap = 12;
    switch (width) {
      case '50%': return `calc((100% - ${gap}px) / 2)`;
      case '33%': return `calc((100% - ${2 * gap}px) / 3)`;
      case '25%': return `calc((100% - ${3 * gap}px) / 4)`;
      default: return '100%';
    }
  };
  
  const styleStr = `
    position: relative;
    width: ${getWidthCalc(component.layout?.width || '100%')};
    flex-shrink: 0;
    max-width: 100%;
    font-size: ${style.fontSize || '16px'};
    font-weight: ${style.fontWeight || 'normal'};
    color: ${style.color || '#000000'};
    background-color: ${style.backgroundColor || 'transparent'};
    padding: ${style.padding || '0'};
    text-align: ${style.textAlign || 'left'};
    white-space: pre-wrap;
    word-wrap: break-word;
    box-sizing: border-box;
    overflow-x: visible;
  `;

  switch (type) {
    case 'text':
      return `<div style="${styleStr}">${processedContent || processedText}</div>`;
    case 'table':
      // 渲染表格为 HTML
      if (component.tableConfig) {
        const { cells = [], colWidths = [], borderWidth = 1, borderColor = '#000000', showOuterBorder = true, showInnerBorder = true } = component.tableConfig;
        
        // 计算最大列数
        const maxCols = cells.reduce((max: number, row: any[]) => {
          const visibleCols = row.filter((cell: any) => {
            const rowSpan = cell?.rowSpan ?? 1;
            const colSpan = cell?.colSpan ?? 1;
            return rowSpan > 0 && colSpan > 0;
          }).length;
          return Math.max(max, visibleCols);
        }, 0);
        
        const tableHtml = `
          <table style="
            border-collapse: collapse;
            width: 100%;
            max-width: 100%;
            table-layout: fixed;
            border: ${showOuterBorder ? `${borderWidth}px solid ${borderColor}` : 'none'};
          ">
            <tbody>
              ${cells.map((row: any[], rowIndex: number) => {
                const visibleCells = row.filter((cell: any) => {
                  const rowSpan = cell?.rowSpan ?? 1;
                  const colSpan = cell?.colSpan ?? 1;
                  return rowSpan > 0 && colSpan > 0;
                });
                if (visibleCells.length === 0) return '';
                return `
                  <tr>
                    ${visibleCells.map((cell: any, colIndex: number) => {
                      if (!cell) return '';
                      const rowSpan = cell.rowSpan ?? 1;
                      const colSpan = cell.colSpan ?? 1;
                      const content = cell.content || '';
                      const cellStyle = cell.style || {};
                      const processedContent = replaceVariablesToHTML(content, data, cellStyle);
                      // 获取列宽配置
                      const colWidth = colWidths[colIndex];
                      const cellWidth = colWidth ? `${colWidth}px` : `${100 / maxCols}%`;
                      return `
                        <td 
                          ${rowSpan > 1 ? `rowspan="${rowSpan}"` : ''}
                          ${colSpan > 1 ? `colspan="${colSpan}"` : ''}
                          style="
                            border: ${showInnerBorder ? `${borderWidth}px solid ${borderColor}` : 'none'};
                            padding: 8px;
                            vertical-align: top;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                            overflow-wrap: break-word;
                            width: ${cellWidth};
                            max-width: ${cellWidth};
                          "
                        >${processedContent}</td>
                      `;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
        return `<div style="${styleStr}">${tableHtml}</div>`;
      }
      return `<div style="${styleStr}">[表格]</div>`;
    case 'qrcode':
      return `<div style="${styleStr}">QR</div>`;
    case 'barcode':
      return `<div style="${styleStr}">||||||||||</div>`;
    default:
      return `<div style="${styleStr}">${processedContent || processedText}</div>`;
  }
};

// 获取组件宽度样式 - 与 CanvasArea.tsx 保持一致
function getComponentWidthStyle(width: string) {
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
}

// 渲染单个组件（带变量替换）
const renderComponent = (component: any, data: Record<string, any>, fieldTypeMap: FieldTypeMap = {}, fieldIdMap: Record<string, string> = {}): React.ReactNode => {
  if (!component) {
    return null;
  }

  const {
    id,
    type,
    text,
    content,
    style = {},
    textStyle = {},
    children = [],
  } = component;

  // 表格组件特殊处理
  if (type === 'table') {
    return renderTableComponent(component, data);
  }

  // 替换变量 - 优先使用 content，其次使用 text
  const sourceText = content || text;
  
  // 【新架构】使用 MixedContentRenderer 处理混合内容（文本 + 变量）
  let processedContent: React.ReactNode = sourceText ? (
    <MixedContentRenderer 
      content={sourceText} 
      data={data}
      fieldTypeMap={fieldTypeMap} // 【关键修复】传递字段类型映射，确保附件字段正确识别
      fieldIdMap={fieldIdMap}    // 【关键修复】传递字段ID映射，用于获取附件URL
    />
  ) : undefined;

  // 兼容处理：编辑器中使用 textStyle，模板预览中可能使用 style
  const actualStyle = Object.keys(textStyle).length > 0 ? textStyle : style;

  // 使用统一的宽度计算
  const widthStyle = getComponentWidthStyle(component.layout?.width || '100%');

  const baseStyle: React.CSSProperties = {
    position: 'relative',
    ...widthStyle,
    maxWidth: '100%',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    overflow: 'visible',
    height: 'auto',
    minHeight: 'auto',
  };

  // 安全地添加样式属性 - 同时兼容 style 和 textStyle 的字段命名
  const commonStyle: React.CSSProperties = buildSafeStyle(baseStyle, {
    fontSize: actualStyle.fontSize,
    fontWeight: actualStyle.fontWeight || (actualStyle.bold ? 'bold' : 'normal'),
    color: actualStyle.color,
    backgroundColor: actualStyle.backgroundColor,
    borderWidth: actualStyle.borderWidth,
    borderColor: actualStyle.borderColor,
    borderStyle: actualStyle.borderWidth ? 'solid' : undefined,
    borderRadius: actualStyle.borderRadius,
    padding: actualStyle.padding,
    textAlign: actualStyle.textAlign || actualStyle.align,
  });

  switch (type) {
    case 'text':
    case 'paragraph':
    case 'heading':
      return (
        <div key={id} style={commonStyle}>
          {processedContent}
        </div>
      );
    case 'qrcode':
      return (
        <div
          key={id}
          style={{
            ...commonStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: actualStyle.backgroundColor || '#fff',
            border: '1px solid #e2e8f0',
            minHeight: '80px',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            QR
          </div>
        </div>
      );
    case 'barcode':
      return (
        <div
          key={id}
          style={{
            ...commonStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: actualStyle.backgroundColor || '#fff',
            border: '1px solid #e2e8f0',
            minHeight: '50px',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            ||||||||||
          </div>
        </div>
      );
    case 'container':
      return (
        <div key={id} style={commonStyle}>
          {children.map((child: any) => renderComponent(child, data, fieldTypeMap, fieldIdMap))}
        </div>
      );
    case 'fieldContainer': {
      // 字段容器组件：根据字段是否有值决定是否显示
      const fieldNames = component.fieldNames || [];
      const showCondition = component.showCondition || 'any'; // 默认：任意字段有值即显示
      const containerChildren = component.children || [];
      
      // 检查字段是否有值的辅助函数
      const checkFieldHasValue = (fieldName: string): boolean => {
        // 尝试直接用字段名查找
        let value = data[fieldName];
        
        // 如果没找到，尝试用字段ID查找
        if (value === undefined && fieldIdMap) {
          const fieldId = Object.entries(fieldIdMap).find(([_, name]) => name === fieldName)?.[0];
          if (fieldId) {
            value = data[fieldId];
          }
        }
        
        // 检查附件字段的预处理数据
        const htmlContent = data[`_${fieldName}_html`];
        const fileNames = data[`_${fieldName}_names`];
        
        // 如果有预处理的 HTML 内容，也算有值
        if (htmlContent && typeof htmlContent === 'string' && htmlContent.length > 0) {
          return true;
        }
        if (Array.isArray(fileNames) && fileNames.length > 0) {
          return true;
        }
        
        // 检查值是否有效
        if (value === null || value === undefined) return false;
        if (value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        
        return true;
      };
      
      // 没有数据时（模板预览模式）：显示容器内容（让用户看到模板结构）
      const isEmptyPreview = !data || Object.keys(data).length === 0;
      if (isEmptyPreview) {
        return (
          <div key={id} style={{ width: '100%' }}>
            {containerChildren.map((child: any) => renderComponent(child, data, fieldTypeMap, fieldIdMap))}
          </div>
        );
      }
      
      // 有数据时：检查字段是否有值
      const fieldValues = fieldNames.map((fieldName: string) => ({
        name: fieldName,
        hasValue: checkFieldHasValue(fieldName),
      }));
      
      // 根据显示条件判断
      const shouldShow = showCondition === 'all'
        ? fieldValues.every((f: { name: string; hasValue: boolean }) => f.hasValue)
        : fieldValues.some((f: { name: string; hasValue: boolean }) => f.hasValue);
      
      // 如果不应该显示，返回 null（不渲染任何内容）
      if (!shouldShow) {
        return null;
      }
      
      // 显示容器内容
      return (
        <div key={id} style={{ width: '100%' }}>
          {containerChildren.map((child: any) => renderComponent(child, data, fieldTypeMap, fieldIdMap))}
        </div>
      );
    }
    case 'line':
      return (
        <div 
          key={id} 
          style={{
            ...commonStyle,
            height: `${component.thickness || 1}px`,
            backgroundColor: component.color || '#000000',
            margin: '8px 0',
          }} 
        />
      );
    case 'image':
      return (
        <div
          key={id}
          style={{
            ...commonStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9fafb',
            border: '1px dashed #d1d5db',
            minHeight: component.minHeight || '150px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#9ca3af',
            }}
          >
            图片
          </div>
        </div>
      );
    default:
      return (
        <div key={id} style={commonStyle}>
          {processedContent}
        </div>
      );
  }
};

export function TemplatePreview({ baseId, tableId, onEditTemplate }: TemplatePreviewProps) {
  const { templates, fetchTemplates, setCurrentTemplate } = useTemplateStore();
  const {
    records: storeRecords,
    currentIndex,
    setRecords: setSelectedDataRecords,
    setCurrentIndex,
    nextRecord,
    prevRecord,
    isFromFeishu,
    setIsFromFeishu,
    getCurrentRecord,
  } = useSelectedDataStore();
  
  // 【关键修复】获取 editorStore 的 setRecords、addRecords 和 clearRecords 方法
  const { 
    setRecords: setEditorStoreRecords, 
    addRecords: addEditorStoreRecords,
    clearRecords: clearEditorStoreRecords,
  } = useEditorStore();

  // 使用飞书SDK（使用 feishu-env）
  const isFeishuEnvironment = feishuEnv.isFeishuEnvironment();

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showVariableMapping, setShowVariableMapping] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  // 新增状态：排版方式和选中数据列表
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('default');
  const [selectedRecords, setSelectedRecords] = useState<PreviewSelectedRecord[]>([]);
  const [availableRecords, setAvailableRecords] = useState<Record<string, any>[]>([]);
  
  // 表格匹配状态
  const [currentTableInfo, setCurrentTableInfo] = useState<{
    tableId: string | null;
    tableName: string | null;
    baseId: string | null;
  }>({ tableId: null, tableName: null, baseId: null });
  const [isTableMatched, setIsTableMatched] = useState<boolean>(true);
  const [cachedRecords, setCachedRecords] = useState<Record<string, any>[]>([]);
  
  // 用于事件去重：缓存上一次处理的 recordId 和 tableId
  const lastProcessedEventRef = useRef<{ recordId: string | null; tableId: string | null }>({ 
    recordId: null, 
    tableId: null 
  });
  
  // 请求锁：防止重复点击导致的数据重复提取
  const requestLockRef = useRef<{
    isLocked: boolean;
    lastRequestTime: number;
    minInterval: number; // 最小请求间隔（毫秒）
  }>({
    isLocked: false,
    lastRequestTime: 0,
    minInterval: 500, // 500ms 内不允许重复请求
  });
  
  // 忽略列表：存储用户手动删除的记录 ID，避免被飞书事件恢复
  const [ignoredRecordIds, setIgnoredRecordIds] = useState<Set<string>>(new Set());

  // 左侧区域展开状态（默认收起）
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // 页面设置状态
  const [isPageSettingsOpen, setIsPageSettingsOpen] = useState(false);
  const [localPageConfig, setLocalPageConfig] = useState<PageConfig>({
    size: 'A4',
    orientation: 'portrait',
    margins: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
    },
    continuous: false,
  });

  // 【关键修复】字段类型映射，用于正确识别附件字段（即使数据为空）
  const [fieldTypeMap, setFieldTypeMap] = useState<FieldTypeMap>({});
  
  // 【关键修复】字段ID映射，用于获取附件URL（字段名 -> 字段ID）
  const [fieldIdMap, setFieldIdMap] = useState<Record<string, string>>({});

  // 监听 selectedRecords 变化
  useEffect(() => {
    console.log('[TP] 选中记录变化:', selectedRecords.length, '条');
  }, [selectedRecords]);

  // 监听 availableRecords 变化 - 增强版监控
  useEffect(() => {
    console.log('[TP] 可用记录变化:', availableRecords.length, '条');
    
    // 调试：检查每条记录的附件字段状态
    availableRecords.forEach((record, idx) => {
      console.group(`[TP] 记录 ${idx} (${record.id}) 字段分析:`);
      
      // 检查所有可能的附件字段
      const attachmentFieldNames = Object.keys(record).filter(key => 
        key.includes('照片') || 
        key.includes('附件') || 
        key.includes('image') || 
        key.includes('attachment') ||
        key.includes('图片')
      );
      
      if (attachmentFieldNames.length === 0) {
        console.log('  未发现附件相关字段');
      } else {
        console.log('  发现附件相关字段:', attachmentFieldNames);
        
        attachmentFieldNames.forEach(fieldName => {
          const value = record[fieldName];
          const valueType = Array.isArray(value) ? 'array' : typeof value;
          // 【修复】检查 _xxx_html 字段是否存在
          const htmlFieldName = `_${fieldName}_html`;
          const htmlContent = record[htmlFieldName];
          const hasHTML = htmlContent && typeof htmlContent === 'string' && htmlContent.includes('<img');
          
          console.log(`  📎 ${fieldName}:`);
          console.log(`     类型: ${valueType}`);
          console.log(`     HTML字段(${htmlFieldName}): ${hasHTML ? '已生成' : '未生成'}`);
          
          if (hasHTML) {
            const imgCount = (htmlContent.match(/<img/g) || []).length;
            console.log(`     图片数量: ${imgCount}`);
            console.log(`     HTML长度: ${htmlContent.length}`);
            console.log(`     ✅ 数据结构正确：原始字段为数组，HTML已生成`);
          } else if (Array.isArray(value)) {
            // 【修复】原始字段是数组是正常的，只需检查是否生成了HTML
            console.log(`     ⚠️ 原始字段是数组（正常），但HTML未生成`);
            console.log(`     数组长度: ${value.length}`);
            if (value.length > 0) {
              console.log(`     第一项:`, value[0]);
            }
          } else if (typeof value === 'string' && value.includes('<img')) {
            // 兼容旧数据：直接存储为HTML字符串
            const imgCount = (value.match(/<img/g) || []).length;
            console.log(`     图片数量: ${imgCount}`);
            console.log(`     ✅ 直接存储为HTML字符串（兼容模式）`);
          } else if (typeof value === 'string') {
            console.log(`     内容预览: ${value.substring(0, 100)}...`);
          }
        });
      }
      
      console.groupEnd();
    });
    
    // 执行渲染验证
    if (availableRecords.length > 0) {
      validateRendering(availableRecords[0]);
    }
    
    // 【注意】不再在这里同步到 editorStore
    // fetchSelectedRecordsFromEnv 已经使用延迟同步处理了同步逻辑
    // 避免重复同步导致的竞态条件
  }, [availableRecords]);
  
  // 渲染验证函数
  const validateRendering = (record: Record<string, any>) => {
    const issues: string[] = [];
    
    console.group('🔍 渲染验证报告 - 数据传递层');
    
    if (!record) {
      issues.push('❌ 无记录数据');
      console.log('❌ 无记录数据');
      console.groupEnd();
      return issues;
    }
    
    console.log('📋 记录基本信息:');
    console.log('  - 记录ID:', record.id);
    console.log('  - 源记录ID:', record._sourceRecordId);
    console.log('  - 所有字段:', Object.keys(record));
    
    // 检查所有字段
    Object.entries(record).forEach(([fieldName, fieldValue]) => {
      // 检查附件相关字段（只检查原始字段，不检查 _xxx_html 字段）
      if ((fieldName.includes('照片') || fieldName.includes('附件') || fieldName.includes('image') || fieldName.includes('attachment')) 
          && !fieldName.startsWith('_')) {
        console.log(`\n📎 检查附件字段: "${fieldName}"`);
        
        // 检查是否有对应的 _html 字段
        const htmlFieldName = `_${fieldName}_html`;
        const htmlContent = record[htmlFieldName];
        
        if (fieldValue === undefined || fieldValue === null) {
          // 【修复】字段为空是正常情况（该记录可能没有附件），标记为警告而非错误
          issues.push(`⚠️ "${fieldName}" 字段为空`);
          console.log(`  ⚠️ 字段为空（该记录可能没有此附件）`);
        } else if (Array.isArray(fieldValue)) {
          // 【关键修复】原始字段是数组是正常的，应该检查 _html 字段是否存在
          console.log(`  📋 原始字段是数组（正常），长度: ${fieldValue.length}`);
          
          if (htmlContent && typeof htmlContent === 'string' && htmlContent.includes('<img')) {
            issues.push(`✅ "${fieldName}" 附件已预处理，HTML已生成`);
            console.log(`  ✅ 已预处理，HTML字段存在`);
            console.log(`  HTML长度: ${htmlContent.length}`);
            
            // 提取并测试所有图片URL
            testAllImageUrls(htmlContent).then(results => {
              const validCount = results.filter(r => r.valid).length;
              console.log(`  📊 ${validCount}/${results.length} 个URL有效`);
            });
          } else {
            issues.push(`⚠️ "${fieldName}" 原始数据存在，但未生成HTML`);
            console.log(`  ⚠️ 未找到 _html 字段或内容为空`);
            console.log(`  _html 字段值:`, htmlContent?.substring?.(0, 100) || '不存在');
          }
        } else if (typeof fieldValue === 'string') {
          // 检查是否是有效的HTML
          const hasImgTag = fieldValue.includes('<img');
          const hasDivTag = fieldValue.includes('<div');
          
          if (hasImgTag) {
            issues.push(`✅ "${fieldName}" 已正确转换为HTML（包含图片）`);
            console.log(`  ✅ 已正确转换为HTML（包含图片）`);
            console.log(`  HTML长度: ${fieldValue.length}`);
            
            // 提取并测试所有图片URL
            testAllImageUrls(fieldValue).then(results => {
              const validCount = results.filter(r => r.valid).length;
              console.log(`  📊 ${validCount}/${results.length} 个URL有效`);
            });
          } else if (hasDivTag) {
            issues.push(`✅ "${fieldName}" 是HTML字符串（无图片）`);
            console.log(`  ✅ 是HTML字符串（无图片）`);
            console.log(`  HTML长度: ${fieldValue.length}`);
          } else {
            issues.push(`⚠️ "${fieldName}" 是字符串但不是HTML`);
            console.log(`  ⚠️ 是字符串但不是HTML`);
            console.log(`  内容: ${fieldValue.substring(0, 200)}`);
          }
        } else {
          // 【修复】类型异常标记为警告，不阻断流程
          issues.push(`⚠️ "${fieldName}" 类型异常: ${typeof fieldValue}`);
          console.log(`  ⚠️ 类型异常: ${typeof fieldValue}`);
        }
      }
    });
    
    // 统计结果
    const successCount = issues.filter(i => i.startsWith('✅')).length;
    const errorCount = issues.filter(i => i.startsWith('❌')).length;
    const warningCount = issues.filter(i => i.startsWith('⚠️')).length;
    
    console.log('\n📊 验证统计:');
    console.log(`  ✅ 成功: ${successCount}`);
    console.log(`  ⚠️ 警告: ${warningCount}`);
    console.log(`  ❌ 错误: ${errorCount}`);
    
    // 【修复】只有真正的错误才输出严重问题警告
    // 空字段和类型异常现在都是警告，不再视为错误
    if (errorCount > 0) {
      console.error('🔴 发现严重问题，需要修复数据传递！');
    } else if (warningCount > 0) {
      console.log('🟡 数据传递完成，但有部分警告（可能是正常的空字段）');
    } else if (successCount > 0) {
      console.log('🟢 数据传递正常，HTML已正确生成');
    }
    
    console.groupEnd();
    
    return issues;
  };
  
  // 测试图片URL有效性 - 使用Image对象更准确地检测
  const testImageUrl = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      let timeoutId: NodeJS.Timeout;
      
      img.onload = () => {
        clearTimeout(timeoutId);
        console.log('✅ 图片加载测试成功:', url.substring(0, 60) + '...');
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        console.log('❌ 图片加载测试失败:', url.substring(0, 60) + '...');
        resolve(false);
      };
      
      // 设置超时
      timeoutId = setTimeout(() => {
        console.log('⏰ 图片加载超时:', url.substring(0, 60) + '...');
        resolve(false);
      }, 10000);
      
      img.src = url;
    });
  };
  
  // 批量测试HTML字符串中的所有图片URL
  const testAllImageUrls = async (htmlString: string) => {
    const imgTags = htmlString.match(/<img[^>]+src="([^">]+)"/g) || [];
    console.log(`[testAllImageUrls] 发现 ${imgTags.length} 个图片标签`);
    
    const results = await Promise.all(
      imgTags.map(async (tag, index) => {
        const srcMatch = tag.match(/src="([^">]+)"/);
        if (srcMatch && srcMatch[1]) {
          const url = srcMatch[1];
          console.log(`[testAllImageUrls] 测试图片 ${index + 1}: ${url.substring(0, 60)}...`);
          const isValid = await testImageUrl(url);
          return { url: url.substring(0, 80), valid: isValid, index: index + 1 };
        }
        return { url: 'invalid', valid: false, index: 0 };
      })
    );
    
    console.log('📊 URL批量测试结果:', results);
    return results;
  };

  // 加载模板列表
  useEffect(() => {
    console.log('[TemplatePreview] 开始加载模板列表...');
    fetchTemplates().then(() => {
      const loadedTemplates = useTemplateStore.getState().templates;
      console.log('[TemplatePreview] 模板列表加载完成:', loadedTemplates.map(t => ({ 
        id: t.id, 
        name: t.name, 
        userId: (t as any).user_id,
        hasComponents: !!t.data?.components?.length,
        componentCount: t.data?.components?.length || 0
      })));
    }).catch(err => {
      console.error('[TemplatePreview] 加载模板列表失败:', err);
    });
  }, [fetchTemplates]);





  // 获取单条记录（用于点击行时添加）
  const fetchSingleRecord = useCallback(async (recordId: string, tableId: string) => {
    // 请求锁检查：防止重复点击
    const now = Date.now();
    const lockInfo = requestLockRef.current;
    
    if (lockInfo.isLocked) {
      console.log('[TP] 请求被锁定，跳过重复调用');
      return;
    }
    
    if (now - lockInfo.lastRequestTime < lockInfo.minInterval) {
      console.log('[TP] 请求过于频繁，跳过');
      return;
    }
    
    // 获取锁
    lockInfo.isLocked = true;
    lockInfo.lastRequestTime = now;
    
    console.log('[TP] ========== 获取单条记录开始 ==========');
    console.log('[TP] recordId:', recordId, 'tableId:', tableId);
    
    // 实时检查表格匹配状态（避免依赖过期的 isTableMatched 状态）
    const isMatched = checkTableMatch(selectedTemplate, tableId);
    if (!isMatched && selectedTemplate) {
      console.log('[TP] 表格不匹配，跳过');
      toast.error('当前多维表格与模板不匹配，无法载入数据');
      lockInfo.isLocked = false;
      return;
    }
    
    try {
      // 检查是否在忽略列表中（用户手动删除过）
      if (ignoredRecordIds.has(recordId)) {
        console.log('[TP] 记录在忽略列表中，跳过:', recordId);
        return;
      }
      
      // 检查是否已存在
      const isAlreadyAdded = availableRecords.some(r => r.id === recordId);
      console.log('[TP] 是否已存在:', isAlreadyAdded, '当前记录数:', availableRecords.length);
      
      if (isAlreadyAdded) {
        console.log('[TP] 记录已存在，跳过:', recordId);
        toast.info('该记录已在列表中');
        return;
      }
      
      console.log('[TP] 开始调用 SDK...');
      
      // 获取单条记录和字段元数据
      const { base } = await import('@lark-base-open/js-sdk');
      console.log('[TP] SDK 导入成功');
      
      const table = await base.getTable(tableId);
      console.log('[TP] 获取表格成功');
      
      const record = await table.getRecordById(recordId);
      console.log('[TP] 获取记录结果:', record ? '成功' : '为空', '类型:', typeof record);
      
      if (!record) {
        console.warn('[TP] 未找到记录:', recordId);
        toast.error('未找到记录');
        return;
      }
      
      // 检查 record 的实际结构
      console.log('[TP] 记录完整内容:', JSON.stringify(record, null, 2));
      console.log('[TP] 记录对象 keys:', Object.keys(record));
      console.log('[TP] record.fields 是否存在:', 'fields' in record);
      console.log('[TP] record.fields:', record.fields);
      console.log('[TP] record.fields keys:', record.fields ? Object.keys(record.fields) : '无 fields');
      
      // 如果 record.fields 不存在，尝试直接使用 record 本身
      const actualFields = record.fields || record;
      console.log('[TP] 实际使用的字段对象:', actualFields);
      console.log('[TP] 实际字段数:', Object.keys(actualFields).length);
      
      // 获取字段列表以进行ID到名称的映射
      console.log('[TP] 开始获取字段元数据...');
      const fieldMetaList = await table.getFieldMetaList();
      console.log('[TP] 字段元数据数量:', fieldMetaList?.length || 0);
      
      // 【关键修复】构建字段类型映射（字段名 -> 字段类型）
      const newFieldTypeMap: FieldTypeMap = {};
      const newFieldIdMap: Record<string, string> = {}; // 【新增】字段名 -> 字段ID
      
      if (fieldMetaList && Array.isArray(fieldMetaList)) {
        fieldMetaList.forEach((field: any) => {
          if (field?.name) {
            // 根据飞书字段类型映射到我们的类型
            const fieldType = field.type;
            let variableType: VariableType = 'text';
            
            if (fieldType === 17 || fieldType === 'Attachment') {
              variableType = 'attachment';
            } else if (fieldType === 11 || fieldType === 'User') {
              variableType = 'text'; // 人员字段渲染为文本
            } else if (fieldType === 4 || fieldType === 'DateTime') {
              variableType = 'date';
            } else if (fieldType === 2 || fieldType === 'Number') {
              variableType = 'number';
            } else if (fieldType === 7 || fieldType === 'Checkbox') {
              variableType = 'boolean';
            }
            
            // 【关键修复】同时用字段名和字段ID作为键，处理乱码问题
            newFieldTypeMap[field.name] = variableType;
            if (field?.id) {
              newFieldTypeMap[field.id] = variableType; // 字段ID也映射到类型
            }
            
            // 【新增】构建字段ID映射（字段名 -> 字段ID）
            if (field?.id) {
              newFieldIdMap[field.name] = field.id;
              newFieldIdMap[field.id] = field.id; // 字段ID自身映射
            }
          }
        });
        setFieldTypeMap(newFieldTypeMap);
        setFieldIdMap(newFieldIdMap); // 【新增】
        console.log('[TP] 字段类型映射已更新:', Object.keys(newFieldTypeMap).length, '个字段');
        console.log('[TP] 字段ID映射已更新:', Object.keys(newFieldIdMap).length, '个字段');
        
        // 【调试】打印附件字段的映射
        const attachmentFields = fieldMetaList.filter((f: any) => f.type === 17 || f.type === 'Attachment');
        attachmentFields.forEach((f: any) => {
          console.log(`[TP] 附件字段映射: "${f.name}" -> ${f.id}`);
          console.log(`[TP] 字段类型Map: "${f.name}" = ${newFieldTypeMap[f.name]}, "${f.id}" = ${newFieldTypeMap[f.id]}`);
          console.log(`[TP] 字段ID Map: "${f.name}" = ${newFieldIdMap[f.name]}, "${f.id}" = ${newFieldIdMap[f.id]}`);
        });
      }
      
      // 创建字段 ID 到字段名称的映射
      const fieldMap: Record<string, string> = {};
      if (fieldMetaList && Array.isArray(fieldMetaList)) {
        fieldMetaList.forEach((field: any) => {
          if (field?.id) {
            fieldMap[field.id] = field.name;
          }
        });
      }
      
      console.log('[TP] 字段映射表:', Object.keys(fieldMap).length, '个字段');
      
      // 提取字段数据 - 处理 SDK 可能返回的不同数据结构
      let rawFields: Record<string, any> = {};
      
      // 方案1: record.fields 存在且是对象
      if (record.fields && typeof record.fields === 'object' && !Array.isArray(record.fields)) {
        rawFields = record.fields;
        console.log('[TP] 从 record.fields 提取字段');
      } 
      // 方案2: record 本身包含字段数据（键是字段ID）
      else {
        // 排除元数据字段，剩下的就是字段数据
        const metaKeys = ['id', 'recordId', 'createdTime', 'lastModifiedTime', 'modifiedTime', 'fields'];
        Object.keys(record).forEach(key => {
          if (!metaKeys.includes(key)) {
            rawFields[key] = (record as any)[key];
          }
        });
        console.log('[TP] 从 record 对象本身提取字段');
      }
      
      console.log('[TP] 原始字段数量:', Object.keys(rawFields).length);
      console.log('[TP] 原始字段ID列表:', Object.keys(rawFields).slice(0, 10)); // 只显示前10个
      
      // 转换格式：将字段ID键转换为字段名键
      const formattedFields: Record<string, any> = {};
      
      for (const [fieldId, value] of Object.entries(rawFields)) {
        // 使用字段映射表，如果没有映射则保持原ID
        const fieldName = fieldMap[fieldId] || fieldId;
        formattedFields[fieldName] = value;
        console.log(`[TP] 字段映射: ${fieldId} -> ${fieldName}`);
      }
      
      console.log('[TP] 转换后字段数量:', Object.keys(formattedFields).length);
      console.log('[TP] 转换后字段名:', Object.keys(formattedFields).slice(0, 10));
      
      // 显示获取到的字段信息（调试用）
      const fieldNames = Object.keys(formattedFields);
      toast.info(`获取到 ${fieldNames.length} 个字段: ${fieldNames.slice(0, 3).join(', ')}${fieldNames.length > 3 ? '...' : ''}`);
      
      const formattedRecord = {
        ...formattedFields,
        id: recordId,
        _sourceRecordId: recordId,
        _rowIndex: availableRecords.length,
      };
      
      console.log('[TP] 最终格式化记录:', formattedRecord);
      
      // 【精细化附件处理】处理记录中的附件字段
      console.log('[TP] 开始精细化处理附件字段...');
      console.log('[TP] 处理前 formattedRecord.id:', formattedRecord.id);
      console.log('[TP] 处理前 formattedRecord 字段列表:', Object.keys(formattedRecord));
      
      const recordWithAttachments = await processRecordAttachments(
        formattedRecord, 
        fieldMetaList,
        table
      );
      
      // 【关键验证】确保处理后的数据是新的对象
      console.log('[TP] 处理后 recordWithAttachments.id:', recordWithAttachments.id);
      console.log('[TP] 处理后 recordWithAttachments 字段列表:', Object.keys(recordWithAttachments));
      console.log('[TP] 是同一引用?', formattedRecord === recordWithAttachments);
      
      // 检查照片字段是否被正确处理
      const photoBefore = (formattedRecord as Record<string, any>)['照片'];
      const photoAfter = (recordWithAttachments as Record<string, any>)['照片'];
      console.log('[TP] 照片字段处理前类型:', Array.isArray(photoBefore) ? 'array' : typeof photoBefore);
      console.log('[TP] 照片字段处理后类型:', typeof photoAfter);
      console.log('[TP] 照片字段处理后是否为HTML:', typeof photoAfter === 'string' && photoAfter.includes('<img'));
      
      // 【调试】测试附件字段 getAttachmentUrls API（保留用于对比）
      console.log('[TP] 开始调试附件字段...');
      await debugRecordAttachments(formattedRecord, fieldMetaList);
      
      // 【关键修复】确保使用处理后的记录添加到列表
      setAvailableRecords(prev => {
        // 再次验证新记录是否已正确处理
        const finalRecord = recordWithAttachments;
        console.log('[TP] 添加到列表前的最终验证:');
        console.log('  - 记录ID:', finalRecord.id);
        console.log('  - 照片字段存在:', '照片' in finalRecord);
        console.log('  - 照片字段类型:', typeof finalRecord['照片']);
        console.log('  - 照片字段是HTML:', typeof finalRecord['照片'] === 'string' && finalRecord['照片'].includes('<img'));
        
        return [...prev, finalRecord];
      });
      
      // 【关键修复】使用 addEditorStoreRecords 累积记录，而不是覆盖
      addEditorStoreRecords([recordWithAttachments]);
      console.log('[TP] 已累积添加记录到 editorStore');
      console.log('[TP] 最新记录包含 _html 字段:', Object.keys(recordWithAttachments).filter(k => k.includes('_html')));
      
      console.log('[TP] 记录已添加到列表（含附件处理）');
      toast.success('已添加记录');
      
    } catch (err) {
      console.error('[TP] 获取单条记录失败:', err);
      toast.error('获取记录失败');
    } finally {
      // 释放锁
      requestLockRef.current.isLocked = false;
    }
    console.log('[TP] ========== 获取单条记录结束 ==========');
  }, [selectedTemplate, availableRecords, ignoredRecordIds, addEditorStoreRecords]);

  // 从 feishu-env 获取选中记录（多选时使用）
  const fetchSelectedRecordsFromEnv = useCallback(async () => {
    // 请求锁检查：防止重复点击
    const now = Date.now();
    const lockInfo = requestLockRef.current;
    
    if (lockInfo.isLocked) {
      console.log('[TP] 请求被锁定，跳过重复调用');
      return;
    }
    
    if (now - lockInfo.lastRequestTime < lockInfo.minInterval) {
      console.log('[TP] 请求过于频繁，跳过');
      return;
    }
    
    // 获取锁
    lockInfo.isLocked = true;
    lockInfo.lastRequestTime = now;
    
    // 检查表格匹配状态，如果不匹配则不获取记录
    if (!isTableMatched && selectedTemplate) {
      console.log('[TP] 表格不匹配，跳过获取飞书记录');
      toast.error('当前表格与模板不匹配，无法载入数据');
      lockInfo.isLocked = false;
      return;
    }
    
    try {
      console.log('[TP] ========== fetchSelectedRecordsFromEnv 开始 ==========');
      const selRecords = await feishuEnv.getSelectedRecords();
      console.log('[TP] getSelectedRecords 返回:', selRecords.length, '条记录');
      
      if (selRecords.length > 0) {
        // 打印第一条记录的结构
        console.log('[TP] 第一条记录结构:', JSON.stringify(selRecords[0], null, 2));
        console.log('[TP] 第一条记录 fields:', JSON.stringify(selRecords[0].fields, null, 2));
        
        // 转换格式 - 确保每条记录都有唯一 ID
        const formattedRecords = selRecords.map((record, index) => {
          // 生成唯一 ID：优先使用 record.id，其次是 recordId
          // 注意：不使用 Date.now()，确保同一记录多次点击生成相同 ID
          const uniqueId = record.id || (record as any).recordId || `record_${index}`;
          const formattedRecord = {
            ...record.fields,
            id: uniqueId,
            _sourceRecordId: record.id || (record as any).recordId, // 保存原始记录ID用于调试
            _rowIndex: index,
          };
          console.log(`[TP] 格式化记录 ${index}:`, { id: uniqueId, fields: Object.keys(record.fields || {}) });
          return formattedRecord;
        });
        
        console.log('[TP] 格式化后记录数:', formattedRecords.length);
        
        // 【附件处理】异步处理所有记录的附件字段
        console.log('[TP] ========== 开始处理附件字段 ==========');
        let processedRecords = formattedRecords;
        
        try {
          const { base } = await import('@lark-base-open/js-sdk');
          console.log('[TP] 已导入 SDK');
          
          const selection = await base.getSelection();
          console.log('[TP] 获取 selection:', selection);
          
          if (selection?.tableId) {
            console.log('[TP] 开始获取 table 对象, tableId:', selection.tableId);
            const table = await base.getTable(selection.tableId);
            console.log('[TP] 已获取 table 对象');
            
            console.log('[TP] 开始获取字段元数据...');
            const fieldMetaList = await table.getFieldMetaList();
            console.log('[TP] 已获取字段元数据, 字段数:', fieldMetaList?.length || 0);
            
            // 【关键修复】构建字段类型映射（字段名 -> 字段类型）
            const newFieldTypeMap: FieldTypeMap = {};
            const newFieldIdMap: Record<string, string> = {}; // 【新增】字段名 -> 字段ID
            
            if (fieldMetaList && Array.isArray(fieldMetaList)) {
              fieldMetaList.forEach((field: any) => {
                if (field?.name) {
                  const fieldType = field.type;
                  if (fieldType === 17 || fieldType === 'Attachment') {
                    newFieldTypeMap[field.name] = 'attachment';
                  } else if (fieldType === 11 || fieldType === 'User') {
                    newFieldTypeMap[field.name] = 'text'; // 人员字段渲染为文本
                  } else if (fieldType === 4 || fieldType === 'DateTime') {
                    newFieldTypeMap[field.name] = 'date';
                  } else if (fieldType === 2 || fieldType === 'Number') {
                    newFieldTypeMap[field.name] = 'number';
                  } else if (fieldType === 7 || fieldType === 'Checkbox') {
                    newFieldTypeMap[field.name] = 'boolean';
                  } else {
                    newFieldTypeMap[field.name] = 'text';
                  }
                  
                  // 【新增】构建字段ID映射（字段名 -> 字段ID）
                  if (field?.id) {
                    newFieldIdMap[field.name] = field.id;
                  }
                }
              });
              setFieldTypeMap(newFieldTypeMap);
              setFieldIdMap(newFieldIdMap); // 【新增】
              console.log('[TP] 字段类型映射已更新:', Object.keys(newFieldTypeMap).length, '个字段');
              console.log('[TP] 字段ID映射已更新:', Object.keys(newFieldIdMap).length, '个字段');
            }
            
            // 查找附件字段
            const attachmentFields = fieldMetaList.filter(f => f.type === 17 || String(f.type) === 'Attachment');
            console.log('[TP] 发现附件字段数:', attachmentFields.length);
            if (attachmentFields.length > 0) {
              console.log('[TP] 附件字段列表:', attachmentFields.map(f => ({ id: f.id, name: f.name })));
            }
            
            // 并行处理所有记录的附件字段
            console.log('[TP] 开始并行处理', formattedRecords.length, '条记录的附件...');
            processedRecords = await Promise.all(
              formattedRecords.map(async (record, idx) => {
                console.log(`[TP] 处理记录 ${idx}:`, record.id);
                try {
                  // 【关键修复】确保每条记录都进行深拷贝处理
                  const result = await attachmentProcessor.processRecordAttachments(
                    record as Record<string, any>,
                    fieldMetaList,
                    table
                  );
                  
                  // 【关键验证】验证处理结果
                  const processedRecord = result as typeof record;
                  
                  // 检查附件字段是否被处理
                  attachmentFields.forEach(field => {
                    const originalValue = (record as Record<string, any>)[field.name];
                    const processedValue = (processedRecord as Record<string, any>)[field.name];
                    const isProcessed = typeof processedValue === 'string' && processedValue.includes('<img');
                    const wasArray = Array.isArray(originalValue);
                    
                    console.log(`[TP] 记录 ${idx} 字段 "${field.name}":`, {
                      isProcessed,
                      wasArray,
                      originalType: wasArray ? `array(${originalValue.length})` : typeof originalValue,
                      processedType: typeof processedValue,
                      isHTML: isProcessed,
                      hasImages: typeof processedValue === 'string' && processedValue.includes('<img'),
                      htmlLength: typeof processedValue === 'string' ? processedValue.length : 0
                    });
                  });
                  
                  return processedRecord;
                } catch (error) {
                  console.error(`[TP] 处理记录 ${idx} 附件失败:`, record.id, error);
                  return record; // 保持原始记录
                }
              })
            );
            console.log('[TP] ========== 附件字段处理完成 ==========');
            
            // 【关键验证】验证所有记录的处理结果
            console.log('[TP] 验证所有记录的处理结果:');
            processedRecords.forEach((record, idx) => {
              attachmentFields.forEach(field => {
                const value = (record as Record<string, any>)[field.name];
                const htmlValue = (record as Record<string, any>)[`_${field.name}_html`];
                const isHTML = typeof value === 'string' && value.includes('<img');
                const hasHtmlField = !!htmlValue && typeof htmlValue === 'string';
                console.log(`[TP] 最终验证 记录${idx} "${field.name}": 原始类型=${typeof value}, 有HTML字段=${hasHtmlField}, HTML长度=${hasHtmlField ? htmlValue.length : 0}`);
              });
            });
          } else {
            console.warn('[TP] 无法获取 tableId，跳过附件处理');
          }
        } catch (attachmentError) {
          console.error('[TP] ========== 附件处理失败 ==========', attachmentError);
          // 保持原始记录
        }
        
        // 只追加到可用记录列表，不自动设置为当前记录
        // 【调试】验证 processedRecords 的内容
        console.log('[TP] 准备调用 setAvailableRecords，processedRecords 数量:', processedRecords.length);
        processedRecords.forEach((record, idx) => {
          const htmlFields = Object.keys(record).filter(k => k.includes('_html'));
          console.log(`[TP] processedRecords[${idx}] 的 _html 字段:`, htmlFields);
        });
        
        // 🔥 【关键修复】使用函数式更新避免闭包问题
        // 确保每次都基于最新的 availableRecords 进行累积
        setAvailableRecords(prevRecords => {
          const currentRecords = prevRecords;
          const newRecords = [...currentRecords];
          let addedCount = 0;
          let skippedCount = 0;
          let ignoredCount = 0;
          
          processedRecords.forEach(record => {
            // 【关键修复】确保使用处理后的记录
            const finalRecord = record;
            
            // 获取所有可能的ID用于去重检查
            const recordId = finalRecord.id;
            const sourceRecordId = finalRecord._sourceRecordId;
            
            // 检查是否在忽略列表中（用户手动删除过）
            // 注意：ignoredRecordIds 是闭包捕获的，但在 useCallback 的依赖项中
            if (ignoredRecordIds.has(recordId) || (sourceRecordId && ignoredRecordIds.has(sourceRecordId))) {
              ignoredCount++;
              console.log('[TP] 跳过已忽略记录:', { recordId, sourceRecordId });
              return;
            }
            
            // 严格去重：检查是否已存在相同 ID 或相同源记录 ID 的记录
            const isDuplicate = newRecords.some(r => {
              // 检查主ID是否相同
              if (r.id === recordId) return true;
              // 检查源记录ID是否相同（如果都有的话）
              if (sourceRecordId && r._sourceRecordId === sourceRecordId) return true;
              // 检查源记录ID是否匹配主ID（兼容旧数据）
              if (sourceRecordId && r.id === sourceRecordId) return true;
              if (r._sourceRecordId === recordId) return true;
              return false;
            });
            
            if (!isDuplicate) {
              // 【关键验证】验证附件字段是否正确传递
              const photoField = (finalRecord as Record<string, any>)['照片'];
              const isPhotoHTML = typeof photoField === 'string' && photoField.includes('<img');
              const htmlFieldsInFinal = Object.keys(finalRecord).filter(k => k.includes('_html'));
              
              newRecords.push(finalRecord);
              addedCount++;
              console.log('[TP] 添加记录:', { 
                id: recordId, 
                sourceRecordId,
                fields: Object.keys(finalRecord).filter(k => !k.startsWith('_') && k !== 'id').slice(0, 5),
                htmlFields: htmlFieldsInFinal,
                photoFieldType: typeof photoField,
                isPhotoHTML: isPhotoHTML,
                photoFieldLength: typeof photoField === 'string' ? photoField.length : 0
              });
            } else {
              skippedCount++;
              console.log('[TP] 跳过重复记录:', { recordId, sourceRecordId });
            }
          });
          
          console.log(`[TP] 新增: ${addedCount}, 跳过: ${skippedCount}, 忽略: ${ignoredCount}, 总记录: ${newRecords.length}`);
          
          // 【调试】在设置前检查数组是否真的有变化
          console.log('[TP] setAvailableRecords 函数式更新:', {
            oldLength: currentRecords.length,
            newLength: newRecords.length,
            addedCount,
            skippedCount
          });
          
          return newRecords;
        });
        
        // 【关键修复】同步到 editorStore 也使用函数式获取最新状态
        // 使用 setTimeout 确保在 setAvailableRecords 完成后再同步
        setTimeout(() => {
          const latestRecords = useEditorStore.getState().records;
          console.log('[TP] 【延迟同步】editorStore 记录数:', latestRecords.length);
          console.log('[TP] 【延迟同步】availableRecords (React state) 记录数:', availableRecords.length);
          
          // 【调试】检查 processedRecords 的 _html 字段（闭包变量）
          const processedHtmlFields = processedRecords[0] ? Object.keys(processedRecords[0]).filter(k => k.endsWith('_html')) : [];
          console.log('[TP] 【延迟同步】processedRecords[0] 的 _html 字段:', processedHtmlFields);
          
          // 只添加新记录到 editorStore
          const existingEditorIds = new Set(latestRecords.map(r => r.id as string));
          // 【关键修复】直接使用 processedRecords，因为它是包含 _html 字段的完整数据
          // 不再从 useSelectedDataStore 获取，因为那个 store 没有被正确同步
          const recordsToAdd = processedRecords
            .filter(r => !existingEditorIds.has(r.id as string));
          
          // 【调试】检查 recordsToAdd 的 _html 字段
          if (recordsToAdd.length > 0) {
            const htmlFieldsInFirst = recordsToAdd[0] ? Object.keys(recordsToAdd[0]).filter(k => k.endsWith('_html')) : [];
            console.log('[TP] 【延迟同步】recordsToAdd[0] 的 _html 字段:', htmlFieldsInFirst);
            console.log('[TP] 【延迟同步】recordsToAdd[0] 的所有键:', Object.keys(recordsToAdd[0]).slice(0, 15));
          }
          
          if (recordsToAdd.length > 0) {
            console.log('[TP] 【延迟同步】累积添加', recordsToAdd.length, '条新记录到 editorStore');
            addEditorStoreRecords(recordsToAdd);
          } else {
            console.log('[TP] 【延迟同步】所有记录已存在于 editorStore，跳过');
          }
        }, 0);
        
        console.log('[TP] ========== fetchSelectedRecordsFromEnv 结束 ==========');
      } else {
        console.log('[TP] getSelectedRecords 返回空数组');
      }
    } catch (err) {
      console.error('[TP] 获取记录失败:', err);
    } finally {
      // 释放锁
      requestLockRef.current.isLocked = false;
    }
  }, [isTableMatched, selectedTemplate, ignoredRecordIds, addEditorStoreRecords]);
  
  // 获取当前表格信息
  const fetchCurrentTableInfo = useCallback(async () => {
    try {
      const { base } = await import('@lark-base-open/js-sdk');
      const selection = await base.getSelection();
      
      // 如果表格ID没有变化，跳过更新
      if (selection?.tableId && selection.tableId === currentTableInfo.tableId) {
        return;
      }
      
      console.log('[TP] base.getSelection() 返回:', selection);
      
      if (!selection?.tableId) {
        console.warn('[TP] 无法获取表格ID');
        setCurrentTableInfo({
          tableId: null,
          tableName: '未知表格',
          baseId: selection?.baseId || null,
        });
        return;
      }
      
      // 尝试获取表格名称
      let tableName = '多维表格';
      try {
        const table = await base.getTable(selection.tableId);
        tableName = (table as any).name || selection.tableId;
        console.log('[TP] 获取到表格:', { id: selection.tableId, name: tableName });
      } catch (tableErr) {
        console.warn('[TP] 获取表格名称失败，使用ID作为名称:', selection.tableId);
        tableName = selection.tableId; // 使用ID作为名称
      }
      
      setCurrentTableInfo({
        tableId: selection.tableId,
        tableName: tableName,
        baseId: selection.baseId || null,
      });
      
      console.log('[TP] 当前表格信息已更新:', {
        tableId: selection.tableId,
        tableName,
        baseId: selection.baseId,
      });
    } catch (err) {
      console.error('[TP] 获取表格信息失败:', err);
    }
  }, [currentTableInfo.tableId]);
  

  // 初始化：设置飞书环境状态并初始化 SDK，添加选中变化监听器，获取当前表格信息
  useEffect(() => {
    const init = async () => {
      await feishuEnv.init();
      const isReady = feishuEnv.isFeishuEnvironment();
      setIsFromFeishu(isReady);

      if (isReady) {
        // 获取当前表格信息
        await fetchCurrentTableInfo();
        // 注意：不在初始化时自动获取记录，等待用户点击多维表格行或点击模板

        // 注册选中变化监听器
        const unsubscribe = onSelectionChange((event) => {
          const { recordId, tableId } = event?.data || {};
          
          // 状态比对：如果记录和表格都没变，直接返回，不执行后续逻辑
          if (recordId && tableId && 
              recordId === lastProcessedEventRef.current.recordId && 
              tableId === lastProcessedEventRef.current.tableId) {
            return;
          }
          
          // 更新缓存
          if (recordId && tableId) {
            lastProcessedEventRef.current = { recordId, tableId };
          }
          
          console.log('[TP] 飞书选择变化事件（已去重）:', event.data);

          // 表格切换时重新获取表格信息
          if (tableId) {
            console.log('[TP] 检测到表格变化，重新获取表格信息:', tableId);
            fetchCurrentTableInfo();
          }

          // 记录选中变化时获取记录 - 使用 fetchSelectedRecordsFromEnv 复用完整的字段处理逻辑
          if (recordId) {
            console.log('[TP] 记录选中变化，调用 fetchSelectedRecordsFromEnv');
            fetchSelectedRecordsFromEnv();
          }
        });

        return () => unsubscribe();
      }
    };

    init();
  }, [setIsFromFeishu, fetchCurrentTableInfo, fetchSelectedRecordsFromEnv, fetchSingleRecord]);

  // 监听模板和表格信息变化，更新匹配状态并处理缓存
  const prevMatchedRef = useRef<boolean>(true);

  useEffect(() => {
    const matched = checkTableMatch(selectedTemplate, currentTableInfo.tableId);
    const wasMatched = prevMatchedRef.current;

    // 只有匹配状态真正变化时才更新
    if (matched !== isTableMatched) {
      setIsTableMatched(matched);
      prevMatchedRef.current = matched;
    }

    // 如果从不匹配变为匹配，恢复缓存的数据
    if (matched && !wasMatched && cachedRecords.length > 0) {
      console.log('[TP] 表格恢复匹配，恢复缓存记录:', cachedRecords.length);
      setAvailableRecords(cachedRecords);
      setCachedRecords([]);
      toast.success(`已恢复 ${cachedRecords.length} 条缓存记录`);
    }

    // 如果从匹配变为不匹配，清空可用记录并缓存
    if (!matched && wasMatched && availableRecords.length > 0) {
      console.log('[TP] 表格不匹配，缓存当前记录:', availableRecords.length);
      setCachedRecords(availableRecords);
      setAvailableRecords([]);
      // 清空已选记录，因为它们来自不匹配的表格
      setSelectedRecords([]);
    }

    console.log('[TP] 表格匹配检查:', {
      matched,
      templateTableId: selectedTemplate?.data?.tableId,
      currentTableId: currentTableInfo.tableId,
      currentTableName: currentTableInfo.tableName,
    });
  }, [selectedTemplate, currentTableInfo]);

  // 添加记录到选中列表（防重复，带表格匹配检查）
  const addRecordToSelection = useCallback((record: Record<string, any>) => {
    // 检查表格匹配状态
    if (!isTableMatched && selectedTemplate) {
      toast.error('当前多维表格与模板不匹配，无法添加数据');
      return;
    }
    
    setSelectedRecords(prev => {
      if (prev.some(r => r.id === record.id)) {
        console.log('[TP] 记录已在选中列表:', record.id);
        return prev;
      }
      const newList = [...prev, { id: record.id, data: record, addedAt: Date.now() }];
      console.log('[TP] 已添加到选中列表:', record.id, '总数:', newList.length);
      return newList;
    });
  }, [isTableMatched, selectedTemplate]);
  
  // 从选中列表和可用列表移除记录（同时加入忽略列表，防止被飞书事件恢复）
  const removeRecordFromSelection = useCallback((recordId: string) => {
    // 1. 将 ID 加入忽略集合
    setIgnoredRecordIds(prev => {
      const newSet = new Set(prev);
      newSet.add(recordId);
      console.log('[TP] 加入忽略列表:', recordId, '忽略总数:', newSet.size);
      return newSet;
    });
    
    // 2. 从选中列表移除
    setSelectedRecords(prev => {
      const newList = prev.filter(r => r.id !== recordId);
      console.log('[TP] 从选中列表移除:', recordId, '剩余:', newList.length);
      return newList;
    });
    
    // 3. 从可用列表移除（同时检查 id 和 _sourceRecordId）
    setAvailableRecords(prev => {
      const removedRecord = prev.find(r => r.id === recordId || r._sourceRecordId === recordId);
      const actualRecordId = removedRecord?.id || recordId;
      const actualSourceId = removedRecord?._sourceRecordId;
      
      const newList = prev.filter(r => r.id !== recordId && r._sourceRecordId !== recordId);
      console.log('[TP] 从可用列表移除:', { 
        searchId: recordId, 
        actualRecordId, 
        actualSourceId,
        removedCount: prev.length - newList.length,
        remaining: newList.length 
      });
      return newList;
    });
    
    toast.success('已删除记录');
  }, []);
  
  // 清空选中列表（同时清空忽略列表）
  const clearSelectedRecords = useCallback(() => {
    setSelectedRecords([]);
    setAvailableRecords([]);
    setIgnoredRecordIds(new Set());
    console.log('[TP] 已清空所有列表和忽略集合');
    toast.success('已清空列表');
  }, []);

  // 处理模板选择
  const handleSelectTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template);
    // 清空之前选中的数据和忽略列表（新模板上下文）
    setSelectedRecords([]);
    setIgnoredRecordIds(new Set());
    setAvailableRecords([]);
    
    console.log('[TemplatePreview] 选择模板:', {
      name: template.name,
      id: template.id,
      tableId: template.data?.tableId,
      tableName: template.data?.tableName,
      hasData: !!template.data,
    });
    
    // 从模板数据中读取页面配置
    if (template.data?.pageConfig) {
      setLocalPageConfig(template.data.pageConfig);
      console.log('[TemplatePreview] 从模板加载页面配置:', template.data.pageConfig);
    } else {
      // 使用默认配置
      setLocalPageConfig({
        size: 'A4',
        orientation: 'portrait',
        margins: {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20,
        },
        continuous: false,
      });
    }
    
    // 详细的调试信息
    const components = template.data?.components || [];
    const dataStr = template.data ? JSON.stringify(template.data, null, 2).slice(0, 3000) : '(empty)';
    const componentsInfo = components.map((comp: any, idx: number) => 
      `[${idx}] type=${comp.type}, id=${comp.id}, content=${!!comp.content}, text=${!!comp.text}, textStyle=${!!comp.textStyle}, style=${!!comp.style}`
    ).join('\n');
    
    const pageConfigInfo = template.data?.pageConfig || { size: 'A4', orientation: 'portrait' };
    const pageSize = PAGE_SIZES[pageConfigInfo.size] || PAGE_SIZES.A4;
    const actualWidth = pageConfigInfo.orientation === 'portrait' ? pageSize.width : pageSize.height;
    const actualHeight = pageConfigInfo.orientation === 'portrait' ? pageSize.height : pageSize.width;
    
    const debugText = `选中模板: ${template.name}\n` +
      `模板ID: ${template.id}\n` +
      `有数据: ${!!template.data}\n` +
      `数据类型: ${typeof template.data}\n` +
      `组件数量: ${components.length}\n` +
      `页面尺寸: ${pageConfigInfo.size} ${pageConfigInfo.orientation === 'portrait' ? '纵向' : '横向'}\n` +
      `画布尺寸: ${actualWidth}mm × ${actualHeight}mm\n` +
      `页边距: 上${pageConfigInfo.margins?.top || 20}mm 下${pageConfigInfo.margins?.bottom || 20}mm 左${pageConfigInfo.margins?.left || 20}mm 右${pageConfigInfo.margins?.right || 20}mm\n` +
      `组件详情:\n${componentsInfo}\n\n` +
      `完整数据:\n${dataStr}`;
    setDebugInfo(debugText);
    
    console.log('[TemplatePreview] 选中模板详情:', {
      templateName: template.name,
      templateId: template.id,
      hasData: !!template.data,
      componentCount: components.length,
      pageConfig: pageConfigInfo,
      canvasSize: `${actualWidth}mm × ${actualHeight}mm`,
      components: components.map((c: any) => ({
        type: c.type,
        id: c.id,
        hasContent: !!c.content,
        hasText: !!c.text,
        hasTextStyle: !!c.textStyle,
        hasStyle: !!c.style,
      }))
    });
  }, []);

  // 处理编辑模板
  const handleEdit = useCallback(() => {
    if (!selectedTemplate) {
      toast.error('请先选择一个模板');
      return;
    }
    setCurrentTemplate(selectedTemplate);
    onEditTemplate?.(selectedTemplate);
  }, [selectedTemplate, setCurrentTemplate, onEditTemplate]);

  // 刷新数据（使用飞书 SDK 获取记录）
  const handleRefreshData = useCallback(async () => {
    if (!isFeishuEnvironment) {
      toast.info('当前不在飞书环境中');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('[TP] ========== handleRefreshData 开始 ==========');
      // getCheckboxSelectedRecords 会自动处理：
      // 1. 尝试使用 table.getSelectedRecordIds() 获取选中行
      // 2. 如果不可用，降级到获取第一条记录
      const records = await feishuEnv.getCheckboxSelectedRecords();
      console.log('[TP] getCheckboxSelectedRecords 返回:', records.length, '条记录');
      
      if (records.length > 0) {
        console.log('[TP] 第一条记录:', JSON.stringify(records[0], null, 2));
        
        // 转换格式
        let formattedRecords: Record<string, any>[] = records.map((record, index) => {
          const formatted: Record<string, any> = {
            ...record.fields,
            id: record.id,
            _rowIndex: index,
          };
          console.log(`[TP] 格式化记录 ${index}:`, { id: record.id, fieldKeys: Object.keys(record.fields || {}) });
          return formatted;
        });
        
        // 【关键修复】批量处理附件字段
        try {
          const { base } = await import('@lark-base-open/js-sdk');
          const table = await base.getActiveTable();
          const fieldMetaList = await table.getFieldMetaList();
          
          console.log('[TP] 开始批量处理附件字段...');
          formattedRecords = await Promise.all(
            formattedRecords.map(async (record) => {
              try {
                return await processRecordAttachments(record, fieldMetaList, table);
              } catch (err) {
                console.warn('[TP] 处理记录附件失败:', record.id, err);
                return record;
              }
            })
          );
          console.log('[TP] 批量附件处理完成');
          
          // 检查处理结果
          const sampleRecord = formattedRecords[0];
          const htmlFields = Object.keys(sampleRecord).filter(k => k.includes('_html'));
          console.log('[TP] 第一条记录的 _html 字段:', htmlFields);
        } catch (attachmentErr) {
          console.warn('[TP] 附件预处理失败:', attachmentErr);
          // 继续，不阻断主流程
        }

        console.log('[TP] 设置 records:', formattedRecords.length, '条');
        setSelectedDataRecords(formattedRecords as SelectedRecord[]);
        // 【关键修复】使用累积模式添加记录，而不是覆盖
        addEditorStoreRecords(formattedRecords);
        setCurrentIndex(0);
        // 更新可用记录列表
        setAvailableRecords(formattedRecords);
        console.log('[TP] ========== handleRefreshData 结束 ==========');
        toast.success(`已加载 ${formattedRecords.length} 条记录`);
        
        if (showDebugInfo) {
          setDebugInfo(`刷新数据成功:\n${JSON.stringify(records.map(r => ({ id: r.id, fields: r.fields })), null, 2)}`);
        }
      } else {
        console.log('[TP] 未获取到任何记录');
        toast.info('未获取到任何记录');
        setSelectedDataRecords([]);
        clearEditorStoreRecords(); // 【关键修复】使用 clearRecords 清空
        setCurrentIndex(0);
        setAvailableRecords([]);
      }
    } catch (err) {
      console.error('[TemplatePreview] 刷新数据失败:', err);
      toast.error('刷新数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [isFeishuEnvironment, setSelectedDataRecords, clearEditorStoreRecords, addEditorStoreRecords, setCurrentIndex, showDebugInfo]);

  // 扫描 Checkbox（功能已移除，显示提示）
  // 获取当前选中的模板
  const currentRecord = getCurrentRecord();

  // 使用 storeRecords 作为主要的 records 变量
  const records = storeRecords;

  // 提取模板中的变量
  const templateVariables = useMemo(() => {
    if (!selectedTemplate || !selectedTemplate.data?.components) {
      return [];
    }
    return extractVariablesFromComponents(selectedTemplate.data.components);
  }, [selectedTemplate]);

  // 检查数据匹配情况
  const variableMapping = useMemo(() => {
    if (!currentRecord || templateVariables.length === 0) {
      return [];
    }

    return templateVariables.map((varName) => {
      const hasValue = currentRecord[varName] !== undefined;
      return {
        name: varName,
        hasValue,
        value: currentRecord[varName],
      };
    });
  }, [currentRecord, templateVariables]);

  // 处理打印
  const handlePrint = useCallback(() => {
    if (!selectedTemplate) {
      toast.error('请先选择一个模板');
      return;
    }

    if (selectedRecords.length === 0) {
      toast.error('没有可打印的数据');
      return;
    }

    window.print();
  }, [selectedTemplate, selectedRecords.length]);

  // 处理批量打印（所有选中的记录）
  const handleBatchPrint = useCallback(() => {
    if (!selectedTemplate) {
      toast.error('请先选择一个模板');
      return;
    }

    if (selectedRecords.length === 0) {
      toast.error('没有可打印的数据');
      return;
    }

    // 打开新窗口进行批量打印
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('请允许弹窗以进行批量打印');
      return;
    }

    // 根据排版方式生成打印内容
    let printContent = '';
    const components = selectedTemplate.data?.components || [];
    const pageConfig = selectedTemplate.data?.pageConfig;
    const padding = pageConfig?.margins
      ? `${pageConfig.margins.top || 20}mm ${pageConfig.margins.right || 20}mm ${pageConfig.margins.bottom || 20}mm ${pageConfig.margins.left || 20}mm`
      : '20mm';
    
    switch (layoutMode) {
      case 'default':
        // 默认：每条数据一页
        printContent = selectedRecords.map((record, index) => {
          const isLast = index === selectedRecords.length - 1;
          return `
          <div class="print-page" style="
            width: 210mm;
            min-height: 297mm;
            height: auto;
            padding: ${padding};
            margin: 0 auto;
            box-sizing: border-box;
            page-break-after: ${isLast ? 'auto' : 'always'};
            position: relative;
            background: white;
          ">
            <div style="
              display: flex;
              flex-wrap: wrap;
              align-content: flex-start;
              gap: 12px;
            ">
              ${components.map((comp: any) => {
                const html = renderComponentToHTML(comp, record.data);
                return html;
              }).join('')}
            </div>
          </div>
        `}).join('');
        break;
        
      case 'continuous':
        // 连续：所有数据在一页连续显示
        printContent = `
          <div class="print-page" style="
            width: 210mm;
            height: auto;
            padding: ${padding};
            margin: 0 auto;
            box-sizing: border-box;
            background: white;
          ">
            ${selectedRecords.map((record, index) => {
              const isLast = index === selectedRecords.length - 1;
              return `
                <div style="
                  margin-bottom: ${isLast ? '0' : '40px'};
                  padding-bottom: ${isLast ? '0' : '40px'};
                  border-bottom: ${isLast ? 'none' : '1px dashed #e5e7eb'};
                ">
                  <div style="
                    display: flex;
                    flex-wrap: wrap;
                    align-content: flex-start;
                    gap: 12px;
                  ">
                    ${components.map((comp: any) => renderComponentToHTML(comp, record.data)).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
        break;
        
      case 'label':
        // 标签：网格布局
        printContent = `
          <div class="print-page" style="
            width: 210mm;
            height: auto;
            padding: ${padding};
            margin: 0 auto;
            box-sizing: border-box;
            background: white;
          ">
            <div style="
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(90mm, 1fr));
              gap: 10mm;
            ">
              ${selectedRecords.map((record) => `
                <div style="
                  border: 1px solid #e5e7eb;
                  border-radius: 4px;
                  padding: 3mm;
                  break-inside: avoid;
                ">
                  <div style="
                    display: flex;
                    flex-wrap: wrap;
                    align-content: flex-start;
                    gap: 8px;
                  ">
                    ${components.map((comp: any) => renderComponentToHTML(comp, record.data)).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>批量打印 - ${selectedTemplate.name}</title>
        <style>
          /* =========================================
             批量打印专用样式 - 确保A4尺寸和内容完整
             ========================================= */
          
          /* 基础样式 */
          * {
            box-sizing: border-box !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: auto !important;
            background: #ffffff !important;
          }

          body {
            font-family: system-ui, -apple-system, sans-serif;
          }

          /* =========================================
             打印媒体查询
             ========================================= */
          @media print {
            /* 1. 强制显示背景图形和颜色 */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            /* 2. 强制A4纸张尺寸，无边距 */
            @page {
              size: A4;
              margin: 0;
              padding: 0;
            }

            /* 3. 完全重置html和body */
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              height: auto !important;
              overflow: visible !important;
              background: transparent !important;
            }

            /* 4. 打印页面 - 精确A4尺寸 */
            .print-page {
              position: relative !important;
              width: 210mm !important;
              min-height: 297mm !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              page-break-after: always;
              box-shadow: none !important;
              background: #ffffff !important;
              box-sizing: border-box !important;
            }

            /* 5. 最后一页不加分页符 */
            .print-page:last-of-type {
              page-break-after: auto !important;
            }

            /* 6. 确保所有子元素正确显示 */
            .print-page > *,
            .print-page > * > * {
              display: block !important;
            }

            /* 7. 保留Flex布局 */
            .print-page [style*="display: flex"],
            .print-page [style*="flex-wrap"] {
              display: flex !important;
              flex-wrap: wrap !important;
            }

            /* 8. 表格打印修复 */
            .print-page table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: avoid !important;
              table-layout: fixed !important;
            }

            .print-page th,
            .print-page td {
              border: 1px solid #000000 !important;
              padding: 8px !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              white-space: pre-wrap !important;
              color: #000000 !important;
              background: #ffffff !important;
              vertical-align: top !important;
            }

            /* 9. 确保文本正确换行和显示 */
            .print-page * {
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              box-sizing: border-box !important;
              color: #000000 !important;
              background: transparent !important;
            }

            /* 10. 分页控制 - 避免组件内部分页 */
            .print-page > div,
            .print-page > div > div {
              page-break-inside: avoid !important;
            }

            /* 11. 图片打印修复 */
            .print-page img {
              max-width: 100% !important;
              height: auto !important;
              page-break-inside: avoid !important;
            }
          }

          /* =========================================
             屏幕预览样式
             ========================================= */
          @media screen {
            body {
              margin: 0;
              padding: 20px;
              background: #f0f0f0;
            }

            .print-page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto 20px;
              background: white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              box-sizing: border-box;
              position: relative;
            }

            .print-page:last-child {
              margin-bottom: 0;
            }
          }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);

    toast.success(`已打开批量打印窗口，共 ${selectedRecords.length} 条记录`);
  }, [selectedTemplate, selectedRecords, layoutMode]);

  // 左侧面板 ref，用于检测点击外部
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 点击外部区域收起面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // 检查是否点击了模板选择按钮（避免冲突）
        const target = event.target as HTMLElement;
        const isTemplateButton = target.closest('[data-template-selector]');
        if (!isTemplateButton && sidebarExpanded) {
          setSidebarExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarExpanded]);

  return (
    <div className="print-wrapper h-screen flex gap-3 p-3 overflow-hidden">
      {/* 左侧：模板列表与数据匹配选择夹 - 条件渲染 */}
      {sidebarExpanded && (
        <Card ref={sidebarRef} className="sidebar-left no-print w-64 flex-shrink-0 flex flex-col animate-in slide-in-from-left-2 duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                打印预览
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => setSidebarExpanded(false)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <Tabs defaultValue="templates" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mx-4 mt-2 w-auto">
                <TabsTrigger value="templates" className="text-xs">
                  模板 ({templates.length})
                </TabsTrigger>
                <TabsTrigger value="data" className="text-xs">
                  数据 ({selectedRecords.length})
                </TabsTrigger>
              </TabsList>
              
              {/* 模板列表 Tab */}
              <TabsContent value="templates" className="flex-1 overflow-hidden mt-2">
                <div className="h-full px-4 overflow-y-auto scrollbar-thin">
                  <div className="space-y-3 pb-4">
                    {templates.map((template) => {
                      // 获取该模板的变量
                      const vars = template.data?.components 
                        ? extractVariablesFromComponents(template.data.components) 
                        : [];
                      return (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedTemplate?.id === template.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium text-sm">{template.name}</div>
                          {template.description && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {template.description}
                            </div>
                          )}
                          {/* 模板变量显示 */}
                          {vars.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {vars.slice(0, 3).map((v) => (
                                <span key={v} className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  {v}
                                </span>
                              ))}
                              {vars.length > 3 && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                  +{vars.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {template.data?.components?.length || 0} 组件
                            </Badge>
                            {template.isPublic && (
                              <Badge variant="secondary" className="text-xs">
                                公开
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}

                    {templates.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">暂无模板</p>
                        <p className="text-xs mt-1">请在编辑器中创建模板</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              {/* 数据匹配 Tab */}
              <TabsContent value="data" className="flex-1 overflow-hidden mt-2">
                <div className="h-full px-4 overflow-y-auto scrollbar-thin">
                  <div className="space-y-3 pb-4">
                    {/* 表格匹配状态显示 */}
                    {selectedTemplate && (
                      <div className="p-3 rounded-lg bg-gray-50 border mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">表格匹配</span>
                          <Badge 
                            variant={isTableMatched ? "default" : "destructive"}
                            className={`text-[10px] ${isTableMatched ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}`}
                          >
                            {isTableMatched ? '匹配' : '不匹配'}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-gray-600 truncate" title={currentTableInfo.tableId || ''}>
                          表格ID: {currentTableInfo.tableId || '未知'}
                        </div>
                        {selectedTemplate.data?.tableId ? (
                          <div className="mt-1 text-[10px] text-gray-400 truncate" title={selectedTemplate.data.tableId as string}>
                            模板绑定: {(selectedTemplate.data.tableName as string) || (selectedTemplate.data.tableId as string)}
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] text-amber-600">
                            模板未绑定表格（旧模板）
                          </div>
                        )}
                        {!isTableMatched && (
                          <div className="mt-2 text-[10px] text-red-600 font-medium">
                            当前表格与模板不匹配，无法添加数据
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 空状态提示 */}
                    {selectedTemplate && availableRecords.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm mb-2">暂无数据</p>
                        <p className="text-xs">
                          请在多维表格中点击行以载入数据
                        </p>
                      </div>
                    )}
                    
                    {selectedTemplate ? (
                      availableRecords.length > 0 ? (
                        availableRecords.map((record, idx) => {
                          const isSelected = selectedRecords.some(r => r.id === record.id);
                          return (
                            <div
                              key={record.id || idx}
                              className={`relative w-full text-left p-3 rounded-lg border text-xs transition-all box-border ${
                                isSelected 
                                  ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400 shadow-sm' 
                                  : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                              }`}
                            >
                              {/* 删除按钮 - 始终显示 */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('[TP] 点击删除:', record.id);
                                  removeRecordFromSelection(record.id);
                                }}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                              >
                                ×
                              </button>
                              
                              {/* 卡片内容 - 可点击选中/取消选中 */}
                              <button
                                onClick={() => {
                                  console.log('[TP] 点击卡片:', record.id, isSelected ? '取消选中' : '选中');
                                  if (isSelected) {
                                    removeRecordFromSelection(record.id);
                                  } else {
                                    addRecordToSelection(record);
                                  }
                                }}
                                className="w-full text-left"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`font-medium truncate flex-1 min-w-0 ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {record['流程名称'] || record.编号 || record.id || `记录 ${idx + 1}`}
                                  </span>
                                  {isSelected && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-500 text-white rounded flex-shrink-0">
                                      已选
                                    </span>
                                  )}
                                </div>
                                
                                {/* 显示更多预览字段 */}
                                <div className="mt-2 space-y-1">
                                  {Object.entries(record)
                                    .filter(([key]) => key !== 'id' && key !== '_rowIndex' && !key.startsWith('_'))
                                    .slice(0, 4)
                                    .map(([key, value]) => {
                                      const displayValue = formatFieldValue(key, value);
                                      const rawType = typeof value;
                                      return (
                                        <div key={key} className="flex gap-1 text-[11px]">
                                          <span className="text-gray-400 shrink-0">{key}:</span>
                                          <span className={`truncate flex-1 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>
                                            {displayValue || `[${rawType}]`}
                                          </span>
                                        </div>
                                      );
                                    })}
                                </div>
                              </button>
                            </div>
                          );
                        })
                      ) : null
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">选择模板后可添加数据</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 中间：打印预览 - 确保最小宽度 */}
      <div className="print-content-area flex-1 min-w-[500px] flex flex-col">
        {/* 工具栏 */}
        <Card className="no-print mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* 左侧：排版方式切换 */}
              <div className="flex items-center gap-4">
                <ToggleGroup 
                  type="single" 
                  value={layoutMode}
                  onValueChange={(v) => v && setLayoutMode(v as LayoutMode)}
                  className="border rounded-lg p-1"
                >
                  <ToggleGroupItem value="default" aria-label="默认排版" className="text-xs px-3">
                    <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                    默认
                  </ToggleGroupItem>
                  <ToggleGroupItem value="continuous" aria-label="连续排版" className="text-xs px-3">
                    <List className="h-3.5 w-3.5 mr-1.5" />
                    连续
                  </ToggleGroupItem>
                  <ToggleGroupItem value="label" aria-label="标签排版" className="text-xs px-3">
                    <Tag className="h-3.5 w-3.5 mr-1.5" />
                    标签
                  </ToggleGroupItem>
                </ToggleGroup>

                {/* 页面设置按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPageSettingsOpen(true)}
                  disabled={!selectedTemplate}
                >
                  <Layout className="h-4 w-4 mr-2" />
                  页面设置
                </Button>
                
                {/* 编辑模板按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  disabled={!selectedTemplate}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  编辑模板
                </Button>
              </div>

              {/* 中间：已选数据计数 */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  已选 {selectedRecords.length} 条数据
                </Badge>
                {selectedRecords.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-red-500 hover:text-red-600"
                    onClick={clearSelectedRecords}
                  >
                    清空
                  </Button>
                )}
              </div>

              {/* 右侧：打印按钮 */}
              <div className="flex items-center gap-2">
                {/* 模板选择按钮 */}
                <Button
                  variant="ghost"
                  size="sm"
                  data-template-selector
                  onClick={() => setSidebarExpanded(!sidebarExpanded)}
                  className={`font-medium ${sidebarExpanded ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {selectedTemplate ? selectedTemplate.name : '选择模板'}
                  <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${sidebarExpanded ? 'rotate-90' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchPrint}
                  disabled={!selectedTemplate || selectedRecords.length === 0}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  批量打印 ({selectedRecords.length})
                </Button>
                <Button
                  size="sm"
                  onClick={handlePrint}
                  disabled={!selectedTemplate || selectedRecords.length === 0}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  打印
                </Button>
              </div>
            </div>

            {/* 调试信息开关 */}
            <div className="no-print mt-2 flex items-center gap-2">
            </div>
          </CardContent>
        </Card>

        {/* A4 预览区域 - 确保可以滚动 */}
        <div className="flex-1 bg-gray-100 rounded-lg relative flex flex-col overflow-hidden" style={{ minHeight: '0' }}>
          {/* 页面尺寸信息 - 固定在顶部 */}
          {selectedTemplate && (
            <div className="no-print bg-white border-b p-2 flex items-center justify-between print:hidden flex-shrink-0">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium">画布尺寸:</span>
                <Badge variant="outline">
                  {localPageConfig.size} {localPageConfig.orientation === 'portrait' ? '纵向' : '横向'}
                </Badge>
                <Badge variant="secondary">
                  {(localPageConfig.orientation === 'portrait' 
                    ? PAGE_SIZES[localPageConfig.size]?.width || 210 
                    : PAGE_SIZES[localPageConfig.size]?.height || 297
                  )}mm × {(localPageConfig.orientation === 'portrait' 
                    ? PAGE_SIZES[localPageConfig.size]?.height || 297 
                    : PAGE_SIZES[localPageConfig.size]?.width || 210
                  )}mm
                </Badge>
                <span className="text-muted-foreground">
                  边距: 上{localPageConfig.margins.top}mm 下{localPageConfig.margins.bottom}mm 
                  左{localPageConfig.margins.left}mm 右{localPageConfig.margins.right}mm
                </span>
              </div>
            </div>
          )}
          
          {/* 滚动容器 - 包含画布 (灰色背景编辑区) */}
          <div 
            className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin"
            style={{
              backgroundColor: '#f5f5f5',
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
              padding: '20px',
              boxSizing: 'border-box',
              minHeight: '0',  // 【关键】确保 flex 子元素可以正确收缩
            }}
          >
            <div 
              className="min-h-full"
              style={{
                // 由内容决定宽度
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {selectedTemplate ? (
              (() => {
                // 使用本地页面配置
                const pageConfig = localPageConfig;
                const pageSize = PAGE_SIZES[pageConfig.size] || PAGE_SIZES.A4;
                const actualWidth = pageConfig.orientation === 'portrait' ? pageSize.width : pageSize.height;
                const actualHeight = pageConfig.orientation === 'portrait' ? pageSize.height : pageSize.width;
                const padding = `${pageConfig.margins.top}mm ${pageConfig.margins.right}mm ${pageConfig.margins.bottom}mm ${pageConfig.margins.left}mm`;
                
                // 如果没有选中数据，显示模板预览（使用空数据）
                if (selectedRecords.length === 0) {
                  const components = selectedTemplate?.data?.components || [];
                  
                  return (
                    <div
                      className="bg-white shadow-lg print:shadow-none print-area-page"
                      style={{
                        width: `${actualWidth}mm`,
                        minHeight: `${actualHeight}mm`,
                        height: 'auto',
                        padding,
                        boxSizing: 'border-box',
                        position: 'relative',
                        margin: '0',
                        marginLeft: '0',
                        marginRight: '0',
                      }}
                    >
                      {/* 模板预览标记 */}
                      <div className="absolute top-2 right-2 text-xs text-blue-400 print:hidden">
                        模板预览
                      </div>
                      {/* 流式布局容器 - 内容区域 */}
                      <div style={{
                        width: '100%',
                        maxWidth: '100%',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignContent: 'flex-start',
                        gap: '12px',
                        boxSizing: 'border-box',
                      }}>
                        {components.map((component: any) => 
                          renderComponent(component, {}, fieldTypeMap, fieldIdMap)
                        )}
                      </div>
                    </div>
                  );
                }

                const components = selectedTemplate?.data?.components || [];

                // 渲染单个数据页面的函数
                const renderDataPage = (record: PreviewSelectedRecord, pageIndex: number, isLast: boolean) => {
                  // 【渲染层数据监控】验证传递给渲染组件的数据
                  if (record.data) {
                    console.group(`🎨 [RenderMonitor] 渲染页面 ${pageIndex + 1}`);
                    console.log('记录ID:', record.id);
                    
                    // 检查附件字段（查找 _html 后缀的字段）
                    Object.entries(record.data).forEach(([key, value]) => {
                      // 检查是否是预处理的HTML字段（_字段名_html）
                      if (key.endsWith('_html') && key.includes('_')) {
                        const baseFieldName = key.slice(1, -5); // 去掉开头的_和结尾的_html
                        const originalValue = record.data[baseFieldName];
                        const isHTML = typeof value === 'string' && value.includes('<img');
                        const isOriginalArray = Array.isArray(originalValue);
                        
                        console.log(`  📎 ${baseFieldName}:`, {
                          htmlType: typeof value,
                          isHTML,
                          originalType: isOriginalArray ? 'array' : typeof originalValue,
                          isCorrectlyProcessed: isHTML && isOriginalArray
                        });
                        
                        if (isOriginalArray) {
                          console.log(`  ✅ ${baseFieldName} 原始数据保留为数组，HTML已生成`);
                        }
                      }
                    });
                    console.groupEnd();
                  }
                  
                  return (
                    <div
                      key={record.id}
                      className="bg-white shadow-lg print:shadow-none print-area-page"
                      style={{
                        width: `${actualWidth}mm`,
                        minHeight: layoutMode === 'label' ? 'auto' : `${actualHeight}mm`,
                        height: 'auto',
                        padding,
                        boxSizing: 'border-box',
                        position: 'relative',
                        marginBottom: layoutMode === 'default' && !isLast ? '20px' : '0',
                        marginLeft: '0',
                        marginRight: '0',
                        pageBreakAfter: layoutMode === 'default' && !isLast ? 'always' : 'auto',
                      }}
                    >
                      {/* 页码标记 */}
                      <div className="absolute top-2 right-2 text-xs text-gray-300 print:hidden">
                        #{pageIndex + 1}
                      </div>
                      {/* 流式布局容器 - 内容区域 */}
                      <div style={{
                        width: '100%',
                        maxWidth: '100%',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignContent: 'flex-start',
                        gap: '12px',
                        boxSizing: 'border-box',
                      }}>
                        {components.map((component: any) => 
                          renderComponent(component, record.data, fieldTypeMap, fieldIdMap)
                        )}
                      </div>
                    </div>
                  );
                };

                // 根据排版方式渲染
                switch (layoutMode) {
                  case 'default':
                    // 默认：每条数据一页
                    return (
                      <div className="flex flex-col items-start gap-5">
                        {selectedRecords.map((record, idx) => 
                          renderDataPage(record, idx, idx === selectedRecords.length - 1)
                        )}
                      </div>
                    );
                    
                  case 'continuous':
                    // 连续：不间断排版，可能需要分页
                    return (
                      <div
                        className="bg-white shadow-lg print:shadow-none print-area-page"
                        style={{
                          width: `${actualWidth}mm`,
                          height: 'auto',
                          padding,
                          boxSizing: 'border-box',
                          margin: '0',
                          marginLeft: '0',
                          marginRight: '0',
                        }}
                      >
                        {selectedRecords.map((record, idx) => (
                          <div 
                            key={record.id}
                            style={{
                              marginBottom: idx < selectedRecords.length - 1 ? '40px' : '0',
                              borderBottom: idx < selectedRecords.length - 1 ? '1px dashed #e5e7eb' : 'none',
                              paddingBottom: idx < selectedRecords.length - 1 ? '40px' : '0',
                            }}
                          >
                            <div style={{
                              width: '100%',
                              maxWidth: '100%',
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignContent: 'flex-start',
                              gap: '12px',
                              boxSizing: 'border-box',
                            }}>
                              {components.map((component: any) => 
                                renderComponent(component, record.data, fieldTypeMap, fieldIdMap)
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                    
                  case 'label':
                    // 标签：所有数据在一页，紧凑排列
                    return (
                      <div
                        className="bg-white shadow-lg print:shadow-none print-area-page"
                        style={{
                          width: `${actualWidth}mm`,
                          minHeight: `${actualHeight}mm`,
                          padding,
                          boxSizing: 'border-box',
                          margin: '0',
                          marginLeft: '0',
                          marginRight: '0',
                        }}
                      >
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(90mm, 1fr))',
                          gap: '10mm',
                        }}>
                          {selectedRecords.map((record) => (
                            <div
                              key={record.id}
                              className="border border-gray-200 rounded p-3"
                              style={{
                                breakInside: 'avoid',
                              }}
                            >
                              <div style={{
                                width: '100%',
                                maxWidth: '100%',
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignContent: 'flex-start',
                                gap: '8px',
                                boxSizing: 'border-box',
                              }}>
                                {components.map((component: any) => 
                                  renderComponent(component, record.data, fieldTypeMap, fieldIdMap)
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                    
                  default:
                    return null;
                }
              })()
            ) : (
              // 未选择模板时的空状态
              <div
                className="bg-white shadow-lg rounded-lg print-area-page flex items-center justify-center"
                style={{
                  width: '210mm',
                  height: '297mm',
                  margin: '0',
                  marginLeft: '0',
                  marginRight: '0',
                }}
              >
                <div className="text-center text-gray-400">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">请从左侧选择一个模板</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      
      {/* 打印样式 - 只打印画布内容 */}
      <style jsx global>{`
        @media print {
          /* =========================================
             精确打印控制 - 只打印中间画布内容
             ========================================= */
          
          /* 1. 强制A4纸张 */
          @page {
            size: A4;
            margin: 0;
          }

          /* 2. 强制显示背景图形 */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 3. 重置页面 */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* 4. 隐藏左右侧边栏 */
          .print-wrapper > :not(.print-content-area) {
            display: none !important;
          }

          /* 5. 隐藏打印内容区域内的no-print元素 */
          .print-content-area .no-print {
            display: none !important;
          }

          /* 6. 打印内容区域占据整个页面 */
          .print-content-area {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* 7. 确保打印页面尺寸正确 */
          .print-content-area .print-area-page {
            width: 210mm !important;
            min-height: 297mm !important;
            height: auto !important;
            page-break-after: always;
            box-shadow: none !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
          }

          .print-content-area .print-area-page:last-of-type {
            page-break-after: auto !important;
          }

          /* 8. 表格打印 */
          .print-content-area .print-area-page table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: avoid;
          }

          .print-content-area .print-area-page th,
          .print-content-area .print-area-page td {
            border: 1px solid #000 !important;
            padding: 8px !important;
          }

          /* 9. 确保Flex布局 */
          .print-content-area .print-area-page [style*="display: flex"],
          .print-content-area .print-area-page [style*="flex-wrap"] {
            display: flex !important;
            flex-wrap: wrap !important;
          }

          /* 10. 隐藏打印装饰 */
          .print-content-area .print-area-page .print\\:hidden,
          .print-content-area .print-area-page .absolute {
            display: none !important;
          }
        }
      `}</style>
      
      {/* 页面设置对话框 */}
      <PageSettingsDialog
        open={isPageSettingsOpen}
        onOpenChange={setIsPageSettingsOpen}
        pageConfig={localPageConfig}
        onPageConfigChange={(config) => {
          setLocalPageConfig(config);
          console.log('[TemplatePreview] 页面配置已更新:', config);
        }}
      />
    </div>
  );
}

export default TemplatePreview;
