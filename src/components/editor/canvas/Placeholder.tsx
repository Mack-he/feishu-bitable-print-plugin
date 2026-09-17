'use client';

interface PlaceholderProps {
  type: 'vertical' | 'horizontal' | 'full';
  width?: string;
  height?: string;
}

export function Placeholder({ type, width = '100%', height = '80px' }: PlaceholderProps) {
  return (
    <div
      className={`
        relative flex items-center justify-center
        border-2 border-dashed rounded-lg
        transition-all duration-200
        ${type === 'vertical' ? 'border-primary bg-primary/5' : ''}
        ${type === 'horizontal' ? 'border-blue-500 bg-blue-500/5' : ''}
        ${type === 'full' ? 'border-green-500 bg-green-500/5' : ''}
      `}
      style={{
        width,
        minHeight: height,
      }}
    >
      <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        {type === 'vertical' && (
          <>
            <div className="w-4 h-4 border-l-2 border-dashed border-primary" />
            <span>在此处插入</span>
            <div className="w-4 h-4 border-l-2 border-dashed border-primary" />
          </>
        )}
        {type === 'horizontal' && (
          <>
            <div className="w-4 h-4 border-t-2 border-dashed border-blue-500" />
            <span>并排插入</span>
            <div className="w-4 h-4 border-t-2 border-dashed border-blue-500" />
          </>
        )}
        {type === 'full' && (
          <>
            <div className="w-4 h-4 border-2 border-dashed border-green-500 rounded" />
            <span>添加到末尾</span>
          </>
        )}
      </div>
    </div>
  );
}
