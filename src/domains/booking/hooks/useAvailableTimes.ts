import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { useSupabase } from '@/contexts/SupabaseContext';
import type { TimeSlot, OperatingHours } from '@/types/index';

// 추가 타입 정의 (기존 타입을 확장하여 사용)
export interface AvailableTimesResponse {
  timeSlots: TimeSlot[];
  operatingHours: OperatingHours;
  currentTime?: string;
  isToday: boolean;
}

// 🚀 서버에서 전달받은 운영시간 데이터 타입
interface PreloadedOperatingHours {
  start: string;
  end: string;
  isClosed: boolean;
}

interface UseAvailableTimesProps {
  serviceId: string;
  selectedDate: Date | null;
  prefetchDays?: number;
  // 🔥 서버에서 전달받은 운영시간 데이터 (중복 쿼리 방지용)
  preloadedOperatingHours?: Map<number, PreloadedOperatingHours>;
}

interface UseAvailableTimesReturn extends AvailableTimesResponse {
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// 운영시간 생성 함수
const generateTimeSlots = (start: string, end: string, interval: number = 30): string[] => {
  const slots: string[] = [];
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;
  
  for (let time = startTime; time < endTime; time += interval) {
    const hour = Math.floor(time / 60);
    const minute = time % 60;
    slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  }
  
  return slots;
};

// 시간을 분으로 변환
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// 예약된 시간과 겹치는지 확인
const isTimeOverlapping = (slotTime: string, reservations: any[]): boolean => {
  const slotMinutes = timeToMinutes(slotTime);
  const slotEndMinutes = slotMinutes + 30; // 30분 슬롯 가정
  
  return reservations.some(reservation => {
    const startMinutes = timeToMinutes(reservation.start_time);
    const endMinutes = timeToMinutes(reservation.end_time);
    
    return (
      (slotMinutes >= startMinutes && slotMinutes < endMinutes) ||
      (slotEndMinutes > startMinutes && slotEndMinutes <= endMinutes) ||
      (slotMinutes <= startMinutes && slotEndMinutes >= endMinutes)
    );
  });
};

export const useAvailableTimes = ({
  serviceId,
  selectedDate,
  prefetchDays = 3,
  preloadedOperatingHours
}: UseAvailableTimesProps): UseAvailableTimesReturn => {
  const supabase = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({
    start: "09:00",
    end: "22:00",
    isClosed: false,
    message: null
  });
  const [currentTime, setCurrentTime] = useState<string>();
  const [isToday, setIsToday] = useState(false);

  const dateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  const fetchAvailableTimes = useCallback(async () => {
    if (!serviceId || !dateString) {
      setTimeSlots([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useAvailableTimes] 최적화된 데이터 로딩 시작: ${serviceId} - ${dateString}`);

      // 🚀 1. 서비스 존재 여부 확인 (간소화된 쿼리)
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('id')
        .eq('id', serviceId)
        .single();

      if (serviceError) {
        throw new Error(`서비스 정보 조회 실패: ${serviceError.message}`);
      }

      if (!service) {
        throw new Error('서비스를 찾을 수 없습니다.');
      }

      // 🚀 2. 선택된 날짜의 요일 계산
      const selectedDateObj = new Date(dateString);
      const dayOfWeek = selectedDateObj.getDay();

      // 🔥 3. 운영시간 정보 - 서버 데이터 우선 사용 (중복 쿼리 방지)
      let operatingStart = "09:00";
      let operatingEnd = "22:00";
      let isClosed = false;

      if (preloadedOperatingHours && preloadedOperatingHours.has(dayOfWeek)) {
        // 서버에서 전달받은 데이터 사용
        const preloadedData = preloadedOperatingHours.get(dayOfWeek)!;
        operatingStart = preloadedData.start;
        operatingEnd = preloadedData.end;
        isClosed = preloadedData.isClosed;
        
        console.log(`[useAvailableTimes] 서버 데이터 활용:`, {
          dayOfWeek,
          operatingStart,
          operatingEnd,
          isClosed,
          source: 'preloaded'
        });
      } else {
        // Fallback: 기존 쿼리 실행
        console.log(`[useAvailableTimes] Fallback: 운영시간 쿼리 실행`);
        const { data: operatingHoursData, error: operatingHoursError } = await supabase
          .from('service_operating_hours')
          .select('start_time, end_time, is_closed')
          .eq('service_id', serviceId)
          .eq('day_of_week', dayOfWeek)
          .single();

        if (operatingHoursData && !operatingHoursError) {
          operatingStart = operatingHoursData.start_time.substring(0, 5);
          operatingEnd = operatingHoursData.end_time.substring(0, 5);
          isClosed = operatingHoursData.is_closed || false;
        }
      }

      // 휴무일인 경우 빈 슬롯 반환
      if (isClosed) {
        setOperatingHours({
          start: operatingStart,
          end: operatingEnd,
          isClosed: true,
          message: '휴무일입니다'
        });
        setTimeSlots([]);
        setIsToday(dateString === format(new Date(), 'yyyy-MM-dd'));
        console.log(`[useAvailableTimes] 휴무일로 인한 빈 슬롯 반환: ${dateString}`);
        return;
      }

      // 운영시간 상태 설정
      setOperatingHours({
        start: operatingStart,
        end: operatingEnd,
        isClosed: false,
        message: null
      });

      // �� 4. 예약 정보와 차단된 시간을 통합 API로 조회 (최적화)
      let reservations: any[] = [];
      let blockedTimes: any[] = [];
      
      try {
        // 통합 API 호출로 네트워크 요청 횟수 감소
        const availabilityResponse = await fetch(`/api/services/${serviceId}/availability?date=${dateString}`);
        
        if (availabilityResponse.ok) {
          const availabilityData = await availabilityResponse.json();
          reservations = availabilityData.reservations || [];
          blockedTimes = availabilityData.blockedTimes || [];
          
          console.log(`[useAvailableTimes] 통합 API 사용:`, {
            reservationsCount: reservations.length,
            blockedTimesCount: blockedTimes.length,
            source: 'api'
          });
        } else {
          throw new Error('가용시간 API 호출 실패');
        }
      } catch (apiError) {
        console.warn('[useAvailableTimes] 통합 API 실패, Fallback으로 직접 쿼리 실행:', apiError);
        
        // Fallback: 기존 병렬 쿼리 방식
        const [reservationsResult, blockedTimesResult] = await Promise.all([
          supabase
            .from('reservations')
            .select('start_time, end_time, status')
            .eq('service_id', serviceId)
            .eq('reservation_date', dateString)
            .in('status', ['confirmed', 'pending', 'modified']),
          
          supabase
            .from('blocked_times')
            .select('start_time, end_time')
            .eq('service_id', serviceId)
            .eq('blocked_date', dateString)
        ]);

        if (reservationsResult.error) {
          throw new Error(`예약 정보 조회 실패: ${reservationsResult.error.message}`);
        }

        if (blockedTimesResult.error) {
          console.warn('차단된 시간 조회 실패:', blockedTimesResult.error.message);
        }

        reservations = reservationsResult.data || [];
        blockedTimes = blockedTimesResult.data || [];
        
        console.log(`[useAvailableTimes] Fallback 쿼리 사용:`, {
          reservationsCount: reservations.length,
          blockedTimesCount: blockedTimes.length,
          source: 'fallback'
        });
      }

      // 🚀 5. 현재 시간 및 오늘 여부 확인
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const isCurrentDay = dateString === today;
      
      setIsToday(isCurrentDay);

      let currentTimeStr: string | undefined;
      if (isCurrentDay) {
        currentTimeStr = format(now, 'HH:mm');
        setCurrentTime(currentTimeStr);
      }

      // 🚀 6. 시간 슬롯 생성 및 가용성 계산
      const allSlots = generateTimeSlots(operatingStart, operatingEnd, 30);
      const availableSlots: TimeSlot[] = [];

      for (const slot of allSlots) {
        let status: 'available' | 'unavailable' | 'selected' | 'reserved' = 'available';

        // 과거 시간 체크 (오늘인 경우)
        if (isCurrentDay && currentTimeStr) {
          const slotMinutes = timeToMinutes(slot);
          const currentMinutes = timeToMinutes(currentTimeStr);
          
          if (slotMinutes <= currentMinutes) {
            status = 'unavailable';
          }
        }

        // 예약된 시간 체크
        if (status === 'available' && isTimeOverlapping(slot, reservations)) {
          status = 'reserved';
        }

        // 차단된 시간 체크
        if (status === 'available' && isTimeOverlapping(slot, blockedTimes)) {
          status = 'unavailable';
        }

        availableSlots.push({
          time: slot,
          status: status
        });
      }

      setTimeSlots(availableSlots);
      
      console.log(`[useAvailableTimes] 최적화된 데이터 로딩 완료:`, {
        serviceId,
        date: dateString,
        totalSlots: availableSlots.length,
        availableCount: availableSlots.filter(s => s.status === 'available').length,
        reservedCount: availableSlots.filter(s => s.status === 'reserved').length,
        unavailableCount: availableSlots.filter(s => s.status === 'unavailable').length,
        reservationsCount: reservations.length,
        blockedTimesCount: blockedTimes.length,
        operatingHours: `${operatingStart}-${operatingEnd}`,
        optimizations: preloadedOperatingHours ? ['preloaded-hours', 'parallel-queries'] : ['parallel-queries']
      });

    } catch (error) {
      console.error('[useAvailableTimes] 오류 발생:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [serviceId, dateString, supabase, preloadedOperatingHours]);

  // 날짜나 서비스 변경 시 데이터 로드
  useEffect(() => {
    fetchAvailableTimes();
  }, [fetchAvailableTimes]);

  return {
    timeSlots,
    operatingHours,
    currentTime,
    isToday,
    isLoading,
    error,
    refetch: fetchAvailableTimes
  };
}; 