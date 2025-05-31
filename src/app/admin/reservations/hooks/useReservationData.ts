"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/contexts/SupabaseContext";
import { Reservation } from "../utils/reservationTypes";

interface UseReservationDataProps {
  isAdmin: boolean;
  authLoading: boolean;
}

interface UseReservationDataReturn {
  loading: boolean;
  error: string | null;
  reservations: Reservation[];
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
  fetchReservations: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export function useReservationData({
  isAdmin,
  authLoading
}: UseReservationDataProps): UseReservationDataReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  
  const supabase = useSupabase();
  
  // 예약 데이터 가져오기 함수
  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      console.log("[어드민 예약 페이지] Supabase 쿼리 시작");
      
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          customers(id, email, nickname, phone),
          services(id, name, price_per_hour)
        `)
        .order('created_at', { ascending: false });
        
      console.log("[어드민 예약 페이지] 쿼리 완료", { 
        hasError: !!error, 
        dataLength: data?.length || 0
      });
        
      if (error) {
        console.error("[어드민 예약 페이지] 데이터 로드 에러:", error);
        
        if (error.code === 'PGRST116' || error.message?.includes('permission denied')) {
          const errorMsg = error.code === 'PGRST116'
            ? '예약 테이블이 아직 존재하지 않습니다.'
            : '예약 테이블에 접근할 권한이 없습니다.';
          
          setError(errorMsg);
        } else {
          throw error;
        }
        return;
      }
      
      // 데이터 후처리: 타임스탬프 조합 생성
      const processedData = (data || []).map(reservation => ({
        ...reservation,
        // 실시간 상태 반영을 위한 타임스탬프 조합 생성
        combined_start_time: reservation.reservation_date && reservation.start_time 
          ? `${reservation.reservation_date}T${reservation.start_time}` 
          : null,
        combined_end_time: reservation.reservation_date && reservation.end_time 
          ? `${reservation.reservation_date}T${reservation.end_time}` 
          : null,
      }));
      
      console.log("[어드민 예약 페이지] 데이터 로드 성공, 처리된 예약 수:", processedData.length);
      setReservations(processedData);
      setError(null); // 에러 상태 초기화
    } catch (err: any) {
      console.error('[어드민 예약 페이지] 예약 정보 로딩 오류:', err);
      setError(err.message || '예약 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 데이터 새로고침 (에러 상태 초기화 포함)
  const refreshData = useCallback(async () => {
    setError(null);
    await fetchReservations();
  }, [fetchReservations]);
  
  // 초기 데이터 로드
  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchReservations();
    }
  }, [authLoading, isAdmin, fetchReservations]);

  return {
    loading,
    error,
    reservations,
    setReservations,
    fetchReservations,
    refreshData
  };
} 