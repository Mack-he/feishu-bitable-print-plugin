#!/usr/bin/env node
/**
 * 生成预置模板缩略图（SVG）
 *
 * 用法：node scripts/generate-template-thumbnails.mjs
 * 输出：public/templates/<id>.svg（每个模板一张，尺寸对应首页卡片的 3:4 比例）
 *
 * 缩略图用矢量色块模拟单据版式（表头、表格、勾选项、签字栏、印章等），
 * 不依赖字体文件以外的外部资源，单文件 1~2KB。
 * 新增预置模板时，在 TEMPLATES 里追加一条即可。
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('public/templates');
const W = 240;
const H = 320;
const SHEET = { x: 22, y: 14, w: 196, h: 292 };
const PAD = 20;
const X = SHEET.x + PAD;              // 内容区左边界
const CW = SHEET.w - PAD * 2;         // 内容区宽度
const TOP = 78;                       // 内容区起始 y（标题之下）
const BOTTOM = SHEET.y + SHEET.h - 12;

const ACCENT = {
  jxc: '#2563eb',
  production: '#d97706',
  finance: '#059669',
  admin: '#7c3aed',
  contract: '#475569',
  hr: '#0891b2',
  sales: '#e11d48',
  application: '#0d9488',
  engineering: '#ea580c',
};

const GRAY = '#cbd5e1';
const LIGHT = '#e2e8f0';
const DARK = '#94a3b8';
const FONT = "system-ui,-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif";

const bar = (x, y, w, h, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"${extra}/>`;

/** 游标式绘图：每个方法返回 this，按自上而下的顺序排版 */
class Pen {
  constructor(accent) {
    this.accent = accent;
    this.y = TOP;
    this.parts = [];
  }

  push(s) {
    this.parts.push(s);
    return this;
  }

  gap(n = 10) {
    this.y += n;
    return this;
  }

  /** 单据标题 + 强调下划线 */
  heading(text) {
    this.push(
      `<text x="${W / 2}" y="${this.y}" text-anchor="middle" font-family="${FONT}" ` +
        `font-size="17" font-weight="700" letter-spacing="1" fill="${this.accent}">${text}</text>`
    );
    this.y += 9;
    this.push(`<rect x="${W / 2 - 22}" y="${this.y}" width="44" height="2.5" rx="1.25" fill="${this.accent}" opacity="0.5"/>`);
    this.y += 16;
    return this;
  }

  /** 段落文本行 */
  lines(widths, { h = 5, gap = 9, color = GRAY } = {}) {
    for (const w of widths) {
      this.push(bar(X, this.y, w, h, color));
      this.y += h + gap;
    }
    return this;
  }

  /** 标签 + 填写线（表单字段） */
  fields(n, { labelW = 30, gap = 15, spread = false } = {}) {
    for (let i = 0; i < n; i++) {
      const offset = spread && i % 2 === 1 ? CW / 2 : 0;
      const w = spread ? CW / 2 - 12 : CW;
      this.push(bar(X + offset, this.y, labelW, 5, DARK));
      this.push(bar(X + offset + labelW + 8, this.y + 3, w - labelW - 8, 1.5, GRAY));
      if (!spread || i % 2 === 1) this.y += gap;
    }
    return this;
  }

