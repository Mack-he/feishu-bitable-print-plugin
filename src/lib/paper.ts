/**
 * 纸张尺寸解析层
 *
 * 这里是纸张尺寸的唯一数据源与唯一换算入口：
 * - 内置纸张（前端常量，不入库）
 * - 用户自定义纸张（来自服务端 paper_presets，见 PaperPresetLike）
 * - mm → px 换算（此前 3.78 在 4 个组件里各写了一份）
 *
 * 约定：所有纸张尺寸都按「纵向基准」存储，即 width ≤ height；
 * 横向/纵向由 PageConfig.orientation 在渲染时交换宽高，与内置纸张保持一致。
 *
 * 本文件不依赖任何运行时模块（只用 type import），可被 types/editor.ts 反向再导出。
 */

import type { PageConfig } from '@/types/editor';

/** 编辑器与预览统一使用的 mm→px 比例（历史值，改动会导致存量模板画面变化） */
export const MM_TO_PX = 3.78;

/** 自定义纸张尺寸允许范围（mm） */
export const PAPER_MIN_MM = 10;
export const PAPER_MAX_MM = 2000;

/** 自定义纸张名称最大长度 */
export const PAPER_NAME_MAX_LENGTH = 20;

export type PaperGroup = 'A 系列' | 'B 系列' | '国内开本' | '北美标准';

export interface BuiltInPaper {
  key: string;
  label: string;
  group: PaperGroup;
  /** mm，纵向基准 */
  width: number;
  height: number;
}

/** 内置常用纸张（前端常量，不参与权限管理） */
export const BUILT_IN_PAPERS: BuiltInPaper[] = [
  { key: 'A3', label: 'A3', group: 'A 系列', width: 297, height: 420 },
  { key: 'A4', label: 'A4', group: 'A 系列', width: 210, height: 297 },
  { key: 'A5', label: 'A5', group: 'A 系列', width: 148, height: 210 },
  { key: 'A6', label: 'A6', group: 'A 系列', width: 105, height: 148 },
  { key: 'B4', label: 'B4', group: 'B 系列', width: 250, height: 353 },
  { key: 'B5', label: 'B5', group: 'B 系列', width: 176, height: 250 },
  { key: 'B6', label: 'B6', group: 'B 系列', width: 125, height: 176 },
  { key: '16K', label: '16开', group: '国内开本', width: 185, height: 260 },
  { key: 'BIG16K', label: '大16开', group: '国内开本', width: 210, height: 285 },
  { key: '32K', label: '32开', group: '国内开本', width: 130, height: 184 },
  { key: 'BIG32K', label: '大32开', group: '国内开本', width: 140, height: 203 },
  { key: 'Letter', label: 'Letter', group: '北美标准', width: 216, height: 279 },
  { key: 'Legal', label: 'Legal', group: '北美标准', width: 216, height: 356 },
];

/** 内置纸张查询表（保留此前的导出形态，便于旧引用平滑过渡） */
export const PAGE_SIZES: Record<string, { width: number; height: number }> = Object.fromEntries(
  BUILT_IN_PAPERS.map((paper) => [paper.key, { width: paper.width, height: paper.height }])
);

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

/** 自定义纸张预设（服务端 paper_presets 的最小子集） */
export interface PaperPresetLike {
  id: number;
  name: string;
  widthMm: number;
  heightMm: number;
  isPublic?: boolean;
  status?: string;
  ownerName?: string | null;
}

export interface ResolvedPaper {
  /** mm，已按 orientation 换算为实际横向宽度 */
  width: number;
  height: number;
  /** 未按 orientation 换算的纵向基准尺寸（PDF 导出用） */
  baseWidth: number;
  baseHeight: number;
  label: string;
  isCustom: boolean;
  /** 命中的自定义预设 id（未命中为 undefined） */
  presetId?: number;
}

export function isBuiltInPaper(key: unknown): boolean {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(PAGE_SIZES, key);
}

export function getBuiltInPaper(key: unknown): BuiltInPaper | undefined {
  return BUILT_IN_PAPERS.find((paper) => paper.key === key);
}

export function isValidPaperMm(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= PAPER_MIN_MM && value <= PAPER_MAX_MM;
}

/** 保留 1 位小数，避免浮点噪声写进配置 */
export function roundPaperMm(value: number): number {
  return Math.round(value * 10) / 10;
}

/** 归一化为纵向基准（宽 ≤ 高），返回是否发生了交换 */
export function normalizePaperDims(width: number, height: number): { width: number; height: number; swapped: boolean } {
  if (width > height) {
    return { width: roundPaperMm(height), height: roundPaperMm(width), swapped: true };
  }
  return { width: roundPaperMm(width), height: roundPaperMm(height), swapped: false };
}

