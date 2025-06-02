"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, Crown, Building2, TrendingUp, Calendar, Clock } from "lucide-react";
import { Customer } from '@/types';
import { useCustomerStats } from '../hooks/useCustomerStats';
import CustomerStatsCard from './CustomerStatsCard';
import CustomerStatsCharts from './CustomerStatsCharts';

interface CustomerStatsDashboardProps {
  customers: Customer[];
}

export default function CustomerStatsDashboard({ customers }: CustomerStatsDashboardProps) {
  const { stats, loading } = useCustomerStats(customers);

  if (loading) {
    return (
      <div className="space-y-6 mb-6">
        {/* KPI 카드들 스켈레톤 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px] mb-2" />
                <Skeleton className="h-3 w-[80px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* 차트 스켈레톤 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-[120px]" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-[80px]" />
                      <Skeleton className="h-4 w-[30px]" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      {/* 제목 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">고객 통계 대시보드</h2>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500">
            실시간 업데이트
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="실시간 연결됨"></div>
        </div>
      </div>

      {/* 핵심 KPI 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 전체 고객 수 */}
        <CustomerStatsCard
          title="전체 고객"
          value={stats.total}
          subtitle="등록된 총 고객 수"
          icon={Users}
          trend={{
            value: stats.newThisMonth,
            label: "이번 달 신규",
            isPositive: stats.newThisMonth > 0
          }}
        />

        {/* 활성 고객 수 */}
        <CustomerStatsCard
          title="활성 고객"
          value={stats.active}
          subtitle={`전체의 ${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%`}
          icon={UserCheck}
          badgeText={`${stats.inactive}명 비활성`}
          badgeVariant="outline"
        />

        {/* VIP 고객 수 */}
        <CustomerStatsCard
          title="VIP 고객"
          value={stats.vip}
          subtitle={`전체의 ${stats.total > 0 ? Math.round((stats.vip / stats.total) * 100) : 0}%`}
          icon={Crown}
          badgeText="VIP"
          badgeVariant="default"
        />

        {/* 기업 고객 수 */}
        <CustomerStatsCard
          title="기업 고객"
          value={stats.business}
          subtitle={`전체의 ${stats.total > 0 ? Math.round((stats.business / stats.total) * 100) : 0}%`}
          icon={Building2}
          badgeText="기업"
          badgeVariant="secondary"
        />
      </div>

      {/* 방문 현황 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 오늘 방문 */}
        <CustomerStatsCard
          title="오늘 방문"
          value={stats.todayVisits}
          subtitle="오늘 방문한 고객 수"
          icon={Calendar}
        />

        {/* 이번 주 방문 */}
        <CustomerStatsCard
          title="이번 주 방문"
          value={stats.weekVisits}
          subtitle="지난 7일간 방문"
          icon={TrendingUp}
          trend={{
            value: stats.newThisWeek,
            label: "신규 고객",
            isPositive: stats.newThisWeek > 0
          }}
        />

        {/* 이번 달 방문 */}
        <CustomerStatsCard
          title="이번 달 방문"
          value={stats.monthVisits}
          subtitle="지난 30일간 방문"
          icon={Clock}
        />
      </div>

      {/* 분포 차트들 */}
      <CustomerStatsCharts stats={stats} />

      {/* 빠른 인사이트 */}
      {stats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">빠른 인사이트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-medium text-gray-900">활성화율</div>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((stats.active / stats.total) * 100)}%
                </div>
                <div className="text-gray-500">활성 고객 비율</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-gray-900">VIP 비율</div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((stats.vip / stats.total) * 100)}%
                </div>
                <div className="text-gray-500">VIP 고객 비율</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-gray-900">재방문율</div>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(((stats.frequencyDistribution.returning_customer + stats.frequencyDistribution.regular_customer) / stats.total) * 100)}%
                </div>
                <div className="text-gray-500">2회 이상 방문</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-gray-900">단골 비율</div>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round((stats.frequencyDistribution.regular_customer / stats.total) * 100)}%
                </div>
                <div className="text-gray-500">6회 이상 방문</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 