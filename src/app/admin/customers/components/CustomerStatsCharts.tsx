"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerStats } from '../hooks/useCustomerStats';

interface CustomerStatsChartsProps {
  stats: CustomerStats;
}

interface ChartBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}

function ChartBar({ label, value, maxValue, color }: ChartBarProps) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ease-in-out ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function CustomerStatsCharts({ stats }: CustomerStatsChartsProps) {
  // 데이터 검증
  const hasData = stats.total > 0;
  
  if (!hasData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-base">
                {index === 0 ? '방문 활성도 분포' : index === 1 ? '방문 빈도 분포' : '인기 태그 TOP 5'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="text-gray-500 text-sm">
                고객 데이터가 없어 통계를 표시할 수 없습니다
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // 활성도 분포 차트 데이터
  const activityData = [
    { label: '최근 1주일', value: stats.activityDistribution.recent_week, color: 'bg-green-500' },
    { label: '최근 1개월', value: stats.activityDistribution.recent_month, color: 'bg-blue-500' },
    { label: '최근 3개월', value: stats.activityDistribution.recent_3months, color: 'bg-yellow-500' },
    { label: '최근 6개월+', value: stats.activityDistribution.recent_6months, color: 'bg-orange-500' },
    { label: '방문 기록 없음', value: stats.activityDistribution.no_visit, color: 'bg-gray-400' },
  ];

  // 방문 빈도 분포 차트 데이터
  const frequencyData = [
    { label: '신규고객 (1회)', value: stats.frequencyDistribution.new_customer, color: 'bg-purple-500' },
    { label: '재방문고객 (2-5회)', value: stats.frequencyDistribution.returning_customer, color: 'bg-indigo-500' },
    { label: '단골고객 (6회+)', value: stats.frequencyDistribution.regular_customer, color: 'bg-pink-500' },
  ];

  // 태그 분포 차트 데이터 (상위 5개만)
  const topTags = stats.tagDistribution.slice(0, 5);

  const activityMaxValue = Math.max(...activityData.map(d => d.value));
  const frequencyMaxValue = Math.max(...frequencyData.map(d => d.value));
  const tagMaxValue = topTags.length > 0 ? Math.max(...topTags.map(d => d.count)) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 활성도 분포 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">방문 활성도 분포</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activityData.map((item, index) => (
            <ChartBar
              key={index}
              label={item.label}
              value={item.value}
              maxValue={activityMaxValue}
              color={item.color}
            />
          ))}
        </CardContent>
      </Card>

      {/* 방문 빈도 분포 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">방문 빈도 분포</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {frequencyData.map((item, index) => (
            <ChartBar
              key={index}
              label={item.label}
              value={item.value}
              maxValue={frequencyMaxValue}
              color={item.color}
            />
          ))}
        </CardContent>
      </Card>

      {/* 인기 태그 TOP 5 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">인기 태그 TOP 5</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {topTags.length > 0 ? (
            topTags.map((tag, index) => (
              <div key={tag.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {tag.color && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                    <span className="text-gray-600">{tag.name}</span>
                  </div>
                  <span className="font-medium">{tag.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-in-out"
                    style={{ 
                      width: `${tagMaxValue > 0 ? (tag.count / tagMaxValue) * 100 : 0}%`,
                      backgroundColor: tag.color || undefined
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              아직 태그가 설정된 고객이 없습니다
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 