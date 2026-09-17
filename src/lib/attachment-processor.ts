/**
 * 附件字段预处理工具
 * 用于打印预览和模板预览中的附件字段处理
 */

// URL 缓存（避免重复请求）
const urlCache = new Map<string, { url: string; expiry: number }>();

// 缓存有效期（9分钟，略小于飞书 URL 的有效期）
const CACHE_DURATION = 9 * 60 * 1000;

/**
 * 字段元数据接口
 */
interface FieldMeta {
  id: string;
  name: string;
  type: number | string;
}

/**
 * 附件数据接口
 */
interface AttachmentItem {
  token?: string;
  file_token?: string;  // 【新增】飞书返回的文件令牌字段名
  name?: string;
  fileName?: string;
  type?: string;
  mimeType?: string;
  size?: number;
  url?: string;
  fileUrl?: string;
  tmpUrl?: string;
  tmp_url?: string;     // 【新增】飞书返回的临时 URL 字段名
  previewUrl?: string;  // 【新增】预览 URL
}

/**
 * 预处理选项
 */
interface ProcessOptions {
  /** 图片最大宽度 */
  maxImageWidth?: number;
  /** 图片最大高度 */
  maxImageHeight?: number;
  /** 是否包含文件名 */
  includeFileName?: boolean;
}

/**
 * 检查是否在飞书环境中
 */
export async function isFeishuEnvironment(): Promise<boolean> {
  try {
    const { bitable } = await import('@lark-base-open/js-sdk');
    const base = await bitable.base;
    return !!base;
  } catch {
    return false;
  }
}

/**
 * 获取飞书 table 对象
 */
export async function getFeishuTable(): Promise<any | null> {
  try {
    const { bitable } = await import('@lark-base-open/js-sdk');
    const base = await bitable.base;
    const table = await base.getActiveTable();
    return table;
  } catch (error) {
    console.warn('[AttachmentProcessor] 获取飞书 table 失败:', error);
    return null;
  }
}

/**
 * 获取附件临时 URL（带缓存）
 */
export async function getAttachmentUrl(
  token: string,
  fieldId: string,
  recordId: string,
  attachmentIndex: number,
  table: any
): Promise<string | null> {
  const cacheKey = `${token}-${fieldId}-${recordId}-${attachmentIndex}`;
  
  // 检查缓存
  const cached = urlCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.url;
  }
  
  try {
    // 获取附件字段对象
    const attachmentField = await table.getField(fieldId);
    
    // 调用 getAttachmentUrls 方法获取临时 URL
    let url: string | null = null;
    
    if (typeof attachmentField.getAttachmentUrls === 'function') {
      const urls = await attachmentField.getAttachmentUrls(recordId);
      
      if (Array.isArray(urls) && urls.length > attachmentIndex) {
        url = urls[attachmentIndex];
        console.log(`[AttachmentProcessor] 获取到 URL，索引 ${attachmentIndex}:`, url?.substring(0, 50));
      }
    }
    
    if (url) {
      // 缓存 URL
      urlCache.set(cacheKey, {
        url,
        expiry: Date.now() + CACHE_DURATION
      });
    }
    
    return url;
  } catch (error) {
    console.error(`[AttachmentProcessor] 获取附件 URL 失败:`, error);
    return null;
  }
}

/**
 * 转换单个附件为 HTML
 */
