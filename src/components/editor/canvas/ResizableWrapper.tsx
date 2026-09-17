'use client';

// 该组件已在 v15.0 流式布局重构中废弃
// 保留此文件以避免导入错误，但不实现任何功能

interface ResizableWrapperProps {
  component: any;
  children: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
}

export function ResizableWrapper({
  children,
}: ResizableWrapperProps) {
  return <>{children}</>;
}
