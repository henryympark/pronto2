"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatTimeDisplay } from "@/lib/date-utils";

interface StatsSectionProps {
  accumulatedTime: number;
  couponsCount: number;
  reviewsCount: number;
  onStatsCardClick: (path: string) => void;
  isLoading?: boolean;
}

export function StatsSection({ 
  accumulatedTime, 
  couponsCount, 
  reviewsCount, 
  onStatsCardClick,
  isLoading = false
}: StatsSectionProps) {
  const statsData = [
    {
      title: "적립시간",
      value: formatTimeDisplay(accumulatedTime),
      path: "/my/rewards"
    },
    {
      title: "보유쿠폰",
      value: `${couponsCount}장`,
      path: "/my/coupons"
    },
    {
      title: "리뷰작성",
      value: `${reviewsCount}건`,
      path: "/my/reviews/history"
    }
  ];

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-6">
          {statsData.map((stat) => {
            return (
              <div 
                key={stat.path}
                className={`
                  text-center cursor-pointer py-1 px-0.5 sm:py-2 sm:px-1 rounded-lg transition-all duration-200
                  hover:bg-accent hover:text-accent-foreground
                  ${isLoading ? 'pointer-events-none opacity-60' : ''}
                `}
                onClick={() => !isLoading && onStatsCardClick(stat.path)}
                role="button"
                tabIndex={0}
                aria-label={`${stat.title} ${stat.value} 상세보기`}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
                    onStatsCardClick(stat.path);
                  }
                }}
              >
                <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                  <div>
                    <p className="text-lg sm:text-xl font-bold mb-0.5 sm:mb-1">
                      {isLoading ? '...' : stat.value}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-700 font-medium">
                      {stat.title}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 