async function convertAttachmentToHTML(
  attachment: AttachmentItem,
  index: number,
  fieldId: string,
  recordId: string,
  table: any,
  options: ProcessOptions
): Promise<string> {
  const {
    maxImageWidth = 120,
    maxImageHeight = 120,
    includeFileName = false
  } = options;
  
  try {
    // 优先使用已有的 URL（支持多种字段名）
    let url: string | null | undefined = attachment.url 
      || attachment.fileUrl 
      || attachment.tmpUrl 
      || (attachment as any).tmp_url 
      || (attachment as any).previewUrl 
      || null;
    
    // 如果没有 URL，尝试通过飞书 API 获取
    if (!url && attachment.token && table) {
      url = await getAttachmentUrl(
        attachment.token,
        fieldId,
        recordId,
        index,
        table
      );
    }
    
    if (!url) {
      return `<div style="color: #999; padding: 5px; border: 1px dashed #ccc; margin: 5px 0; font-size: 12px;">
        无法加载: ${attachment.name || attachment.fileName || '未命名附件'}
      </div>`;
    }
    
    const name = attachment.name || attachment.fileName || `图片${index + 1}`;
    
    const fileNameHtml = includeFileName ? `
      <div style="
        font-size: 11px;
        color: #6b7280;
        margin-top: 4px;
        max-width: ${maxImageWidth}px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      ">${name}</div>
    ` : '';
    
    return `
      <div style="display: inline-block; margin: 4px; text-align: center; vertical-align: top;">
        <img 
          src="${url}" 
          alt="${name}"
          style="
            max-width: ${maxImageWidth}px;
            max-height: ${maxImageHeight}px;
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
          max-width: ${maxImageWidth}px;
          word-break: break-word;
        ">${name}</div>
        ${fileNameHtml}
      </div>
    `;
  } catch (error) {
    console.warn('[AttachmentProcessor] 处理单个附件失败:', attachment.name, error);
    return `<div style="color: #999; padding: 5px; font-size: 12px;">加载失败</div>`;
  }
}

/**
 * 转换附件数组为 HTML
 */
async function convertAttachmentsToHTML(
  attachments: AttachmentItem[],
  fieldId: string,
  recordId: string,
  table: any,
  options: ProcessOptions
): Promise<string> {
  if (!attachments || attachments.length === 0) {
    return '';
  }
  
  const htmlParts = await Promise.all(
    attachments.map((attachment, index) =>
      convertAttachmentToHTML(attachment, index, fieldId, recordId, table, options)
    )
  );
  
  return `<div style="display: flex; flex-wrap: wrap; gap: 4px;">${htmlParts.join('')}</div>`;
}

/**
 * 处理记录中的附件字段
 * 
 * @param record - 原始记录数据
 * @param fields - 字段元数据列表
 * @param fieldTypeMap - 字段类型映射（可选，用于快速查找附件字段）
 * @param table - 飞书 table 对象（可选，用于获取附件 URL）
 * @param options - 处理选项
 * @returns 处理后的记录数据
 * 
 * @example
 * const processedRecord = await processRecordAttachments(
 *   record,
 *   fields,
 *   fieldTypeMap,
 *   table,
 *   { maxImageWidth: 150, maxImageHeight: 150 }
 * );
 * 
 * // processedRecord 包含：
 * // {
 * //   "照片": [原始附件数组],
 * //   "_照片_html": "<div><img...></div>",
 * //   "_照片_names": ["图片1.jpg", "图片2.jpg"]
 * // }
 */
