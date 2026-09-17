import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { PrintTemplate, PrintSettings, BarcodeOptions, QRCodeOptions } from '@/types/print';

/**
 * PDF 生成器
 */
export class PDFGenerator {
  private doc: jsPDF;
  private settings: PrintSettings;

  constructor(settings: PrintSettings) {
    this.settings = settings;
    const orientation = settings.pageSize === 'Custom' ? 'portrait' : 'p';
    this.doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: settings.pageSize === 'Custom' ? [210, 297] : settings.pageSize,
    });
  }

  /**
   * 生成二维码
   */
  static async generateQRCode(value: string, options: QRCodeOptions): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, value, {
        width: options.width,
        margin: options.margin,
        errorCorrectionLevel: options.errorCorrectionLevel,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('二维码生成失败:', error);
      throw error;
    }
  }

  /**
   * 生成条形码
   */
  static generateBarcode(value: string, options: BarcodeOptions): string {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, value, {
        format: options.format,
        width: options.width,
        height: options.height,
        displayValue: options.displayValue,
        fontSize: options.fontSize,
        margin: options.margin,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('条形码生成失败:', error);
      throw error;
    }
  }

  /**
   * 添加文本
   */
  addText(text: string, x: number, y: number, fontSize: number = 12, align: 'left' | 'center' | 'right' = 'left') {
    this.doc.setFontSize(fontSize);
    this.doc.text(text, x, y, { align });
  }

  /**
   * 添加图片
   */
  addImage(imageData: string, x: number, y: number, width: number, height: number) {
    this.doc.addImage(imageData, 'PNG', x, y, width, height);
  }

  /**
   * 添加矩形
   */
  addRect(x: number, y: number, width: number, height: number, style: 'stroke' | 'fill' | 'both' = 'stroke') {
    if (style === 'stroke' || style === 'both') {
      this.doc.rect(x, y, width, height, 'S');
    }
    if (style === 'fill' || style === 'both') {
      this.doc.rect(x, y, width, height, 'F');
    }
  }

  /**
   * 添加线条
   */
  addLine(x1: number, y1: number, x2: number, y2: number) {
    this.doc.line(x1, y1, x2, y2);
  }

  /**
   * 添加页眉
   */
  addHeader(text?: string) {
    if (this.settings.showHeader) {
      const headerText = text || this.settings.headerText || '';
      this.doc.setFontSize(10);
      this.doc.setTextColor(128);
      this.doc.text(headerText, 105, 15, { align: 'center' });
      this.doc.line(20, 18, 190, 18);
    }
  }

  /**
   * 添加页脚
   */
  addFooter(text?: string, pageNum?: number, totalPages?: number) {
    if (this.settings.showFooter) {
      const y = 285;
      this.doc.line(20, y - 2, 190, y - 2);
      this.doc.setFontSize(10);
      this.doc.setTextColor(128);

      const footerText = text || this.settings.footerText || '';
      const pageInfo = totalPages ? `第 ${pageNum} 页 / 共 ${totalPages} 页` : '';
      this.doc.text(footerText, 20, y);
      this.doc.text(pageInfo, 190, y, { align: 'right' });
    }
  }

  /**
   * 添加新页
   */
  addPage() {
    this.doc.addPage();
  }

  /**
   * 保存PDF
   */
  save(filename: string) {
    this.doc.save(filename);
  }

  /**
   * 获取PDF Blob
   */
  getBlob(): Blob {
    return this.doc.output('blob');
  }

  /**
   * 获取PDF DataURL
   */
  getDataURL(): string {
    return this.doc.output('dataurlstring');
  }

  /**
   * 根据模板生成文档
   */
  async generateFromTemplate(template: PrintTemplate, data: any) {
    const { layout, elements } = template.content;
    const { marginTop, marginBottom, marginLeft, marginRight } = layout;

    // 添加页眉
    this.addHeader();

    // 遍历所有元素
    for (const element of elements) {
      const { x, y, width, height } = element.position;
      const actualX = marginLeft + x;
      const actualY = marginTop + y;

      switch (element.type) {
        case 'text':
          const text = element.content.fieldValue
            ? data[element.content.fieldValue] || element.content.text
            : element.content.text;
          this.doc.setFontSize(element.style.fontSize || 12);
          this.doc.setFont(
            element.style.fontFamily || 'helvetica',
            element.style.fontWeight === 'bold' ? 'bold' : 'normal'
          );
          this.doc.setTextColor(element.style.color || '#000000');
          this.doc.text(text || '', actualX, actualY, {
            align: element.style.alignment || 'left',
          });
          break;

        case 'image':
          if (element.content.imageUrl) {
            this.doc.addImage(
              element.content.imageUrl,
              'PNG',
              actualX,
              actualY,
              width || 50,
              height || 50
            );
          }
          break;

        case 'qrcode':
          if (element.content.qrcodeValue) {
            const qrData = await PDFGenerator.generateQRCode(element.content.qrcodeValue, {
              width: element.content.qrcodeSize || 50,
              height: element.content.qrcodeSize || 50,
              errorCorrectionLevel: 'M',
              margin: 1,
            });
            this.doc.addImage(qrData, 'PNG', actualX, actualY, width || 50, height || 50);
          }
          break;

        case 'barcode':
          if (element.content.barcodeValue) {
            const barcodeData = PDFGenerator.generateBarcode(element.content.barcodeValue, {
              format: element.content.barcodeType || 'CODE128',
              width: 2,
              height: 50,
              displayValue: true,
              fontSize: 10,
              margin: 10,
            });
            this.doc.addImage(barcodeData, 'PNG', actualX, actualY, width || 80, height || 30);
          }
          break;

        case 'line':
          this.doc.line(actualX, actualY, actualX + (width || 100), actualY);
          break;

        case 'rectangle':
          if (element.style.borderWidth) {
            this.doc.setLineWidth(element.style.borderWidth);
            this.doc.setDrawColor(element.style.borderColor || '#000000');
          }
          if (element.style.backgroundColor) {
            this.doc.setFillColor(element.style.backgroundColor);
          }
          this.doc.rect(actualX, actualY, width || 50, height || 50, 'FD');
          break;
      }
    }

    // 添加页脚
    this.addFooter();

    return this;
  }
}

/**
 * HTML 转 PDF
 */
export async function htmlToPDF(element: HTMLElement, filename: string) {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('HTML转PDF失败:', error);
    throw error;
  }
}

/**
 * 打印预览
 */
export function printPreview(htmlContent: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>打印预览</title>
          <style>
            @media print {
              @page {
                margin: 20mm;
              }
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}
