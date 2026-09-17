'use client';

import React, { useState, useEffect } from 'react';
import { FileImage, FileText, AlertCircle } from 'lucide-react';

// 附件变量配置类型
export interface AttachmentVariableConfig {
  fieldName: string;        // 字段名称
  displayMode: 'image_only' | 'basic_info' | 'advanced';  // 显示模式
  sizeMode: 'auto' | 'fixed_width' | 'fixed_height' | 'fixed_size';  // 尺寸模式
  width?: number;           // 固定宽度
  height?: number;          // 固定高度
  onePerLine: boolean;      // 一图一行
  align: 'left' | 'center' | 'right';  // 对齐方式
  emptyDisplay: 'default' | 'custom';  // 无数据显示
  emptyCustomText?: string; // 自定义空数据文案
}

// 附件数据项
interface AttachmentItem {
  name: string;
  url?: string;
  token?: string;
  type?: string;
  size?: number;
}

interface AttachmentVariableProps {
  config: AttachmentVariableConfig;
  data: AttachmentItem[] | null | undefined;
  isEditing?: boolean;  // 是否处于编辑模式
  fieldId?: string;     // 【新增】字段ID，用于获取附件URL
}

export function AttachmentVariable({ 
  config, 
  data, 
  isEditing = false,
  fieldId
}: AttachmentVariableProps) {
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, boolean>>({});

  const {
    displayMode = 'image_only',
    sizeMode = 'auto',
    width,
    height,
    onePerLine = false,
    align = 'left',
    emptyDisplay = 'default',
    emptyCustomText = ''
  } = config;

  // 获取附件URL（带缓存）
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    const fetchUrls = async () => {
      // 【关键修复】如果没有 fieldId，尝试使用 config.fieldName 作为备选
      const targetFieldId = fieldId || config.fieldName;
      
      if (!targetFieldId) {
        console.warn('[AttachmentVariable] 缺少 fieldId 和 fieldName，无法获取附件URL');
        return;
      }
      
      if (!fieldId) {
        console.log(`[AttachmentVariable] 未提供 fieldId，尝试使用字段名 "${config.fieldName}" 获取字段`);
      }
      const newUrls: Record<number, string> = {};
      const newLoading: Record<number, boolean> = {};
      const tokensToFetch: { index: number; token: string }[] = [];

      data.forEach((item, index) => {
        // 【关键修复】支持多种 URL 字段名（飞书可能返回 url、fileUrl 或 tmpUrl）
        const url = item.url || (item as any).fileUrl || (item as any).tmpUrl;
        if (url) {
          newUrls[index] = url;
        } else if (item.token && !imageUrls[index]) {
          // 需要异步获取URL
          newLoading[index] = true;
          tokensToFetch.push({ index, token: item.token });
        }
      });

      if (tokensToFetch.length > 0) {
        setLoading(prev => ({ ...prev, ...newLoading }));
        
        // 【关键修复】调用 getAttachmentUrls 获取临时URL
        try {
          console.log('[AttachmentVariable] 开始获取附件URL，字段ID:', fieldId);
          console.log('[AttachmentVariable] 需要获取URL的附件数量:', tokensToFetch.length);
          
          const { bitable } = await import('@lark-base-open/js-sdk');
          const base = await bitable.base;
          const table = await base.getActiveTable();
          
          // 获取当前选中记录的ID
          const selection = await base.getSelection();
          const recordId = selection.recordId;
          
          if (!recordId) {
            console.warn('[AttachmentVariable] 没有选中记录，无法获取附件URL');
            setLoading(prev => {
              const updated = { ...prev };
              tokensToFetch.forEach(({ index }) => {
                updated[index] = false;
              });
              return updated;
            });
            setErrors(prev => {
              const updated = { ...prev };
              tokensToFetch.forEach(({ index }) => {
                updated[index] = true;
              });
              return updated;
            });
            return;
          }
          
          // 获取附件字段对象（使用 targetFieldId，可能是 fieldId 或 fieldName）
          const attachmentField = await table.getField(targetFieldId);
          
          console.log(`[AttachmentVariable] 获取字段对象成功，使用ID/名称: "${targetFieldId}"`);
          
          // 调用 getAttachmentUrls API
          if (typeof (attachmentField as any).getAttachmentUrls === 'function') {
            console.log('[AttachmentVariable] 调用 getAttachmentUrls，recordId:', recordId);
            const urls = await (attachmentField as any).getAttachmentUrls(recordId);
            console.log('[AttachmentVariable] 获取到URL数量:', urls?.length);
            
            if (Array.isArray(urls) && urls.length > 0) {
              // 根据索引分配URL
              tokensToFetch.forEach(({ index }, fetchIndex) => {
                if (urls[fetchIndex]) {
                  newUrls[index] = urls[fetchIndex];
                  console.log(`[AttachmentVariable] 分配URL[${index}]:`, urls[fetchIndex].substring(0, 50) + '...');
                } else {
                  console.warn(`[AttachmentVariable] 没有获取到索引 ${index} 的URL`);
                }
              });
            } else {
              console.warn('[AttachmentVariable] getAttachmentUrls 返回空数组');
            }
          } else {
            console.warn('[AttachmentVariable] 字段对象不支持 getAttachmentUrls 方法');
          }
          
          // 更新状态
          setLoading(prev => {
            const updated = { ...prev };
            tokensToFetch.forEach(({ index }) => {
              updated[index] = false;
            });
            return updated;
          });
          
          setErrors(prev => {
            const updated = { ...prev };
            tokensToFetch.forEach(({ index }) => {
              if (!newUrls[index]) {
                updated[index] = true;
              }
            });
            return updated;
          });
        } catch (err) {
          console.error('[AttachmentVariable] 获取附件URL失败:', err);
          setLoading(prev => {
            const updated = { ...prev };
            tokensToFetch.forEach(({ index }) => {
              updated[index] = false;
            });
            return updated;
          });
          setErrors(prev => {
            const updated = { ...prev };
            tokensToFetch.forEach(({ index }) => {
              updated[index] = true;
            });
            return updated;
          });
        }
      }

      setImageUrls(prev => ({ ...prev, ...newUrls }));
    };

    fetchUrls();
  }, [data, fieldId]);

  // 处理图片加载错误
  const handleImageError = (index: number) => {
    setErrors(prev => ({ ...prev, [index]: true }));
    setLoading(prev => ({ ...prev, [index]: false }));
  };

  const handleImageLoad = (index: number) => {
    setLoading(prev => ({ ...prev, [index]: false }));
  };

  // 空数据渲染
  if (!data || data.length === 0) {
    const emptyText = emptyDisplay === 'custom' && emptyCustomText 
      ? emptyCustomText 
      : `[${config.fieldName}]`;
    
    return (
      <span className="text-gray-400 italic text-sm">
        {emptyText}
      </span>
    );
  }

  // 基础信息模式 - 只显示文件名列表
  if (displayMode === 'basic_info') {
    return (
      <div className="inline-flex flex-col gap-1">
        {data.map((item, index) => (
          <div key={index} className="text-sm text-gray-700">
            {item.name}
          </div>
        ))}
      </div>
    );
  }

  // 计算图片样式
  const getImageStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      objectFit: 'cover',
    };

    switch (sizeMode) {
      case 'fixed_width':
        style.width = width ? `${width}px` : '120px';
        style.height = 'auto';
        break;
      case 'fixed_height':
        style.width = 'auto';
        style.height = height ? `${height}px` : '120px';
        break;
      case 'fixed_size':
        style.width = width ? `${width}px` : '120px';
        style.height = height ? `${height}px` : '120px';
        break;
      case 'auto':
      default:
        style.maxWidth = '120px';
        style.maxHeight = '120px';
        style.width = 'auto';
        style.height = 'auto';
        break;
    }

    return style;
  };

  // 容器样式
  const getContainerStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
    };

    if (onePerLine) {
      style.flexDirection = 'column';
      style.alignItems = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
    } else {
      style.justifyContent = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
    }

    return style;
  };

  // 单图容器样式
  const getItemContainerStyle = (): React.CSSProperties => {
    return {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
    };
  };

  return (
    <div style={getContainerStyle()} className="attachment-variable-container">
      {data.map((item, index) => {
        // 【关键修复】支持多种 URL 字段名
        const itemUrl = item.url || (item as any).fileUrl || (item as any).tmpUrl;
        const url = imageUrls[index] || itemUrl;
        const isLoading = loading[index];
        const hasError = errors[index];

        return (
          <div key={index} style={getItemContainerStyle()} className="attachment-item">
            {isLoading ? (
              <div 
                className="bg-gray-100 rounded flex items-center justify-center"
                style={{ width: '80px', height: '80px' }}
              >
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : hasError || !url ? (
              <div 
                className="bg-gray-100 rounded flex flex-col items-center justify-center gap-1 text-gray-400"
                style={{ width: '80px', height: '80px', padding: '8px' }}
              >
                <AlertCircle className="w-6 h-6" />
                <span className="text-xs text-center truncate w-full">{item.name}</span>
              </div>
            ) : (
              <>
                <img
                  src={url}
                  alt={item.name}
                  style={getImageStyle()}
                  className="rounded border border-gray-200"
                  onError={() => handleImageError(index)}
                  onLoad={() => handleImageLoad(index)}
                />
                {displayMode === 'advanced' && (
                  <div className="mt-1 text-xs text-gray-500 max-w-[200px]">
                    <div className="truncate" title={`File: ${item.name}`}>
                      File: [{item.name}]
                    </div>
                    <div className="truncate text-gray-400" title={`URL: ${url}`}>
                      URL: [{url}]
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 预览组件（用于弹窗中的实时预览）
export function AttachmentVariablePreview({ 
  config,
  data
}: { 
  config: AttachmentVariableConfig;
  data?: AttachmentItem[] | null;
}) {
  // 判断是否有实际数据
  const hasRealData = data && data.length > 0;
  
  // 根据字段名判断是否选中了字段
  const hasSelectedField = config.fieldName && config.fieldName.length > 0;

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <p className="text-xs text-gray-500 mb-2">
        预览效果：
        {hasRealData && <span className="text-blue-500 ml-1">（实际数据）</span>}
        {!hasRealData && hasSelectedField && <span className="text-orange-500 ml-1">（该字段暂无附件）</span>}
      </p>
      <div className="bg-white rounded p-4">
        {hasRealData ? (
          <AttachmentVariable config={config} data={data} />
        ) : hasSelectedField ? (
          // 已选择字段但无附件数据
          <span className="text-gray-400 italic text-sm">
            [{config.fieldName}]
          </span>
        ) : (
          // 未选择字段
          <span className="text-gray-300 italic text-sm">
            请选择附件字段
          </span>
        )}
      </div>
    </div>
  );
}

export default AttachmentVariable;
