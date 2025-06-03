"use client";

import { useEffect } from "react";
import { useSupabase } from "@/contexts/SupabaseContext";
import { toast } from "@/hooks/use-toast";

interface UseRealtimeSubscriptionsOptions {
  userId?: string;
  onReservationCreated?: () => void;
  onCouponUpdated?: () => void;
  isReservationsLoading?: boolean;
}

export function useRealtimeSubscriptions({
  userId,
  onReservationCreated,
  onCouponUpdated,
  isReservationsLoading = false
}: UseRealtimeSubscriptionsOptions) {
  const supabase = useSupabase();

  // 예약 생성 이벤트 수신하여 실시간 새로고침
  useEffect(() => {
    const handleReservationCreated = (event: CustomEvent) => {
      console.log('[MyPage] 새 예약 생성 이벤트 수신:', event.detail);
      
      // 예약 목록 즉시 새로고침
      if (!isReservationsLoading && onReservationCreated) {
        console.log('[MyPage] 예약 목록 새로고침 실행');
        onReservationCreated();
      }
    };

    // 커스텀 이벤트 리스너 등록
    window.addEventListener('reservation-created', handleReservationCreated as EventListener);
    
    return () => {
      window.removeEventListener('reservation-created', handleReservationCreated as EventListener);
    };
  }, [isReservationsLoading, onReservationCreated]);

  // 실시간 쿠폰 업데이트 구독
  useEffect(() => {
    if (!userId || !supabase) return;

    console.log('[MyPage] 실시간 쿠폰 업데이트 구독 시작:', userId);

    // customer_coupons 테이블의 변경사항을 실시간으로 감지
    const channel = supabase
      .channel('customer_coupons_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모든 이벤트
          schema: 'public',
          table: 'customer_coupons',
          filter: `customer_id=eq.${userId}` // 현재 사용자의 쿠폰만 감지
        },
        (payload) => {
          console.log('[MyPage] 쿠폰 변경 감지:', payload);
          
          // 쿠폰 데이터가 변경되면 대시보드 데이터 새로고침
          if (onCouponUpdated) {
            onCouponUpdated();
          }
          
          // 변경 유형에 따른 토스트 메시지
          if (payload.eventType === 'INSERT') {
            toast({
              title: "🎉 새로운 쿠폰이 지급되었습니다!",
              description: "보유 쿠폰이 업데이트되었습니다.",
            });
          } else if (payload.eventType === 'UPDATE' && payload.new?.is_used === true) {
            toast({
              title: "쿠폰이 사용되었습니다",
              description: "보유 쿠폰이 업데이트되었습니다.",
            });
          }
        }
      )
      .subscribe();

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      console.log('[MyPage] 실시간 쿠폰 업데이트 구독 해제');
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, onCouponUpdated]);

  // 훅 자체에서는 특별한 return이 필요 없음 (side effect만 수행)
  return null;
} 