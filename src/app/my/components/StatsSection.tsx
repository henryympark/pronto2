"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Clock, Ticket, Star } from "lucide-react";
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
      path: "/my/rewards",
      icon: Clock,
      color: "text-emerald-600",
      bgColor: "hover:bg-emerald-50"
    },
    {
      title: "보유쿠폰",
      value: `${couponsCount}장`,
      path: "/my/coupons",
      icon: Ticket,
      color: "text-blue-600", 
      bgColor: "hover:bg-blue-50"
    },
    {
      title: "리뷰작성",
      value: `${reviewsCount}건`,
      path: "/my/reviews/history",
      icon: Star,
      color: "text-amber-600",
      bgColor: "hover:bg-amber-50"
    }
  ];

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-6">
          {statsData.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div 
                key={stat.path}
                className={`
                  text-center cursor-pointer py-4 px-2 rounded-lg transition-all duration-200
                  hover:shadow-md ${stat.bgColor}
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
                <div className="flex flex-col items-center space-y-3">
                  <IconComponent className={`h-8 w-8 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold mb-1">
                      {isLoading ? '...' : stat.value}
                    </p>
                    <p className="text-base text-gray-700 font-medium">
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