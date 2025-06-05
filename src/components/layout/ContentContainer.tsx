import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContentContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'full' | 'wide';
  noPadding?: boolean;
  noGutter?: boolean; // 좌우 padding 제거
  noShadow?: boolean; // 그림자 제거
  noBackground?: boolean; // 배경색 제거 옵션 추가
}

export function ContentContainer({ 
  children, 
  className,
  size = 'default',
  noPadding = false,
  noGutter = false,
  noShadow = false,
  noBackground = false // 기본값은 false (배경색 있음)
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
        !noBackground && "bg-white", // noBackground가 false일 때만 배경색 적용
        sizeClasses[size],
        !noPadding && "py-6",
        !noGutter && "px-4",
        !noShadow && "shadow-lg",
        className
      )}
    >
      {children}
    </div>
  );
}