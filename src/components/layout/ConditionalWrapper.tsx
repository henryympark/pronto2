'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface ConditionalWrapperProps {
  children: ReactNode;
}

export function ConditionalWrapper({ children }: ConditionalWrapperProps) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');
  
  if (isAdminPage) {
    // 관리자 페이지: 전체 너비 사용
    return <div className="admin-full-width min-h-screen">{children}</div>;
  }
  
  // 일반 페이지: page-wrapper 제거
  return <div className="min-h-screen">{children}</div>;
} 