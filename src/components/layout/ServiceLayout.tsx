'use client';

import { ReactNode } from 'react';

interface ServiceLayoutProps {
  children: ReactNode;
}

export function ServiceLayout({ children }: ServiceLayoutProps) {
  return (
    <div className="w-full max-w-[500px] mx-auto min-h-screen bg-white dark:bg-gray-950">
      {children}
    </div>
  );
} 