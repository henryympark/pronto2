import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContentContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'full' | 'wide';
  noPadding?: boolean;
  noGutter?: boolean; // 좌우 padding 제거
}

export function ContentContainer({ 
  children, 
  className,
  size = 'default',
  noPadding = false,
  noGutter = false
}: ContentContainerProps) {
  const sizeClasses = {
    default: 'max-w-[500px]',
    wide: 'max-w-[768px]',
    full: 'max-w-full'
  };

  return (
    <div 
      className={cn(
        "w-full mx-auto",
        sizeClasses[size],
        !noPadding && "py-6",
        !noGutter && "px-4",
        className
      )}
    >
      {children}
    </div>
  );
} 