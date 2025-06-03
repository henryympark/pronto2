'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContentWrapperProps {
  children: ReactNode;
  className?: string;
  showSideSpaces?: boolean;
}

export function ContentWrapper({ 
  children, 
  className,
  showSideSpaces = true 
}: ContentWrapperProps) {
  return (
    <div className="flex min-h-screen">
      {/* 왼쪽 빈 공간 */}
      {showSideSpaces && (
        <div className="hidden md:block flex-1 bg-gray-50 dark:bg-gray-900">
          {/* 추후 왼쪽 사이드바 기능 추가 예정 */}
        </div>
      )}
      
      {/* 중앙 콘텐츠 영역 */}
      <div className={cn(
        "w-full max-w-[500px] mx-auto",
        "px-4 md:px-0", // 모바일에서만 패딩
        className
      )}>
        {children}
      </div>
      
      {/* 오른쪽 빈 공간 */}
      {showSideSpaces && (
        <div className="hidden md:block flex-1 bg-gray-50 dark:bg-gray-900">
          {/* 추후 오른쪽 사이드바 기능 추가 예정 */}
        </div>
      )}
    </div>
  );
} 