'use client';

// 方框字符（打勾用）渲染工具
//
// Word/Excel 模板里的打勾方格通常是文本字符：□ ☐ ☑ ☒。
// 直接按字体字形渲染，在无衬线字体与打印时经常偏小、变形甚至显示为豆腐块。
// 这里统一用 CSS 边框画成内联正方形：字体字号变化时按 em 等比缩放，
// 编辑、预览、PDF 导出、浏览器打印效果一致。

import React from 'react';

/** 需要按方框特殊渲染的字符（带捕获组：split 时保留分隔字符本身） */
const BOX_CHAR_PATTERN = /([□☐☑☒])/;

function markOf(char: string): string {
  if (char === '☑') return '✓';
  if (char === '☒') return '✗';
  return '';
}

/**
 * JSX 渲染：把文本中的方框字符渲染为内联正方形
 */
export function BoxAwareText({ text }: { text: string }): React.ReactNode {
  if (!text) return null;
  const parts = text.split(BOX_CHAR_PATTERN);
  return (
    <>
      {parts.map((part, index) =>
        part.length === 1 && BOX_CHAR_PATTERN.test(part) ? (
          <span
            key={index}
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: '0.88em',
              height: '0.88em',
              border: '1.5px solid currentColor',
              borderRadius: '2px',
              position: 'relative',
              verticalAlign: '-0.12em',
              boxSizing: 'border-box',
            }}
          >
            {/* 隐藏原始字形（fontSize: 0 使其不可见），只保留边框方框 */}
            <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, fontSize: 0, overflow: 'hidden' }}>
              {part}
            </span>
            {markOf(part) && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.68em',
                  lineHeight: 1,
                }}
              >
                {markOf(part)}
              </span>
            )}
          </span>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

/**
 * HTML 字符串渲染（打印/PDF 路径）：把方框字符替换为内联正方形 span
 */
export function formatCheckboxGlyphsHtml(html: string): string {
  if (!html || typeof html !== 'string') return html;
  const wrap = (inner: string) =>
    `<span style="display:inline-block;width:0.88em;height:0.88em;border:1.5px solid currentColor;border-radius:2px;position:relative;vertical-align:-0.12em;box-sizing:border-box;"><span style="position:absolute;top:0;left:0;right:0;bottom:0;font-size:0;overflow:hidden;">&nbsp;</span>${
      inner ? `<span style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;font-size:0.68em;line-height:1;">${inner}</span>` : ''
    }</span>`;
  return html.replace(/[□☐☑☒]/g, (char) => wrap(markOf(char)));
}