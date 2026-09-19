'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { Field } from '@/types/editor';
import { parseVariables } from '@/utils/variableParser';
import { cn } from '@/lib/utils';

/**
 * 二维码 / 条形码的真实渲染。
 *
 * 编辑器画布、打印预览、批量打印共用一个实现，
 * 避免出现"画布上是真码、打印出来是灰块"的不一致。
 */

/** 画布按 2 倍分辨率绘制，打印与导出时更清晰 */
const RENDER_SCALE = 2;

export const DEFAULT_QR_SIZE = 80;
export const DEFAULT_BARCODE_HEIGHT = 50;
export const DEFAULT_BARCODE_BAR_WIDTH = 2;

export const QR_SIZE_OPTIONS = [40, 60, 80, 100, 120, 150, 200];
export const BARCODE_BAR_WIDTH_OPTIONS = [1, 1.5, 2, 3, 4];
export const BARCODE_HEIGHT_OPTIONS = [30, 40, 50, 60, 80, 100];
export const BARCODE_FORMATS = ['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC'] as const;
export type BarcodeFormat = (typeof BARCODE_FORMATS)[number];

/** 变量替换：内容支持 [字段名]，打印时替换为当前记录的值 */
export function resolveCodeContent(
  content: string | undefined,
  record?: Record<string, unknown>,
  fields?: Field[],
): string {
  if (!content) return '';
  // 调用方已经替换过变量时（不传记录），按原文使用，避免二次解析
  if (!record && !fields) return content.trim();
  return parseVariables(content, record || {}, fields || []).trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** 让空画布保持占位尺寸，避免布局跳动 */
function blankCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width / RENDER_SCALE}px`;
  canvas.style.height = `${height / RENDER_SCALE}px`;
}

/** 内容为空 / 变量取不到值时的提示（可由渲染结果直接推导，无需额外状态） */
function emptyStateHint(hasRawContent: boolean, label: string, raw: string) {
  if (!hasRawContent) return `未设置${label}内容`;
  const preview = raw.length > 16 ? `${raw.slice(0, 16)}…` : raw;
  return `${preview} 暂无数据，打印时按记录生成`;
}

interface QrCodeViewProps {
  content?: string;
  size?: number;
  record?: Record<string, unknown>;
  fields?: Field[];
  className?: string;
  /** 是否在码下方显示内容文本（编辑器画布用） */
  showContent?: boolean;
}

export function QrCodeView({
  content,
  size = DEFAULT_QR_SIZE,
  record,
  fields,
  className,
  showContent = false,
}: QrCodeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const text = resolveCodeContent(content, record, fields);
  const hasRawContent = Boolean((content || '').trim());
  const px = clamp(Number(size) || DEFAULT_QR_SIZE, 24, 400);
  const error = text ? (failed ? '二维码生成失败' : '') : emptyStateHint(hasRawContent, '二维码', String(content || '').trim());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!text) {
      blankCanvas(canvas, px * RENDER_SCALE, px * RENDER_SCALE);
      return;
    }

    let cancelled = false;
    QRCode.toCanvas(canvas, text, {
      width: px * RENDER_SCALE,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then(() => {
        if (cancelled) return;
        canvas.style.width = `${px}px`;
        canvas.style.height = `${px}px`;
        setFailed(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[QrCodeView] 二维码生成失败:', err);
        setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [text, px]);

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <canvas ref={canvasRef} style={{ width: px, height: px }} />
      {error ? (
        <span className="text-[10px] text-destructive">{error}</span>
      ) : showContent ? (
        <span className="max-w-[240px] truncate text-[10px] text-muted-foreground">{text}</span>
      ) : null}
    </div>
  );
}

interface BarcodeViewProps {
  content?: string;
  format?: string;
  barWidth?: number;
  height?: number;
  displayValue?: boolean;
  record?: Record<string, unknown>;
  fields?: Field[];
  className?: string;
}

export function BarcodeView({
  content,
  format = 'CODE128',
  barWidth = DEFAULT_BARCODE_BAR_WIDTH,
  height = DEFAULT_BARCODE_HEIGHT,
  displayValue = true,
  record,
  fields,
  className,
}: BarcodeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');
  const text = resolveCodeContent(content, record, fields);
  const hasRawContent = Boolean((content || '').trim());
  const bar = clamp(Number(barWidth) || DEFAULT_BARCODE_BAR_WIDTH, 1, 6);
  const barHeight = clamp(Number(height) || DEFAULT_BARCODE_HEIGHT, 20, 200);
  const emptyError = text ? '' : emptyStateHint(hasRawContent, '条形码', String(content || '').trim());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!text) {
      blankCanvas(canvas, 200 * RENDER_SCALE, barHeight * RENDER_SCALE);
      return;
    }

    let cancelled = false;
    // JsBarcode 同步绘制且可能抛错，绘制结果（含失败提示）需要回写状态；
    // 放进微任务，避免在 effect 体内同步 setState 造成级联渲染
    queueMicrotask(() => {
      if (cancelled || !canvasRef.current) return;
      try {
        JsBarcode(canvas, text, {
          format,
          width: bar * RENDER_SCALE,
          height: barHeight * RENDER_SCALE,
          displayValue,
          fontSize: 14 * RENDER_SCALE,
          textMargin: 2 * RENDER_SCALE,
          margin: 8 * RENDER_SCALE,
          lineColor: '#000000',
          background: '#FFFFFF',
        });
        // JsBarcode 按 2 倍分辨率绘制，这里还原成 1 倍显示尺寸
        canvas.style.width = `${canvas.width / RENDER_SCALE}px`;
        canvas.style.height = `${canvas.height / RENDER_SCALE}px`;
        setError('');
      } catch (err) {
        console.error('[BarcodeView] 条形码生成失败:', err);
        blankCanvas(canvas, 200 * RENDER_SCALE, barHeight * RENDER_SCALE);
        setError(`${format} 格式对内容有长度/字符要求`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [text, format, bar, barHeight, displayValue]);

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <canvas ref={canvasRef} />
      {(emptyError || error) && (
        <span className="text-[10px] text-destructive">
          {emptyError ? emptyError : `条形码生成失败：${error}`}
        </span>
      )}
    </div>
  );
}

/** 把 SVG 序列化成可内联进打印 HTML 的字符串 */
function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(clone);
}

/**
 * 生成可内联到打印 HTML 的码图（批量打印用新窗口输出 HTML，拿不到 React 画布）。
 * 返回 null 表示内容为空或格式不合法。
 */
export async function buildCodeSvg(
  component: { type?: string; content?: string; size?: number; format?: string; barWidth?: number; height?: number; displayValue?: boolean },
  record?: Record<string, unknown>,
  fields?: Field[],
): Promise<string | null> {
  if (component.type !== 'qrcode' && component.type !== 'barcode') return null;
  const text = resolveCodeContent(component.content, record, fields);
  if (!text) return null;

  if (component.type === 'qrcode') {
    const px = clamp(Number(component.size) || DEFAULT_QR_SIZE, 24, 400);
    try {
      const svg = await QRCode.toString(text, {
        type: 'svg',
        width: px,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#FFFFFF' },
      });
      // 内联进打印 HTML 时需要带命名空间（qrcode 通常已自带，缺失时补上）
      return svg.includes('xmlns=') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    } catch (err) {
      console.error('[buildCodeSvg] 二维码生成失败:', err);
      return null;
    }
  }

  try {
    // JsBarcode 需要挂在文档里的 SVG 才能正确测量，先放进不可见的临时容器
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden';
    document.body.appendChild(host);
    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      host.appendChild(svg);
      JsBarcode(svg, text, {
        format: component.format || 'CODE128',
        width: clamp(Number(component.barWidth) || DEFAULT_BARCODE_BAR_WIDTH, 1, 6),
        height: clamp(Number(component.height) || DEFAULT_BARCODE_HEIGHT, 20, 200),
        displayValue: component.displayValue !== false,
        fontSize: 14,
        textMargin: 2,
        margin: 8,
        lineColor: '#000000',
        background: '#FFFFFF',
      });
      return serializeSvg(svg);
    } finally {
      document.body.removeChild(host);
    }
  } catch (err) {
    console.error('[buildCodeSvg] 条形码生成失败:', err);
    return null;
  }
}
