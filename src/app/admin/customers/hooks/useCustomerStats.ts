import { useState, useEffect, useMemo } from 'react';
import { subDays, subWeeks, subMonths, isAfter, startOfDay, endOfDay } from 'date-fns';
import { Customer } from '@/types';
import { useSupabase } from '@/contexts/SupabaseContext';

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  vip: number;
  business: number;
  todayVisits: number;
  weekVisits: number;
  monthVisits: number;
  newThisWeek: number;
  newThisMonth: number;
  activityDistribution: {
    recent_week: number;
    recent_month: number;
    recent_3months: number;
    recent_6months: number;
    no_visit: number;
  };
  frequencyDistribution: {
    new_customer: number;
    returning_customer: number;
    regular_customer: number;
  };
  tagDistribution: Array<{
    id: string;
    name: string;
    count: number;
    color?: string;
  }>;
}

export function useCustomerStats(customers: Customer[]) {
  const [tags, setTags] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [tagMappings, setTagMappings] = useState<Array<{ customer_id: string; tag_id: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabase();

  // 태그 데이터 로드
  useEffect(() => {
    const fetchTagData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📊 고객 통계용 태그 데이터 로드 시작...');

        // 태그 목록 로드
        const { data: tagsData, error: tagsError } = await supabase
          .from('customer_tags')
          .select('id, name, color');

        if (tagsError) {
          console.error('❌ 태그 로드 에러:', tagsError);
          throw tagsError;
        }

        // 태그 매핑 로드
        const { data: mappingsData, error: mappingsError } = await supabase
          .from('customer_tag_mappings')
          .select('customer_id, tag_id');

        if (mappingsError) {
          console.error('❌ 태그 매핑 로드 에러:', mappingsError);
          throw mappingsError;
        }

        console.log('✅ 태그 데이터 로드 성공:', {
          tags: tagsData?.length || 0,
          mappings: mappingsData?.length || 0
        });

        setTags(tagsData || []);
        setTagMappings(mappingsData || []);
      } catch (error) {
        console.error('💥 태그 데이터 로드 오류:', error);
        setError('태그 데이터를 불러오는데 실패했습니다.');
        setTags([]);
        setTagMappings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTagData();
  }, [supabase]);

  // 통계 계산
  const stats: CustomerStats = useMemo(() => {
    const now = new Date();
    const startOfToday = startOfDay(now);
    const endOfToday = endOfDay(now);
    const weekAgo = subWeeks(now, 1);
    const monthAgo = subMonths(now, 1);
    const threeMonthsAgo = subMonths(now, 3);
    const sixMonthsAgo = subMonths(now, 6);

    // 기본 고객 분류
    const total = customers.length;
    const active = customers.filter(c => c.is_active === true).length;
    const inactive = customers.filter(c => c.is_active === false).length;
    const vip = customers.filter(c => c.is_vip === true).length;
    const business = customers.filter(c => !!(c.company_name && c.company_name.trim())).length;

    // 방문 현황 (last_visit_date 기준)
    const todayVisits = customers.filter(c => {
      if (!c.last_visit_date) return false;
      const visitDate = new Date(c.last_visit_date);
      return visitDate >= startOfToday && visitDate <= endOfToday;
    }).length;

    const weekVisits = customers.filter(c => {
      if (!c.last_visit_date) return false;
      const visitDate = new Date(c.last_visit_date);
      return isAfter(visitDate, weekAgo);
    }).length;

    const monthVisits = customers.filter(c => {
      if (!c.last_visit_date) return false;
      const visitDate = new Date(c.last_visit_date);
      return isAfter(visitDate, monthAgo);
    }).length;

    // 신규 고객 현황 (created_at 기준)
    const newThisWeek = customers.filter(c => {
      const createDate = new Date(c.created_at);
      return isAfter(createDate, weekAgo);
    }).length;

    const newThisMonth = customers.filter(c => {
      const createDate = new Date(c.created_at);
      return isAfter(createDate, monthAgo);
    }).length;

    // 활성도 분포
    const activityDistribution = {
      recent_week: customers.filter(c => {
        if (!c.last_visit_date) return false;
        const visitDate = new Date(c.last_visit_date);
        return isAfter(visitDate, weekAgo);
      }).length,
      recent_month: customers.filter(c => {
        if (!c.last_visit_date) return false;
        const visitDate = new Date(c.last_visit_date);
        return isAfter(visitDate, monthAgo) && !isAfter(visitDate, weekAgo);
      }).length,
      recent_3months: customers.filter(c => {
        if (!c.last_visit_date) return false;
        const visitDate = new Date(c.last_visit_date);
        return isAfter(visitDate, threeMonthsAgo) && !isAfter(visitDate, monthAgo);
      }).length,
      recent_6months: customers.filter(c => {
        if (!c.last_visit_date) return false;
        const visitDate = new Date(c.last_visit_date);
        return isAfter(visitDate, sixMonthsAgo) && !isAfter(visitDate, threeMonthsAgo);
      }).length,
      no_visit: customers.filter(c => 
        !c.last_visit_date || c.total_visit_count === 0
      ).length,
    };

    // 방문 빈도 분포
    const frequencyDistribution = {
      new_customer: customers.filter(c => (c.total_visit_count || 0) <= 1).length,
      returning_customer: customers.filter(c => {
        const count = c.total_visit_count || 0;
        return count >= 2 && count <= 5;
      }).length,
      regular_customer: customers.filter(c => (c.total_visit_count || 0) >= 6).length,
    };

    // 태그 분포
    const tagDistribution = tags.map(tag => {
      const count = tagMappings.filter(mapping => mapping.tag_id === tag.id).length;
      return {
        id: tag.id,
        name: tag.name,
        count,
        color: tag.color,
      };
    }).sort((a, b) => b.count - a.count);

    return {
      total,
      active,
      inactive,
      vip,
      business,
      todayVisits,
      weekVisits,
      monthVisits,
      newThisWeek,
      newThisMonth,
      activityDistribution,
      frequencyDistribution,
      tagDistribution,
    };
  }, [customers, tags, tagMappings]);

  return {
    stats,
    loading,
  };
} 