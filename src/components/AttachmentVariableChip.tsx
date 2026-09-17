'use client';

import React, { useState, useRef, useMemo } from 'react';
import { FileImage, Pencil, Trash2, GripVertical } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ComponentTextStyle } from '@/types/editor';
import { AttachmentVariableConfig } from '@/components/editor/variables';

interface AttachmentVariableChipProps {
  fieldName: string;
  data: { htmlContent?: string; rawData?: any[]; fileNames?: string[] } | any[] | null | undefined;
  config?: AttachmentVariableConfig;
  className?: string;
  textStyle?: Partial<ComponentTextStyle>;
  isSelected?: boolean;
  isEditing?: boolean;  // 是否处于编辑状态，只有编辑状态才显示悬停按钮
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * 附件变量芯片组件
 * 作为独立组件存在于文本中，支持悬停浮窗编辑/删除
 */
export const AttachmentVariableChip: React.FC<AttachmentVariableChipProps> = ({
  fieldName,
  data,
  config,
  className = '',
  textStyle,
  isSelected = false,
  isEditing = false,  // 默认为 false
  onEdit,
  onDelete,
}) => {
  // ==================== 所有 Hooks 必须在顶层调用 ====================
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  // 【解析数据格式】
  // data 可能是：{ htmlContent?: string; rawData?: any[]; fileNames?: string[] } 或 any[] 或 null
  const parsedData = useMemo(() => {
    let htmlContent: string | undefined;
    let rawData: any[] | undefined;
    let fileNames: string[] | undefined;
    
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        // 旧格式：直接是数组
        rawData = data;
      } else if ('htmlContent' in data || 'rawData' in data || 'fileNames' in data) {
        // 新格式：{ htmlContent, rawData, fileNames }
        htmlContent = data.htmlContent;
        rawData = data.rawData;
        fileNames = data.fileNames;
      }
    }
    
    return { htmlContent, rawData, fileNames };
  }, [data]);

  const { htmlContent, rawData, fileNames } = parsedData;

  // 【关键逻辑】当有配置且有 displayMode 时，使用原始数据渲染
  const hasConfig = config && config.displayMode;
  const shouldUseRawData = hasConfig && rawData && rawData.length > 0;

  // 【提取所有图片 URL】支持多图渲染
  const imageUrls = useMemo(() => {
    const urls: string[] = [];
    
    // 1. 从 rawData 提取所有 URL（支持多种字段名）
    if (rawData && rawData.length > 0) {
      rawData.forEach((item: any) => {
        const url = item?.url 
          || item?.fileUrl 
          || item?.tmpUrl
          || item?.tmp_url
          || item?.previewUrl
          || item?.link
          || item?.downloadUrl
          || item?.src;
        if (url) urls.push(url);
      });
    }
    
    // 2. 如果 rawData 没有 URL，从 HTML 中提取所有图片 URL
    if (urls.length === 0 && htmlContent) {
      const imgMatches = htmlContent.matchAll(/<img[^>]+src="([^"]+)"/g);
      for (const match of imgMatches) {
        if (match[1]) urls.push(match[1]);
      }
    }
    
    return urls;
  }, [rawData, htmlContent]);

  // 【配置变量】
  const displayMode = config?.displayMode || 'image_only';
  const sizeMode = config?.sizeMode || 'auto';
  const onePerLine = config?.onePerLine || false;
  const align = config?.align || 'left';
  const emptyDisplay = config?.emptyDisplay || 'default';
  const emptyCustomText = config?.emptyCustomText;

  // 【判断是否有数据】
  const hasData = (rawData && rawData.length > 0) || (fileNames && fileNames.length > 0) || imageUrls.length > 0;

  // 【获取附件数量】
  const attachmentCount = rawData?.length || fileNames?.length || imageUrls.length || 0;

  // 【获取第一张图片信息】
  const firstImage = rawData && rawData.length > 0 ? rawData[0] : null;
  const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

  // 【获取文件名】
  const fileName = (fileNames && fileNames.length > 0)
    ? fileNames[0]
    : (firstImage?.name 
      || firstImage?.fileName 
      || firstImage?.title 
      || fieldName);

  // 【计算图片样式】
  const getImageStyle = useMemo(() => {
    return (): React.CSSProperties => {
      const style: React.CSSProperties = {
        objectFit: 'contain',
        borderRadius: '4px',
        flexShrink: 0,
      };

      switch (sizeMode) {
        case 'fixed_width':
          style.width = config?.width ? `${config.width}px` : '80px';
          style.height = 'auto';
          style.objectFit = 'cover';
          break;
        case 'fixed_height':
          style.width = 'auto';
          style.height = config?.height ? `${config.height}px` : '80px';
          style.objectFit = 'cover';
          break;
        case 'fixed_size':
          style.width = config?.width ? `${config.width}px` : '80px';
          style.height = config?.height ? `${config.height}px` : '80px';
          style.objectFit = 'cover';
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
  }, [sizeMode, config?.width, config?.height]);

  // 【容器样式】
  const getContainerStyle = useMemo(() => {
    return (): React.CSSProperties => {
      const style: React.CSSProperties = {
        display: 'inline-flex',
        flexWrap: 'wrap',
        gap: onePerLine ? '8px' : '6px',
        verticalAlign: 'middle',
        alignItems: 'flex-start',
      };

      if (onePerLine) {
        style.flexDirection = 'column';
        style.alignItems = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
      } else {
        style.justifyContent = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
      }

      return style;
    };
  }, [onePerLine, align]);

  // ==================== 条件渲染逻辑（在所有 Hooks 之后）====================

  // 【场景1】有配置但无原始数据，displayMode 是 image_only 且能从 HTML 提取图片
  if (hasConfig && config.displayMode === 'image_only' && imageUrls.length > 0 && !shouldUseRawData) {
    return (
      <span
        ref={containerRef}
        className={`
          inline-flex items-center relative p-0
          cursor-pointer
          transition-all duration-200
          ${isSelected ? 'ring-2 ring-blue-400' : ''}
          ${className}
        `}
        title={`附件字段：${fieldName}。双击编辑配置`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEdit?.();
        }}
        data-field-name={fieldName}
        data-variable-type="attachment"
      >
        {imageUrls.map((url, index) => (
          <img
            key={index}
            src={url}
            alt=""
            style={{
              maxWidth: config?.width ? `${config.width}px` : '80px',
              maxHeight: config?.height ? `${config.height}px` : '80px',
              width: 'auto',
              height: 'auto',
              objectFit: 'cover',
              borderRadius: '4px',
            }}
            className="rounded"
            crossOrigin="anonymous"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
            }}
          />
        ))}
        
        {/* 悬停浮窗按钮 - 仅在编辑状态下显示 */}
        {isEditing && isHovered && (
          <span 
            className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-800 rounded-md px-2 py-1 shadow-lg z-[60]"
            onMouseEnter={() => setIsHovered(true)}
          >
            <GripVertical className="w-3 h-3 text-gray-400 cursor-grab" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="p-1 hover:bg-gray-700 rounded text-white"
              title="编辑附件变量"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="p-1 hover:bg-red-600 rounded text-white"
              title="删除"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        )}
      </span>
    );
  }

  // 【场景2】没有配置但有 HTML → 使用 HTML 渲染
  if (!hasConfig && htmlContent) {
    return (
      <span
        ref={containerRef}
        className={`
          inline-flex items-center gap-1 relative
          ${isSelected ? 'ring-2 ring-blue-400 rounded' : ''}
          ${className}
        `}
        style={{
          fontSize: textStyle?.fontSize ? `${textStyle.fontSize}px` : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEdit?.();
        }}
        data-field-name={fieldName}
        data-variable-type="attachment"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  // 【场景3】空数据渲染
  if (!hasData) {
    const emptyText = emptyDisplay === 'custom' && emptyCustomText 
      ? emptyCustomText 
      : `[${fieldName}]`;
    
    return (
      <span
        ref={containerRef}
        className={`
          inline-flex items-center gap-1 relative
          px-2 py-1 rounded
          bg-amber-50 border border-amber-200
          text-amber-600 text-sm
          cursor-pointer
          transition-all duration-200
          ${isSelected ? 'ring-2 ring-blue-400' : ''}
          ${className}
        `}
        style={{
          fontSize: textStyle?.fontSize ? `${textStyle.fontSize}px` : undefined,
        }}
        title={`附件字段：${fieldName}（无数据）。双击编辑配置`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEdit?.();
        }}
        data-field-name={fieldName}
        data-variable-type="attachment"
      >
        <FileImage className="w-4 h-4" />
        <span className="truncate max-w-[120px]">{emptyText}</span>
        
        {/* 悬停浮窗按钮 - 仅在编辑状态下显示 */}
        {isEditing && isHovered && (
          <span 
            className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-800 rounded-md px-2 py-1 shadow-lg z-[60]"
            onMouseEnter={() => setIsHovered(true)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="p-1 hover:bg-gray-700 rounded text-white"
              title="编辑"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="p-1 hover:bg-red-600 rounded text-white"
              title="删除"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        )}
      </span>
    );
  }

  // ==================== 主渲染逻辑 ====================

  return (
    <span
      ref={containerRef}
      className={`
        inline-flex relative
        cursor-pointer
        transition-all duration-200
        ${displayMode === 'image_only' ? 'p-0' : 'px-1 py-0.5 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300'}
        ${isSelected ? 'ring-2 ring-blue-400' : ''}
        ${className}
      `}
      title={`附件字段：${fieldName}，共 ${attachmentCount} 个附件。双击编辑配置`}
      style={getContainerStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit?.();
      }}
      data-field-name={fieldName}
      data-variable-type="attachment"
      data-attachment-count={attachmentCount}
    >
          {/* 显示模式：只显示图片 - 渲染所有图片，无任何文字 */}
          {displayMode === 'image_only' && (
            <>
              {imageUrls.length > 0 ? (
                // 【重构】渲染所有图片
                imageUrls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt=""
                    style={getImageStyle()}
                    className="rounded"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      // 图片加载失败时，隐藏图片
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                    }}
                  />
                ))
              ) : (
                // 没有图片 URL 时显示空白占位符
                <div 
                  style={{ 
                    width: config?.width || 80, 
                    height: config?.height || 80,
                    background: '#f3f4f6',
                    borderRadius: '4px'
                  }}
                  title={fileName}
                />
              )}
            </>
          )}

          {/* 显示模式：基础信息 - 只显示文件名，无图片 */}
          {displayMode === 'basic_info' && (
            <span className="text-sm text-blue-700 truncate max-w-[200px]">
              {fileNames && fileNames.length > 0 
                ? fileNames.join(', ')
                : fileName}
            </span>
          )}

          {/* 显示模式：高级显示 - 显示图片 + 详细信息 */}
          {displayMode === 'advanced' && (
            <>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={fileName}
                  style={{ maxWidth: '60px', maxHeight: '60px', borderRadius: '4px' }}
                  className="rounded mr-2"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                  }}
                />
              ) : (
                <FileImage className="w-6 h-6 text-blue-500 mr-2" />
              )}
              <div className="flex flex-col">
                <span className="text-xs text-gray-600">File: [{fileName}]</span>
                <span className="text-xs text-gray-600 truncate max-w-[120px]">URL: [{imageUrl || '无'}]</span>
                {attachmentCount > 1 && (
                  <span className="text-xs text-blue-500">共 {attachmentCount} 张</span>
                )}
              </div>
            </>
          )}

          {/* 悬停浮窗按钮 - 仅在编辑状态下显示 */}
          {isEditing && isHovered && (
            <span 
              className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-800 rounded-md px-2 py-1 shadow-lg z-[60]"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={(e) => {
                // 检查鼠标是否真的离开了整个组件区域
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                  const isOutside = 
                    e.clientX < rect.left || 
                    e.clientX > rect.right || 
                    e.clientY < rect.top || 
                    e.clientY > rect.bottom;
                  if (isOutside) {
                    setIsHovered(false);
                  }
                }
              }}
            >
              <GripVertical className="w-3 h-3 text-gray-400 cursor-grab" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
                className="p-1 hover:bg-gray-700 rounded text-white"
                title="编辑"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
                className="p-1 hover:bg-red-600 rounded text-white"
                title="删除"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          )}
    </span>
  );
};

export default AttachmentVariableChip;
