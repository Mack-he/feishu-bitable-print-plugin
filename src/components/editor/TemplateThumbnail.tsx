'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';

interface TemplateThumbnailProps {
  src?: string;
  alt: string;
}

/**
 * 模板卡片缩略图
 * 加载失败或未配置图片时回退到通用文件图标，避免出现破图
 */
export function TemplateThumbnail({ src, alt }: TemplateThumbnailProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
    />
  );
}