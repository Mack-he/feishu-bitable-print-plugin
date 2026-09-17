'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, Type, Table, Image, QrCode, Barcode, Minus } from 'lucide-react';
import { ComponentType } from '@/types/editor';

interface FloatingAddButtonProps {
  position?: { x: number; y: number };
  onAddComponent: (type: ComponentType) => void;
}

const COMPONENT_TYPES: { type: ComponentType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: '文本', icon: <Type className="w-4 h-4" /> },
  { type: 'table', label: '表格', icon: <Table className="w-4 h-4" /> },
  { type: 'image', label: '图片', icon: <Image className="w-4 h-4" /> },
  { type: 'qrcode', label: '二维码', icon: <QrCode className="w-4 h-4" /> },
  { type: 'barcode', label: '条形码', icon: <Barcode className="w-4 h-4" /> },
  { type: 'line', label: '分割线', icon: <Minus className="w-4 h-4" /> },
];

export function FloatingAddButton({ position, onAddComponent }: FloatingAddButtonProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (type: ComponentType) => {
    onAddComponent(type);
    setOpen(false);
  };

  return (
    <div 
      className="absolute z-40"
      style={position ? { left: position.x, top: position.y } : { right: 20, bottom: 20 }}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="w-12 h-12 rounded-full shadow-lg hover:scale-105 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="end">
          <div className="grid grid-cols-2 gap-1">
            {COMPONENT_TYPES.map(({ type, label, icon }) => (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                className="justify-start gap-2 h-auto py-2"
                onClick={() => handleSelect(type)}
              >
                {icon}
                <span className="text-sm">{label}</span>
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