  /** 表格：表头 + 数据行，金额列右对齐 */
  table({ rows = 2, cols = 3, h = 16, amountCol = false } = {}) {
    const colW = CW / cols;
    const top = this.y;
    this.push(`<rect x="${X}" y="${top}" width="${CW}" height="${h}" rx="2" fill="${this.accent}" opacity="0.14"/>`);
    for (let c = 0; c < cols; c++) {
      this.push(bar(X + c * colW + 6, top + h / 2 - 2.5, Math.min(colW - 14, 20), 5, this.accent, ' opacity="0.7"'));
    }
    this.y += h;
    for (let r = 0; r < rows; r++) {
      this.push(`<rect x="${X}" y="${this.y}" width="${CW}" height="${h}" fill="none" stroke="${LIGHT}" stroke-width="1"/>`);
      for (let c = 0; c < cols; c++) {
        const last = amountCol && c === cols - 1;
        const w = last ? 16 : Math.min(colW - 14, 26);
        const bx = last ? X + (c + 1) * colW - w - 6 : X + c * colW + 6;
        this.push(bar(bx, this.y + h / 2 - 2.5, w, 5, GRAY));
      }
      this.y += h;
    }
    for (let c = 1; c < cols; c++) {
      const lx = X + c * colW;
      this.push(`<line x1="${lx}" y1="${top + h}" x2="${lx}" y2="${this.y}" stroke="${LIGHT}" stroke-width="1"/>`);
    }
    return this;
  }

  /** 合计行（金额强调） */
  total({ h = 17 } = {}) {
    this.push(`<rect x="${X}" y="${this.y}" width="${CW}" height="${h}" rx="2" fill="${this.accent}" opacity="0.12"/>`);
    this.push(bar(X + CW * 0.55, this.y + h / 2 - 2.5, 26, 5, GRAY));
    this.push(bar(X + CW - 34, this.y + h / 2 - 2.5, 28, 5, this.accent, ' opacity="0.85"'));
    this.y += h + 6;
    return this;
  }

  /** 勾选框列表（巡检、检查类） */
  checks(n, { gap = 14 } = {}) {
    for (let i = 0; i < n; i++) {
      this.push(`<rect x="${X}" y="${this.y}" width="9" height="9" rx="2" fill="none" stroke="${this.accent}" stroke-width="1.2" opacity="0.75"/>`);
      this.push(bar(X + 15, this.y + 2, CW - 15 - (i % 3) * 22, 5, GRAY));
      this.y += gap;
    }
    return this;
  }

  /** 签字栏：虚线 + 名称 */
  signs(n = 2, { lineW = 0, gap = 24, labels = true } = {}) {
    const blockW = CW / n;
    const lw = lineW || blockW - 14;
    for (let i = 0; i < n; i++) {
      const sx = X + i * blockW;
      this.push(`<line x1="${sx}" y1="${this.y + 14}" x2="${sx + lw}" y2="${this.y + 14}" stroke="${DARK}" stroke-width="1" stroke-dasharray="3 3"/>`);
      if (labels) this.push(bar(sx, this.y + 20, 18, 4, LIGHT));
    }
    this.y += gap;
    return this;
  }

  /** 段落框（事由、说明） */
  box(lines = 3, { h = 0, gap = 14 } = {}) {
    const height = h || lines * (5 + 9) + 12;
    this.push(`<rect x="${X}" y="${this.y}" width="${CW}" height="${height}" rx="3" fill="none" stroke="${LIGHT}" stroke-width="1"/>`);
    const inner = this.y + 8;
    for (let i = 0; i < lines; i++) {
      this.push(bar(X + 8, inner + i * gap, i === lines - 1 ? CW * 0.55 : CW - 16 - (i % 2) * 20, 5, GRAY));
    }
    this.y += height;
    return this;
  }

  /** 柱状图（日报、统计类） */
  chart(values, { h = 40, gap = 6 } = {}) {
    const colW = (CW - gap * (values.length - 1)) / values.length;
    const base = this.y + h;
    values.forEach((v, i) => {
      const bh = h * v;
      this.push(`<rect x="${X + i * (colW + gap)}" y="${base - bh}" width="${colW}" height="${bh}" rx="2" fill="${this.accent}" opacity="${0.35 + (i % 3) * 0.22}"/>`);
    });
    this.push(`<line x1="${X}" y1="${base}" x2="${X + CW}" y2="${base}" stroke="${LIGHT}" stroke-width="1"/>`);
    this.y = base + 8;
    return this;
  }

