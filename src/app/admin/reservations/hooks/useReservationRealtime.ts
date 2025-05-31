"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSupabase } from "@/contexts/SupabaseContext";
import { toast } from "@/shared/hooks/useToast";
import { Reservation } from "../utils/reservationTypes";

interface UseReservationRealtimeProps {
  isAdmin: boolean;
  authLoading: boolean;
  onReservationsUpdate: React.Dispatch<React.SetStateAction<Reservation[]>>;
}

interface UseReservationRealtimeReturn {
  isRealtimeConnected: boolean;
}

export function useReservationRealtime({
  isAdmin,
  authLoading,
  onReservationsUpdate
}: UseReservationRealtimeProps): UseReservationRealtimeReturn {
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const hasShownConnectionToast = useRef(false);
  
  const supabase = useSupabase();
  
  // Realtime 이벤트 처리 함수
  const handleRealtimeChange = useCallback(async (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    try {
      switch (eventType) {
        case 'INSERT':
          console.log('[Realtime] 새 예약 생성:', newRecord);
          // 새 예약의 관련 데이터(고객, 서비스)를 포함해서 가져오기
          const { data: newReservationData, error: fetchError } = await supabase
            .from('reservations')
            .select(`
              *,
              customers(id, email, nickname, phone),
              services(id, name, price_per_hour)
            `)
            .eq('id', newRecord.id)
            .single();

          if (fetchError) {
            console.error('[Realtime] 새 예약 데이터 조회 실패:', fetchError);
            return;
          }

          // 타임스탬프 조합 필드 추가
          const processedNewReservation = {
            ...newReservationData,
            combined_start_time: newReservationData.reservation_date && newReservationData.start_time 
              ? `${newReservationData.reservation_date}T${newReservationData.start_time}` 
              : null,
            combined_end_time: newReservationData.reservation_date && newReservationData.end_time 
              ? `${newReservationData.reservation_date}T${newReservationData.end_time}` 
              : null,
          };

          onReservationsUpdate(prev => [processedNewReservation, ...prev]);
          
          toast({
            title: "🎉 새 예약 접수",
            description: `${newReservationData.customer_name || '고객'}님의 예약이 접수되었습니다.`,
          });
          break;

        case 'UPDATE':
          console.log('[Realtime] 예약 업데이트:', newRecord);
          // 업데이트된 예약의 관련 데이터를 포함해서 가져오기
          const { data: updatedReservationData, error: updateFetchError } = await supabase
            .from('reservations')
            .select(`
              *,
              customers(id, email, nickname, phone),
              services(id, name, price_per_hour)
            `)
            .eq('id', newRecord.id)
            .single();

          if (updateFetchError) {
            console.error('[Realtime] 업데이트된 예약 데이터 조회 실패:', updateFetchError);
            return;
          }

          // 타임스탬프 조합 필드 추가
          const processedUpdatedReservation = {
            ...updatedReservationData,
            combined_start_time: updatedReservationData.reservation_date && updatedReservationData.start_time 
              ? `${updatedReservationData.reservation_date}T${updatedReservationData.start_time}` 
              : null,
            combined_end_time: updatedReservationData.reservation_date && updatedReservationData.end_time 
              ? `${updatedReservationData.reservation_date}T${updatedReservationData.end_time}` 
              : null,
          };

          onReservationsUpdate(prev => 
            prev.map(reservation => 
              reservation.id === newRecord.id 
                ? processedUpdatedReservation 
                : reservation
            )
          );

          // 상태 변경에 따른 알림
          if (oldRecord.status !== newRecord.status) {
            const statusMessages = {
              'confirmed': '예약이 확정되었습니다',
              'cancelled': '예약이 취소되었습니다',
              'modified': '예약이 변경되었습니다',
              'completed': '예약이 완료되었습니다'
            };
            
            toast({
              title: "📝 예약 상태 변경",
              description: statusMessages[newRecord.status as keyof typeof statusMessages] || '예약이 업데이트되었습니다',
            });
          }
          break;

        case 'DELETE':
          console.log('[Realtime] 예약 삭제:', oldRecord);
          onReservationsUpdate(prev => prev.filter(reservation => reservation.id !== oldRecord.id));
          
          toast({
            title: "🗑️ 예약 삭제",
            description: "예약이 삭제되었습니다.",
          });
          break;

        default:
          console.log('[Realtime] 알 수 없는 이벤트:', eventType);
      }
    } catch (error) {
      console.error('[Realtime] 이벤트 처리 중 오류:', error);
      toast({
        title: "실시간 업데이트 오류",
        description: "데이터 동기화 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    }
  }, [supabase, onReservationsUpdate]);
  
  // Realtime 구독 설정
  useEffect(() => {
    if (!isAdmin || authLoading) return;
    
    console.log("[어드민 예약 페이지] Realtime 구독 초기화");
    
    // 상태 참조를 위한 ref
    let isConnectedRef = false;
    
    // Realtime 구독 설정
    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations'
        },
        (payload) => {
          console.log('[Realtime] 예약 변화 감지:', payload);
          handleRealtimeChange(payload);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] 구독 상태:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ 구독 성공');
          isConnectedRef = true;
          setIsRealtimeConnected(true);
          
          // 처음 연결되었을 때만 토스트 표시
          if (!hasShownConnectionToast.current) {
            hasShownConnectionToast.current = true;
            toast({
              title: "실시간 연결됨",
              description: "예약 변경사항이 실시간으로 반영됩니다.",
            });
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          isConnectedRef = false;
          setIsRealtimeConnected(false);
        } else if (status === 'CLOSED') {
          isConnectedRef = false;
          setIsRealtimeConnected(false);
        }
      });

    // 연결 상태 체크 (10초마다)
    const healthCheck = setInterval(() => {
      const channelState = channel.state;
      const isConnected = channelState === 'joined';
      
      if (isConnected !== isConnectedRef) {
        console.log('[Realtime] 연결 상태 변경 감지:', { channelState, isConnected });
        isConnectedRef = isConnected;
        setIsRealtimeConnected(isConnected);
      }
    }, 10000);

    // 컴포넌트 언마운트 시 정리
    return () => {
      console.log('[Realtime] 구독 해제');
      clearInterval(healthCheck);
      supabase.removeChannel(channel);
    };
  }, [supabase, handleRealtimeChange, isAdmin, authLoading]);

  return {
    isRealtimeConnected
  };
} 