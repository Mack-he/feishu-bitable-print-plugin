'use client';

import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = '在这里输入文字...',
  className = '',
}: RichTextEditorProps) {
  return (
    <div className={`rich-text-editor border rounded-lg overflow-hidden ${className}`}>
      {/* 工具栏 */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled
        >
          <BoldIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled
        >
          <ItalicIcon className="w-4 h-4" />
        </Button>
      </div>
      
      {/* 编辑区域 */}
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-4 min-h-[100px] border-0 resize-none focus:outline-none"
      />
    </div>
  );
}