  /** 证件照占位（员工信息表） */
  photo({ w = 44, h = 54, fields = 3 } = {}) {
    this.push(`<rect x="${X}" y="${this.y}" width="${w}" height="${h}" rx="3" fill="#f1f5f9" stroke="${LIGHT}" stroke-width="1"/>`);
    this.push(`<circle cx="${X + w / 2}" cy="${this.y + h * 0.34}" r="7" fill="${GRAY}"/>`);
    this.push(`<path d="M${X + 8} ${this.y + h - 8} a${w / 2 - 8} ${h * 0.28} 0 0 1 ${w - 16} 0" fill="${GRAY}"/>`);
    const fx = X + w + 12;
    const fw = CW - w - 12;
    for (let i = 0; i < fields; i++) {
      const fy = this.y + 6 + i * 16;
      this.push(bar(fx, fy, 26, 5, DARK));
      this.push(bar(fx + 32, fy + 3, fw - 32, 1.5, GRAY));
    }
    this.y += h;
    return this;
  }

  /** 印章（监理、合同类） */
  stamp({ cx = X + CW - 30, cy = 0, r = 24 } = {}) {
    const c = cy || BOTTOM - r - 6;
    this.push(
      `<g transform="rotate(-12 ${cx} ${c})" opacity="0.55">` +
        `<circle cx="${cx}" cy="${c}" r="${r}" fill="none" stroke="${this.accent}" stroke-width="2"/>` +
        `<circle cx="${cx}" cy="${c}" r="${r - 6}" fill="none" stroke="${this.accent}" stroke-width="0.8" stroke-dasharray="2 3"/>` +
        `<rect x="${cx - r / 2}" y="${c - 2.5}" width="${r}" height="5" rx="2.5" fill="${this.accent}" opacity="0.7"/>` +
        `</g>`
    );
    return this;
  }

  render() {
    const footer = `<rect x="${W / 2 - 12}" y="${SHEET.y + SHEET.h - 10}" width="24" height="4" rx="2" fill="${LIGHT}"/>`;
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">`,
      `<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%">`,
      `<feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.12"/>`,
      `</filter></defs>`,
      `<rect x="${SHEET.x}" y="${SHEET.y}" width="${SHEET.w}" height="${SHEET.h}" rx="6" fill="#ffffff" stroke="${LIGHT}" filter="url(#sh)"/>`,
      `<rect x="${SHEET.x}" y="${SHEET.y}" width="${SHEET.w}" height="4" rx="2" fill="${this.accent}" opacity="0.85"/>`,
      ...this.parts,
      footer,
      `</svg>`,
      ``,
    ].join('\n');
  }
}

