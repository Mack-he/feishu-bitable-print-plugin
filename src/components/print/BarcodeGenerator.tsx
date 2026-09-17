'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  title?: string;
  showDownload?: boolean;
}

/**
 * 二维码生成器组件
 */
export function QRCodeGenerator({
  value,
  size = 150,
  title = '二维码',
  showDownload = true,
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    generateQRCode();
  }, [value, size]);

  const generateQRCode = async () => {
    if (!value || !canvasRef.current) return;

    setIsLoading(true);
    try {
      await QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      const dataUrl = canvasRef.current.toDataURL('image/png');
      setQrCodeUrl(dataUrl);
    } catch (error) {
      console.error('二维码生成失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.download = `${title}-${Date.now()}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center gap-4">
        <h3 className="text-lg font-semibold">{title}</h3>

        <div className="relative">
          <canvas
            ref={canvasRef}
            className="border-2 border-gray-200 rounded-lg"
            style={{ width: size, height: size }}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500 text-center max-w-[200px] truncate w-full">
          {value}
        </p>

        {showDownload && (
          <Button onClick={handleDownload} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            下载二维码
          </Button>
        )}
      </div>
    </Card>
  );
}

interface BarcodeGeneratorProps {
  value: string;
  format?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC' | 'ITF14';
  width?: number;
  height?: number;
  title?: string;
  showDownload?: boolean;
}

/**
 * 条形码生成器组件
 */
export function BarcodeGenerator({
  value,
  format = 'CODE128',
  width = 2,
  height = 100,
  title = '条形码',
  showDownload = true,
}: BarcodeGeneratorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [barcodeUrl, setBarcodeUrl] = useState<string>('');

  useEffect(() => {
    generateBarcode();
  }, [value, format, width, height]);

  const generateBarcode = () => {
    if (!value || !svgRef.current) return;

    try {
      JsBarcode(svgRef.current, value, {
        format,
        width,
        height,
        displayValue: true,
        fontSize: 14,
        margin: 10,
        lineColor: '#000000',
      });

      // 将 SVG 转换为 PNG
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        if (!svgRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = svgRef.current.getBoundingClientRect().width;
        canvas.height = svgRef.current.getBoundingClientRect().height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          const dataUrl = canvas.toDataURL('image/png');
          setBarcodeUrl(dataUrl);
        }

        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (error) {
      console.error('条形码生成失败:', error);
    }
  };

  const handleDownload = () => {
    if (!barcodeUrl) return;

    const link = document.createElement('a');
    link.download = `${title}-${Date.now()}.png`;
    link.href = barcodeUrl;
    link.click();
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center gap-4">
        <h3 className="text-lg font-semibold">{title}</h3>

        <div className="bg-white p-4 border-2 border-gray-200 rounded-lg">
          <svg ref={svgRef} />
        </div>

        <p className="text-sm text-gray-500 text-center max-w-[300px] truncate w-full">
          {value}
        </p>

        {showDownload && (
          <Button onClick={handleDownload} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            下载条形码
          </Button>
        )}
      </div>
    </Card>
  );
}

/**
 * 批量二维码生成器
 */
export function BatchQRCodeGenerator({
  values,
  size = 150,
}: {
  values: Array<{ id: string; value: string; label?: string }>;
  size?: number;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {values.map((item) => (
        <QRCodeGenerator
          key={item.id}
          value={item.value}
          size={size}
          title={item.label || `二维码 ${item.id}`}
        />
      ))}
    </div>
  );
}

/**
 * 批量条形码生成器
 */
export function BatchBarcodeGenerator({
  values,
  format = 'CODE128',
}: {
  values: Array<{ id: string; value: string; label?: string }>;
  format?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC' | 'ITF14';
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {values.map((item) => (
        <BarcodeGenerator
          key={item.id}
          value={item.value}
          format={format}
          title={item.label || `条形码 ${item.id}`}
        />
      ))}
    </div>
  );
}