export async function processRecordAttachments(
  record: Record<string, any>,
  fields: FieldMeta[],
  fieldTypeMap?: Record<string, string>,
  table?: any,
  options: ProcessOptions = {}
): Promise<Record<string, any>> {
  // 创建深拷贝，避免修改原始数据
  const processedRecord = JSON.parse(JSON.stringify(record));
  
  // 识别附件字段
  const attachmentFields: { name: string; id: string }[] = [];
  
  // 方式1：通过 fieldTypeMap 快速识别
  if (fieldTypeMap) {
    for (const [fieldName, fieldType] of Object.entries(fieldTypeMap)) {
      if (fieldType === 'attachment') {
        const field = fields.find(f => f.name === fieldName);
        attachmentFields.push({
          name: fieldName,
          id: field?.id || fieldName
        });
      }
    }
  }
  
  // 方式2：通过字段元数据识别（type = 17）
  if (attachmentFields.length === 0) {
    for (const field of fields) {
      const typeNum = typeof field.type === 'string' ? parseInt(field.type, 10) : field.type;
      if (typeNum === 17) {
        attachmentFields.push({
          name: field.name,
          id: field.id
        });
      }
    }
  }
  
  if (attachmentFields.length === 0) {
    console.log('[AttachmentProcessor] 没有附件字段需要处理');
    return processedRecord;
  }
  
  console.log(`[AttachmentProcessor] 发现 ${attachmentFields.length} 个附件字段:`, 
    attachmentFields.map(f => f.name));
  
  // 获取记录 ID
  const recordId = record.id || record._sourceRecordId || record.recordId;
  
  // 如果没有传入 table，尝试获取
  let activeTable = table;
  if (!activeTable) {
    activeTable = await getFeishuTable();
  }
  
  // 处理每个附件字段
  for (const { name: fieldName, id: fieldId } of attachmentFields) {
    // 获取字段值
    let fieldValue = processedRecord[fieldName];
    
    // 如果字段名找不到，尝试用字段 ID 查找
    if (fieldValue === undefined && fieldId) {
      fieldValue = processedRecord[fieldId];
    }
    
    if (fieldValue === undefined) {
      console.log(`[AttachmentProcessor] 记录中不存在字段 "${fieldName}"`);
      continue;
    }
    
    // 只处理数组类型的附件字段
    if (!Array.isArray(fieldValue)) {
      console.log(`[AttachmentProcessor] 字段 "${fieldName}" 不是数组，跳过`);
      continue;
    }
    
    if (fieldValue.length === 0) {
      console.log(`[AttachmentProcessor] 字段 "${fieldName}" 是空数组，跳过`);
      continue;
    }
    
    console.log(`[AttachmentProcessor] 处理附件字段 "${fieldName}" (${fieldValue.length} 个附件)`);
    
    // 检查是否已有可用的 URL（从缓存或其他来源）
    const hasValidUrls = fieldValue.some(
      (item: AttachmentItem) => item.url || item.fileUrl || item.tmpUrl || (item as any).tmp_url || (item as any).previewUrl
    );
    
    // 如果有 table 或已有 URL，进行 HTML 转换
    if (activeTable || hasValidUrls) {
      try {
        const htmlContent = await convertAttachmentsToHTML(
          fieldValue,
          fieldId,
          recordId,
          activeTable,
          options
        );
        
        // 提取文件名列表
        const fileNames = fieldValue.map(
          (a: AttachmentItem) => a.name || a.fileName || '未命名附件'
        );
        
        // 保留原始附件数组
        processedRecord[fieldName] = fieldValue;
        
        // 存储 HTML 内容
        if (htmlContent) {
          processedRecord[`_${fieldName}_html`] = htmlContent;
          processedRecord[`_${fieldName}_names`] = fileNames;
          console.log(`[AttachmentProcessor] 字段 "${fieldName}" 处理完成`);
        }
        
        // 同时按字段 ID 存储（兼容不同查找方式）
        if (fieldId && fieldId !== fieldName) {
          processedRecord[fieldId] = fieldValue;
          processedRecord[`_${fieldId}_html`] = htmlContent;
          processedRecord[`_${fieldId}_names`] = fileNames;
        }
      } catch (error) {
        console.error(`[AttachmentProcessor] 处理字段 "${fieldName}" 失败:`, error);
      }
    } else {
      // 没有 table 且没有 URL，仅存储文件名
      const fileNames = fieldValue.map(
        (a: AttachmentItem) => a.name || a.fileName || '未命名附件'
      );
      processedRecord[`_${fieldName}_names`] = fileNames;
      console.log(`[AttachmentProcessor] 字段 "${fieldName}" 无法获取 URL，仅存储文件名`);
    }
  }
  
  return processedRecord;
}

/**
 * 批量处理多条记录的附件字段
 */
export async function processRecordsAttachments(
  records: Record<string, any>[],
  fields: FieldMeta[],
  fieldTypeMap?: Record<string, string>,
  table?: any,
  options: ProcessOptions = {}
): Promise<Record<string, any>[]> {
  return Promise.all(
    records.map(record => 
      processRecordAttachments(record, fields, fieldTypeMap, table, options)
    )
  );
}

/**
 * 清除 URL 缓存
 */
export function clearAttachmentUrlCache(): void {
  urlCache.clear();
}
