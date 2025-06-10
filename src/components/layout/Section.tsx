'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  children: ReactNode;
  variant?: 'white' | 'gray';
  noPadding?: boolean;
  className?: string;
}

export function Section({ 
  children, 
  variant = 'white', 
  noPadding = false,
  className = '' 
}: SectionProps) {
  const bgColor = variant === 'gray' ? 'bg-gray-50' : 'bg-white';
  
  return (
    <section className={cn(bgColor, className)}>
      <div className={cn(
        'max-w-[500px] mx-auto',
        !noPadding && 'px-4 py-6'
      )}>
        {children}
      </div>
    </section>
  );
} 