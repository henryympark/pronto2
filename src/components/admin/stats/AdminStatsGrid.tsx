'use client';

import { ReactNode } from 'react';

interface AdminStatsGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function AdminStatsGrid({ 
  children, 
  columns = 4,
  className 
}: AdminStatsGridProps) {
  const getGridClass = () => {
    switch (columns) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4:
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    }
  };

  return (
    <div className={`grid gap-4 ${getGridClass()} ${className || ''}`}>
      {children}
    </div>
  );
} 