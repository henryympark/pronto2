"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';

interface UseUserStatsReturn {
  // 상태
  accumulatedTime: number;
  couponsCount: number;
  reviewsCount: number;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  
  // 액션
  fetchStats: () => Promise<void>;
  refreshStats: () => void;
}

export function useUserStats(userId: string | undefined): UseUserStatsReturn {
  const supabase = useSupabase();
  
  // 상태 변수들
  const [accumulatedTime, setAccumulatedTime] = useState(0);
  const [couponsCount, setCouponsCount] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 통계 데이터 조회 함수
  const fetchStats = useCallback(async () => {
    if (!userId) {
      // userId가 없으면 초기값으로 설정
      setAccumulatedTime(0);
      setCouponsCount(0);
      setReviewsCount(0);
      return;
    }
    
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");
    
    try {
      console.log('[useUserStats] 통계 데이터 조회 시작 - 사용자 ID:', userId);
      
      const { data: dashboardData, error: dashboardError } = await supabase
        .rpc('get_user_dashboard_data', { user_id: userId });
        
      if (dashboardError) {
        console.warn('[useUserStats] 대시보드 데이터 오류:', dashboardError.message);
        // 오류가 있어도 기본값으로 설정 (완전 실패가 아닌 경우)
        setAccumulatedTime(0);
        setCouponsCount(0);
        setReviewsCount(0);
        setHasError(false); // 대시보드 오류는 치명적이지 않음
      } else if (dashboardData) {
        console.log('[useUserStats] 통계 데이터 조회 성공:', dashboardData);
        setAccumulatedTime(dashboardData.accumulated_time_minutes || 0);
        setCouponsCount(dashboardData.active_coupons_count || 0);
        setReviewsCount(dashboardData.reviews_count || 0);
        setHasError(false);
      } else {
        // 데이터가 없는 경우 기본값
        setAccumulatedTime(0);
        setCouponsCount(0);
        setReviewsCount(0);
        setHasError(false);
      }
    } catch (error) {
      console.error('[useUserStats] 통계 데이터 로드 실패:', error);
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : "통계 데이터 조회 중 오류가 발생했습니다.");
      
      // 오류 시 기본값으로 설정
      setAccumulatedTime(0);
      setCouponsCount(0);
      setReviewsCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  // 새로고침 함수
  const refreshStats = useCallback(() => {
    if (isLoading) return;
    fetchStats();
  }, [isLoading, fetchStats]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    // 상태
    accumulatedTime,
    couponsCount,
    reviewsCount,
    isLoading,
    hasError,
    errorMessage,
    
    // 액션
    fetchStats,
    refreshStats,
  };
} 