/** 名称校验，返回错误文案；通过则返回 null */
export function validatePaperName(name: string, existing?: string[]): string | null {
  const trimmed = (name || '').trim();
  if (!trimmed) return '请输入纸张名称';
  if (trimmed.length > PAPER_NAME_MAX_LENGTH) return `纸张名称不能超过 ${PAPER_NAME_MAX_LENGTH} 个字符`;
  if (existing?.some((item) => item === trimmed)) return '已存在同名纸张';
  return null;
}

function findPreset(presets: PaperPresetLike[] | null | undefined, id: number | null | undefined) {
  if (id === null || id === undefined || !presets?.length) return undefined;
  return presets.find((preset) => preset.id === id);
}

/**
 * 解析出实际使用的纸张尺寸，按 orientation 换算为渲染用的宽高。
 *
 * 解析优先级：
 * 1. size !== 'Custom' → 内置纸张（未登记的内置 key 回落到 A4）
 * 2. size === 'Custom' 且 paperPresetId 命中预设 → 预设尺寸
 * 3. size === 'Custom' 且配置里带尺寸快照 → 快照尺寸（预设被删/停用时模板仍可正常打印）
 * 4. 兜底 A4
 */
export function resolvePaper(
  config?: Pick<PageConfig, 'size' | 'orientation' | 'customWidth' | 'customHeight' | 'paperPresetId' | 'paperName'> | null,
  presets?: PaperPresetLike[] | null
): ResolvedPaper {
  const orientation = config?.orientation === 'landscape' ? 'landscape' : 'portrait';

  const toResolved = (baseWidth: number, baseHeight: number, label: string, isCustom: boolean, presetId?: number): ResolvedPaper => {
    const isLandscape = orientation === 'landscape';
    return {
      width: isLandscape ? baseHeight : baseWidth,
      height: isLandscape ? baseWidth : baseHeight,
      baseWidth,
      baseHeight,
      label,
      isCustom,
      presetId,
    };
  };

  if (config?.size === 'Custom') {
    const preset = findPreset(presets, config.paperPresetId);
    if (preset && isValidPaperMm(preset.widthMm) && isValidPaperMm(preset.heightMm)) {
      return toResolved(preset.widthMm, preset.heightMm, preset.name, true, preset.id);
    }
    if (isValidPaperMm(config.customWidth) && isValidPaperMm(config.customHeight)) {
      const name = config.paperName?.trim() || '自定义';
      return toResolved(config.customWidth, config.customHeight, name, true);
    }
    return toResolved(PAGE_SIZES.A4.width, PAGE_SIZES.A4.height, 'A4', false);
  }

  const builtIn = getBuiltInPaper(config?.size);
  if (builtIn) {
    return toResolved(builtIn.width, builtIn.height, builtIn.label, false);
  }

  return toResolved(PAGE_SIZES.A4.width, PAGE_SIZES.A4.height, 'A4', false);
}

export interface ResolvedPaperPx {
  canvasWidth: number;
  canvasHeight: number;
  contentWidth: number;
  contentHeight: number;
}

/**
 * 画布/预览用的像素尺寸。
 * 与重构前各组件里的公式逐值一致，保证存量模板画面不变。
 */
export function resolvePaperPx(
  config?: (Pick<PageConfig, 'size' | 'orientation' | 'customWidth' | 'customHeight' | 'paperPresetId' | 'paperName' | 'margins'>) | null,
  presets?: PaperPresetLike[] | null
): ResolvedPaperPx {
  const paper = resolvePaper(config, presets);
  const margins = config?.margins || { top: 20, bottom: 20, left: 20, right: 20 };

  const canvasWidth = paper.width * MM_TO_PX;
  const canvasHeight = paper.height * MM_TO_PX;

  return {
    canvasWidth,
    canvasHeight,
    contentWidth: canvasWidth - (margins.left + margins.right) * MM_TO_PX,
    contentHeight: canvasHeight - (margins.top + margins.bottom) * MM_TO_PX,
  };
}

/** 工具栏/状态栏展示文案，自定义纸张附带尺寸 */
export function paperLabel(
  config?: Pick<PageConfig, 'size' | 'orientation' | 'customWidth' | 'customHeight' | 'paperPresetId' | 'paperName'> | null,
  presets?: PaperPresetLike[] | null
): string {
  const paper = resolvePaper(config, presets);
  if (!paper.isCustom) return paper.label;
  const orientationLabel = config?.orientation === 'landscape' ? '横向' : '纵向';
  return `${paper.label} ${paper.baseWidth}×${paper.baseHeight}mm(${orientationLabel})`;
}

/**
 * jsPDF 的 format 参数：返回纵向基准的 [宽, 高]（mm）。
 * jsPDF 会按 orientation 自动交换，所以这里不要预先交换。
 */
export function paperToJsPdfFormat(
  config?: Pick<PageConfig, 'size' | 'orientation' | 'customWidth' | 'customHeight' | 'paperPresetId' | 'paperName'> | null,
  presets?: PaperPresetLike[] | null
): [number, number] {
  const paper = resolvePaper(config, presets);
  return [paper.baseWidth, paper.baseHeight];
}