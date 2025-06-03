'use client';

import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminLoadingStateProps {
  type?: 'spinner' | 'skeleton' | 'table';
  message?: string;
  rows?: number;
}

export function AdminLoadingState({ 
  type = 'spinner', 
  message = '데이터를 불러오는 중...',
  rows = 5
}: AdminLoadingStateProps) {
  if (type === 'spinner') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-4">
        {/* 테이블 헤더 스켈레톤 */}
        <div className="flex items-center space-x-4">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[120px]" />
        </div>
        {/* 테이블 행 스켈레톤 */}
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center space-x-4">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[120px]" />
          </div>
        ))}
      </div>
    );
  }

  // 기본 스켈레톤
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-[300px]" />
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
    </div>
  );
} 