"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { toast } from '@/hooks/use-toast';
import type { Reservation } from '@/types/reservation';

type FilterType = 'upcoming' | 'completed' | 'cancelled';

interface UseReservationsReturn {
  // 상태
  reservations: Reservation[];
  filteredReservations: Reservation[];
  activeFilter: FilterType;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  
  // 액션
  fetchReservations: () => Promise<void>;
  handleFilterChange: (filterType: FilterType) => void;
  refreshReservations: () => void;
  
  // 헬퍼 함수들
  getReservationTimeStatus: (reservation: Reservation) => 'before_start' | 'in_progress' | 'completed';
  applyFilter: (allReservations: Reservation[], filterType: FilterType) => Reservation[];
}

export function useReservations(userId: string | undefined): UseReservationsReturn {
  const supabase = useSupabase();
  
  // 상태 변수들
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 예약 상태 판별을 위한 헬퍼 함수
  const getReservationTimeStatus = useCallback((reservation: Reservation) => {
    const now = new Date();
    const startDateTime = new Date(`${reservation.reservation_date}T${reservation.start_time}`);
    const endDateTime = new Date(`${reservation.reservation_date}T${reservation.end_time}`);
    
    if (now < startDateTime) {
      return 'before_start'; // 시작 전
    } else if (now >= startDateTime && now <= endDateTime) {
      return 'in_progress'; // 이용 중
    } else {
      return 'completed'; // 완료 (시간이 지남)
    }
  }, []);

  // 필터 적용 함수
  const applyFilter = useCallback((allReservations: Reservation[], filterType: FilterType) => {
    if (!allReservations || allReservations.length === 0) {
      setFilteredReservations([]);
      return [];
    }
    
    let filtered: Reservation[] = [];
    const now = new Date();
    
    switch (filterType) {
      case 'upcoming':
        // 예약 현황: 예약 확정/변경됨 상태이면서 아직 끝나지 않은 예약들
        filtered = allReservations.filter(res => {
          const endDateTime = new Date(`${res.reservation_date}T${res.end_time}`);
          return (res.status === 'confirmed' || res.status === 'modified') && endDateTime > now;
        });
        break;
      case 'completed':
        // 이용 완료: 완료 상태이거나 시간이 지난 예약들  
        filtered = allReservations.filter(res => {
          const endDateTime = new Date(`${res.reservation_date}T${res.end_time}`);
          return res.status === 'completed' || 
                 ((res.status === 'confirmed' || res.status === 'modified') && endDateTime <= now);
        });
        break;
      case 'cancelled':
        // 취소 내역: 취소된 예약들
        filtered = allReservations.filter(res => res.status === 'cancelled');
        break;
      default:
        filtered = allReservations;
    }
    
    setFilteredReservations(filtered);
    return filtered;
  }, []);

  // 예약 데이터 조회 함수
  const fetchReservations = useCallback(async () => {
    if (!userId) return;
    
    try {
      console.log('[useReservations] 예약 조회 시작 - 사용자 ID:', userId);
      
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          service:services(id, name)
        `)
        .eq('customer_id', userId)
        .order('reservation_date', { ascending: false });

      console.log('[useReservations] 예약 조회 결과:', { data, error });

      if (error) throw error;
      
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        service: item.service || { id: item.service_id, name: '알 수 없는 서비스' },
        company_name: item.company_name || '',
        purpose: item.shooting_purpose || '',
        car_number: item.vehicle_number || '',
        has_review: item.has_review === true
      }));
      
      console.log('[useReservations] 포맷된 예약 데이터:', formattedData);
      
      setReservations(formattedData);
      applyFilter(formattedData, activeFilter);
      setHasError(false);
      setErrorMessage("");
    } catch (error) {
      console.error('예약 정보 조회 실패:', error);
      toast({
        title: "예약 정보 조회 실패",
        description: "예약 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : "알 수 없는 오류");
      setReservations([]);
      setFilteredReservations([]);
    }
  }, [userId, supabase, activeFilter, applyFilter]);

  // 필터 변경 핸들러
  const handleFilterChange = useCallback((filterType: FilterType) => {
    setActiveFilter(filterType);
    applyFilter(reservations, filterType);
  }, [reservations, applyFilter]);

  // 새로고침 함수
  const refreshReservations = useCallback(() => {
    if (isLoading) return;
    setIsLoading(true);
    fetchReservations().finally(() => {
      setIsLoading(false);
    });
  }, [isLoading, fetchReservations]);

  // 초기 데이터 로드
  useEffect(() => {
    if (userId) {
      fetchReservations().finally(() => {
        setIsLoading(false);
      });
    }
  }, [userId, fetchReservations]);

  // 실시간 상태 업데이트를 위한 타이머
  useEffect(() => {
    if (!reservations.length || isLoading) return;

    // 현재 시간 기준으로 상태가 변경될 수 있는 예약이 있는지 확인
    const hasActiveOrUpcomingReservations = reservations.some(reservation => {
      const timeStatus = getReservationTimeStatus(reservation);
      const now = new Date();
      const startDateTime = new Date(`${reservation.reservation_date}T${reservation.start_time}`);
      const endDateTime = new Date(`${reservation.reservation_date}T${reservation.end_time}`);
      
      // 시작 전이거나 이용 중인 예약이 있는지 확인
      return (timeStatus === 'before_start' && startDateTime > now) || 
             (timeStatus === 'in_progress' && endDateTime > now);
    });

    if (!hasActiveOrUpcomingReservations) return;

    // 1분마다 상태 체크하여 필터링된 목록 업데이트
    const interval = setInterval(() => {
      console.log('[useReservations] 실시간 상태 업데이트 - 예약 상태 재검토');
      
      // 현재 필터에 맞춰 목록 재적용
      applyFilter(reservations, activeFilter);
    }, 60000); // 1분 간격

    return () => {
      clearInterval(interval);
    };
  }, [reservations, activeFilter, isLoading, getReservationTimeStatus, applyFilter]);

  return {
    // 상태
    reservations,
    filteredReservations,
    activeFilter,
    isLoading,
    hasError,
    errorMessage,
    
    // 액션
    fetchReservations,
    handleFilterChange,
    refreshReservations,
    
    // 헬퍼 함수들
    getReservationTimeStatus,
    applyFilter,
  };
} 