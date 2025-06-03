'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FileX, Plus } from 'lucide-react';

interface AdminEmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function AdminEmptyState({ 
  title, 
  description, 
  icon,
  action 
}: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {icon || <FileX className="h-6 w-6 text-muted-foreground" />}
      </div>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button 
          onClick={action.onClick}
          className="mt-4"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  );
} 