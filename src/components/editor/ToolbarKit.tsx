'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * 编辑器工具栏视觉规范。
 *
 * 文字工具栏、表格工具栏、以及表格编辑中的子面板都复用这里的度量
 * （外壳、分组、分隔线、按钮尺寸与激活态），
 * 这样多个工具栏并排或换行时仍然像同一套控件。
 */

type ToolbarShellProps = React.ComponentProps<'div'> & {
  /** panel：自带描边与投影的浮起工具条；plain：并入外部外壳，只负责分组排布 */
  variant?: 'panel' | 'plain';
};

export function ToolbarShell({ variant = 'panel', className, ...props }: ToolbarShellProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-y-1',
        variant === 'panel' && 'w-fit max-w-full rounded-xl border bg-background px-1 py-1 shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

export function ToolbarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center gap-0.5', className)} {...props} />;
}

export function ToolbarDivider({ className }: { className?: string }) {
  return <div aria-hidden className={cn('mx-1 h-5 w-px shrink-0 bg-border', className)} />;
}

type ToolbarButtonProps = React.ComponentProps<'button'> & {
  active?: boolean;
};

export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ active, className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      data-active={active ? 'true' : undefined}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground/70 outline-none transition-colors',
        'hover:bg-muted hover:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring/40',
        'disabled:pointer-events-none disabled:opacity-40',
        'data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:hover:bg-primary/15',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
ToolbarButton.displayName = 'ToolbarButton';

export type SwatchOption = {
  value: string;
  /** 悬浮提示，缺省用色值本身 */
  label?: string;
};

interface ColorSwatchGridProps {
  colors: SwatchOption[];
  /** 当前生效的颜色 */
  value?: string;
  onChange: (color: string) => void;
  columns?: number;
}

/** 下拉菜单里的色板：当前颜色带选中环，"transparent" 显示为斜杠色块 */
export function ColorSwatchGrid({ colors, value, onChange, columns = 7 }: ColorSwatchGridProps) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {colors.map(({ value: color, label }) => {
        const isTransparent = color === 'transparent';
        const selected = (value || 'transparent') === color;

        return (
          <button
            key={color}
            type="button"
            title={label ?? color}
            onClick={() => onChange(color)}
            className={cn(
              'relative size-5 rounded-md border border-black/10 transition-transform',
              'hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              selected && 'ring-2 ring-primary ring-offset-1',
            )}
            style={isTransparent ? undefined : { backgroundColor: color }}
          >
            {isTransparent && (
              <span className="absolute inset-0 overflow-hidden rounded-md bg-white">
                <span className="absolute -left-1 top-1/2 h-px w-8 -translate-y-1/2 rotate-45 bg-muted-foreground/70" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