const TEMPLATES = [
  // 进销存
  { id: 'quote', name: '报价单', accent: ACCENT.jxc, draw: (p) => p.heading('报价单').fields(2).gap(4).table({ rows: 5, cols: 3, amountCol: true }).gap(6).signs(2) },
  { id: 'order', name: '订购单', accent: ACCENT.jxc, draw: (p) => p.heading('订购单').fields(2).gap(4).table({ rows: 3, cols: 3, amountCol: true }).total().signs(2) },
  { id: 'invoice', name: '发货单', accent: ACCENT.jxc, draw: (p) => p.heading('发货单').fields(3).gap(4).table({ rows: 3, cols: 3, amountCol: true }).gap(6).signs(2) },
  // 生产
  { id: 'inspection', name: '巡检记录表', accent: ACCENT.production, draw: (p) => p.heading('巡检记录表').fields(2).gap(6).checks(5).gap(6).signs(2) },
  { id: 'work-order', name: '工单', accent: ACCENT.production, draw: (p) => p.heading('工单').fields(3).gap(6).checks(4).gap(6).signs(2) },
  // 财务
  { id: 'reimbursement', name: '报销单', accent: ACCENT.finance, draw: (p) => p.heading('报销单').fields(3).gap(4).table({ rows: 3, cols: 3, amountCol: true }).gap(8).signs(3) },
  { id: 'payment', name: '付款申请单', accent: ACCENT.finance, draw: (p) => p.heading('付款申请单').fields(3).gap(4).table({ rows: 3, cols: 2, amountCol: true }).gap(8).signs(4) },
  // 行政
  { id: 'leave', name: '请假申请单', accent: ACCENT.admin, draw: (p) => p.heading('请假申请单').fields(3).gap(6).box(3).gap(8).signs(3) },
  { id: 'meeting', name: '会议纪要', accent: ACCENT.admin, draw: (p) => p.heading('会议纪要').fields(2).gap(6).lines([CW, CW - 24, CW - 8, CW * 0.7]).gap(8).table({ rows: 2, cols: 3 }) },
  // 合同协议
  { id: 'contract', name: '购销合同', accent: ACCENT.contract, draw: (p) => p.heading('购销合同').lines([CW, CW - 18, CW, CW - 30, CW - 6, CW - 22]).gap(8).lines([CW - 10, CW, CW - 26, CW * 0.72]).gap(8).signs(2) },
  { id: 'nda', name: '保密协议', accent: ACCENT.contract, draw: (p) => p.heading('保密协议').lines([CW, CW - 14, CW - 28, CW, CW - 20]).gap(7).lines([CW - 8, CW, CW - 24, CW - 12, CW * 0.6]).gap(8).signs(2) },
  // 人事
  { id: 'resume', name: '员工信息表', accent: ACCENT.hr, draw: (p) => p.heading('员工信息表').photo({ fields: 3 }).gap(8).table({ rows: 2, cols: 2 }).gap(8).lines([CW * 0.62]) },
  { id: 'onboarding', name: '入职登记表', accent: ACCENT.hr, draw: (p) => p.heading('入职登记表').fields(4, { spread: true }).gap(4).fields(3, { spread: true }).gap(4).fields(4, { spread: true }).gap(6).signs(2) },
  // 销售
  { id: 'sales-report', name: '销售日报', accent: ACCENT.sales, draw: (p) => p.heading('销售日报').fields(2).gap(10).chart([0.45, 0.7, 0.5, 0.9, 0.65]).gap(10).table({ rows: 2, cols: 3, amountCol: true }) },
  { id: 'visit', name: '客户拜访记录', accent: ACCENT.sales, draw: (p) => p.heading('客户拜访记录').fields(3).gap(6).lines([CW, CW - 26, CW - 10, CW - 32]).gap(6).signs(2) },
  // 申请表
  { id: 'application', name: '通用申请表', accent: ACCENT.application, draw: (p) => p.heading('通用申请表').fields(4).gap(6).box(2).gap(8).signs(3) },
  // 工程监理
  { id: 'supervision-notice', name: '监理通知单', accent: ACCENT.engineering, draw: (p) => p.heading('监理通知单').fields(3).gap(6).lines([CW, CW - 20]).gap(8).box(2).gap(6).signs(2).stamp({ cx: X + CW - 32, cy: BOTTOM - 30, r: 24 }) },
  { id: 'supervision-inspection', name: '监理巡查记录', accent: ACCENT.engineering, draw: (p) => p.heading('监理巡查记录').fields(2).gap(6).checks(4).gap(8).table({ rows: 2, cols: 2 }) },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

let failed = false;
for (const tpl of TEMPLATES) {
  const pen = new Pen(tpl.accent);
  tpl.draw(pen);
  if (pen.y > BOTTOM) {
    console.error(`[超出边界] ${tpl.name}: 内容底部 ${pen.y} > ${BOTTOM}`);
    failed = true;
  }
  const file = path.join(OUT_DIR, `${tpl.id}.svg`);
  fs.writeFileSync(file, pen.render(), 'utf8');
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`${tpl.name.padEnd(8, '　')} -> public/templates/${tpl.id}.svg  (${kb} KB, 内容底部 y=${pen.y})`);
}

console.log(`\n共生成 ${TEMPLATES.length} 张缩略图，输出目录 ${OUT_DIR}`);
if (failed) process.exitCode = 1;