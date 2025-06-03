"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/contexts/SupabaseContext";
import { Customer } from "@/types";
import { AdminPageHeader } from "@/components/admin/common/AdminPageHeader";
import { AdminLoadingState } from "@/components/admin/common/AdminLoadingState";
import { AdminStatsGrid } from "@/components/admin/stats/AdminStatsGrid";
import { AdminStatsCard } from "@/components/admin/stats/AdminStatsCard";
import { Users, UserCheck, Crown, Building2, TrendingUp, Calendar, Clock, Activity, Zap, Target } from "lucide-react";
import { useCustomerStats } from "../customers/hooks/useCustomerStats";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const supabase = useSupabase();

  // 고객 데이터 로드
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('고객 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const { stats } = useCustomerStats(customers);

  if (loading) {
    return <AdminLoadingState type="skeleton" rows={10} message="대시보드 데이터를 불러오는 중..." />;
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <AdminPageHeader
        title="관리자 대시보드"
        description="고객 통계와 핵심 지표를 한눈에 확인하세요"
      />

      {/* 핵심 KPI 카드들 - 4개 */}
      <AdminStatsGrid columns={4}>
        <AdminStatsCard
          title="전체 고객"
          value={stats.total}
          change={{
            value: stats.newThisMonth,
            label: "이번 달 신규",
            period: "월"
          }}
          icon={<Users className="h-5 w-5" />}
          description="등록된 총 고객 수"
        />
        <AdminStatsCard
          title="활성 고객"
          value={stats.active}
          change={{
            value: Math.round((stats.active / Math.max(stats.total, 1)) * 100),
            label: "활성화율",
            period: "%"
          }}
          icon={<UserCheck className="h-5 w-5" />}
          description={`${stats.inactive}명 비활성`}
        />
        <AdminStatsCard
          title="VIP 고객"
          value={stats.vip}
          change={{
            value: Math.round((stats.vip / Math.max(stats.total, 1)) * 100),
            label: "VIP 비율",
            period: "%"
          }}
          icon={<Crown className="h-5 w-5" />}
          description="프리미엄 고객"
        />
        <AdminStatsCard
          title="기업 고객"
          value={stats.business}
          change={{
            value: Math.round((stats.business / Math.max(stats.total, 1)) * 100),
            label: "기업 비율",
            period: "%"
          }}
          icon={<Building2 className="h-5 w-5" />}
          description="B2B 고객"
        />
      </AdminStatsGrid>

      {/* 방문 통계 카드들 - 3개 */}
      <AdminStatsGrid columns={3}>
        <AdminStatsCard
          title="오늘 방문"
          value={stats.todayVisits}
          icon={<Calendar className="h-5 w-5" />}
          description="오늘 방문한 고객 수"
        />
        <AdminStatsCard
          title="이번 주 방문"
          value={stats.weekVisits}
          change={{
            value: stats.newThisWeek,
            label: "신규 고객",
            period: "주"
          }}
          icon={<TrendingUp className="h-5 w-5" />}
          description="지난 7일간 방문"
        />
        <AdminStatsCard
          title="이번 달 방문"
          value={stats.monthVisits}
          icon={<Clock className="h-5 w-5" />}
          description="지난 30일간 방문"
        />
      </AdminStatsGrid>

      {/* 고급 지표 카드들 - 3개 */}
      <AdminStatsGrid columns={3}>
        <AdminStatsCard
          title="재방문율"
          value={`${Math.round(((stats.frequencyDistribution.returning_customer + stats.frequencyDistribution.regular_customer) / Math.max(stats.total, 1)) * 100)}%`}
          icon={<Activity className="h-5 w-5" />}
          description="2회 이상 방문 고객"
        />
        <AdminStatsCard
          title="단골 비율"
          value={`${Math.round((stats.frequencyDistribution.regular_customer / Math.max(stats.total, 1)) * 100)}%`}
          icon={<Zap className="h-5 w-5" />}
          description="6회 이상 방문 고객"
        />
        <AdminStatsCard
          title="고객 성장률"
          value={`${stats.newThisMonth > 0 ? '+' : ''}${Math.round((stats.newThisMonth / Math.max(stats.total - stats.newThisMonth, 1)) * 100)}%`}
          icon={<Target className="h-5 w-5" />}
          description="이번 달 성장률"
        />
      </AdminStatsGrid>
    </div>
  );
} 