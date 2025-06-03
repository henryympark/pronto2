'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
    period?: string;
  };
  icon?: ReactNode;
  description?: string;
  loading?: boolean;
  className?: string;
}

export function AdminStatsCard({
  title,
  value,
  change,
  icon,
  description,
  loading = false,
  className
}: AdminStatsCardProps) {
  const formatChange = (changeValue: number) => {
    const isPositive = changeValue > 0;
    const isNegative = changeValue < 0;
    
    return {
      isPositive,
      isNegative,
      isNeutral: changeValue === 0,
      icon: isPositive ? TrendingUp : isNegative ? TrendingDown : Minus,
      variant: (isPositive ? 'default' : isNegative ? 'destructive' : 'secondary') as 'default' | 'destructive' | 'secondary',
      text: `${isPositive ? '+' : ''}${changeValue}%`
    };
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
          </CardTitle>
          <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-7 w-20 bg-muted animate-pulse rounded mb-1"></div>
          <div className="h-3 w-16 bg-muted animate-pulse rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const changeData = change ? formatChange(change.value) : null;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && (
          <div className="h-4 w-4 text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(changeData || description) && (
          <div className="flex items-center gap-2 mt-1">
            {changeData && (
              <Badge variant={changeData.variant} className="text-xs">
                <changeData.icon className="h-3 w-3 mr-1" />
                {changeData.text}
              </Badge>
            )}
            {change?.label && (
              <p className="text-xs text-muted-foreground">
                {change.label}
                {change.period && ` ${change.period}`}
              </p>
            )}
            {description && !change?.label && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 