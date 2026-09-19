// 导入排版模板：用户上传 Word(.docx) / Excel(.xlsx) 文件，
// 服务端解析并转换为排版画布组件，返回与 AI 生成接口同构的 template 数据。
//
// 请求（JSON）：
//   { fileName: '单据模板.docx', fileData: '<base64 或 dataURL>', fields: [{ name }] }
// 响应：
//   { success: true, data: { name, description, components, pageConfig, styleConfig,
//                            variables, unknownVariables, warnings, source, sheetName, notice } }

import { NextResponse } from 'next/server';
import { authenticate } from '@/app/api/templates/_shared';
import { convertTemplateFile } from '@/lib/template-import';
import type { ImportFileType } from '@/lib/template-import';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface ImportRequestBody {
  fileName?: unknown;
  fileData?: unknown;
  fields?: unknown;
}

function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return '导入失败，请稍后重试';
}

export async function POST(request: Request) {
  const auth = authenticate(request);
  if ('error' in auth) return auth.error;

  let body: ImportRequestBody;
  try {
    body = (await request.json()) as ImportRequestBody;
  } catch {
    return NextResponse.json({ success: false, error: '请求体格式错误' }, { status: 400 });
  }

  const fileName = typeof body.fileName === 'string' ? body.fileName : '';
  const fileData = typeof body.fileData === 'string' ? body.fileData : '';
  if (!fileData) {
    return NextResponse.json({ success: false, error: '未收到文件内容，请重新选择文件' }, { status: 400 });
  }

  // 去掉 dataURL 前缀，得到纯 base64
  let base64 = fileData;
  const dataUrlMatch = fileData.match(/^data:[^;,]+;base64,([\s\S]+)$/i);
  if (dataUrlMatch) base64 = dataUrlMatch[1];
  base64 = base64.replace(/\s+/g, '');
  if (!base64 || !/^[A-Za-z0-9+/=_-]+$/.test(base64)) {
    return NextResponse.json({ success: false, error: '文件内容不是有效的编码' }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    return NextResponse.json({ success: false, error: '文件内容解码失败' }, { status: 400 });
  }
  if (buffer.length === 0) {
    return NextResponse.json({ success: false, error: '文件内容为空' }, { status: 400 });
  }
  if (buffer.length > MAX_FILE_BYTES) {
    return NextResponse.json({ success: false, error: '文件过大：最大支持 10MB，请压缩后再试' }, { status: 413 });
  }

  const lowerName = fileName.toLowerCase();
  const ext = lowerName.split('.').pop() || '';
  if (ext === 'doc') {
    return NextResponse.json(
      { success: false, error: '不支持旧版 .doc 格式，请在 Word 中另存为 .docx 后重试' },
      { status: 400 }
    );
  }
  if (ext === 'xls') {
    return NextResponse.json(
      { success: false, error: '不支持旧版 .xls 格式，请在 Excel 中另存为 .xlsx 后重试' },
      { status: 400 }
    );
  }

  // docx/xlsx 都是 ZIP 包，先用魔数挡掉伪装的非 Office 文件
  const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  if (!isZip) {
    return NextResponse.json(
      { success: false, error: '不支持的文件格式：仅支持 .docx（Word）与 .xlsx（Excel）模板' },
      { status: 400 }
    );
  }

  // 按扩展名判断类型；扩展名不可信时按 ZIP 内的关键条目判断真实格式
  let fileType: ImportFileType | null = null;
  if (ext === 'docx' || ext === 'dotx') fileType = 'docx';
  else if (ext === 'xlsx' || ext === 'xlsm' || ext === 'xltx') fileType = 'xlsx';

  const hasWordEntry = buffer.includes(Buffer.from('word/document.xml'));
  const hasExcelEntry = buffer.includes(Buffer.from('xl/workbook.xml'));
  if (!fileType && hasWordEntry) fileType = 'docx';
  if (!fileType && hasExcelEntry) fileType = 'xlsx';
  if (!fileType) {
    return NextResponse.json(
      {
        success: false,
        error: '压缩包内没有找到 Word/Excel 模板内容：仅支持 .docx 与 .xlsx 文件',
      },
      { status: 400 }
    );
  }
  if (fileType === 'docx' && !hasWordEntry) {
    return NextResponse.json({ success: false, error: '文件结构与 .docx 不符，请确认文件未损坏' }, { status: 400 });
  }
  if (fileType === 'xlsx' && !hasExcelEntry) {
    return NextResponse.json({ success: false, error: '文件结构与 .xlsx 不符，请确认文件未损坏' }, { status: 400 });
  }

  const fields = Array.isArray(body.fields)
    ? body.fields
        .filter((field: any) => field && typeof field.name === 'string' && field.name.trim())
        .slice(0, 200)
        .map((field: any) => ({ name: field.name.trim() }))
    : [];

  try {
    const result = await convertTemplateFile(fileType, buffer, { fileName, fields });
    const unknownCount = result.unknownVariables.length;
    const notice = unknownCount
      ? `模板中有 ${unknownCount} 个变量不在当前表格字段中（${result.unknownVariables
          .slice(0, 8)
          .map((name) => `[${name}]`)
          .join('、')}${unknownCount > 8 ? ' 等' : ''}），导入后可在编辑器里替换为正确的字段`
      : null;

    // 与 /api/ai/generate-template 的返回结构保持一致：
    // data.template 为可保存进编辑器的模板数据，其余为导入过程的元信息
    return NextResponse.json({
      success: true,
      data: {
        template: {
          name: result.name,
          description: result.description,
          components: result.components,
          pageConfig: result.pageConfig,
          styleConfig: result.styleConfig,
          variables: result.variables,
          unknownVariables: result.unknownVariables,
        },
        source: result.source,
        sheetName: result.sheetName ?? null,
        warnings: result.warnings,
        notice,
      },
    });
  } catch (error) {
    console.error('[Template Import] 转换失败:', error);
    return NextResponse.json({ success: false, error: describeError(error) }, { status: 400 });
  }
}