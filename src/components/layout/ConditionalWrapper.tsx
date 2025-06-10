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
  
  // 일반 페이지: 500px 제한 적용 (Trevari 방식)
  return <div className="min-h-screen max-w-[500px] mx-auto bg-white shadow-[0_0_50px_rgba(0,0,0,0.05)]">{children}</div>;
} 