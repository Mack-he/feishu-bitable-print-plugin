// 预置模板共享组件生成器
//
// 【样式书写约定】组件的样式必须写成编辑器组件模型的字段，否则在编辑器里会被丢弃：
//   - textStyle.fontSize  必须是数字（编辑器拼 `${fontSize}px`，写 '24px' 会得到 '24pxpx' 这种非法值）
//   - 加粗用 textStyle.bold 布尔值（不是 fontWeight）
//   - 对齐用 textStyle.align（不是 style.textAlign）
//   - 段后距用 textStyle.paragraphSpacing 数字（编辑器不读 style.marginBottom）
// 打印预览（TemplatePreview）会额外兼容 CSS 风格写法，但编辑器不会，所以统一按上述字段写。

export const defaultPageConfig = {
  size: 'A4',
  orientation: 'portrait' as const,
  margins: { top: 20, bottom: 20, left: 20, right: 20 },
  continuous: false,
};

let idCounter = 0;
function genId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

export function titleComponent(text: string) {
  return {
    id: genId('title'),
    type: 'text',
    content: text,
    textStyle: {
      fontSize: 24,
      color: '#000000',
      bold: true,
      align: 'center' as const,
      paragraphSpacing: 16,
    },
  };
}

export function textComponent(content: string) {
  return {
    id: genId('text'),
    type: 'text',
    content,
    textStyle: {
      fontSize: 14,
      color: '#333333',
      bold: false,
      align: 'left' as const,
      paragraphSpacing: 8,
    },
  };
}

export function tableComponent(rows: string[][], colWidths?: number[]) {
  const cells = rows.map(row =>
    row.map(content => ({
      content,
      style: { fontSize: 13 },
      rowSpan: 1,
      colSpan: 1,
    }))
  );
  return {
    id: genId('table'),
    type: 'table',
    tableConfig: {
      cells,
      colWidths: colWidths || [],
      borderWidth: 1,
      borderColor: '#000000',
      showOuterBorder: true,
      showInnerBorder: true,
    },
    style: { marginBottom: '16px' },
  };
}

export function lineComponent() {
  return {
    id: genId('line'),
    type: 'line',
    style: { margin: '12px 0' },
  };
}

export function buildTemplate(components: any[]) {
  return {
    components,
    pageConfig: defaultPageConfig,
  };
}
