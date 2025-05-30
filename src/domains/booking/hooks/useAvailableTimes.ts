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

interface UseAvailableTimesProps {
  serviceId: string;
  selectedDate: Date | null;
  prefetchDays?: number;
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
  prefetchDays = 3
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
      console.log(`[useAvailableTimes] 데이터 로딩 시작: ${serviceId} - ${dateString}`);

      // 1. 서비스 정보 조회 (존재 여부 확인)
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('id, name')
        .eq('id', serviceId)
        .single();

      if (serviceError) {
        throw new Error(`서비스 정보 조회 실패: ${serviceError.message}`);
      }

      if (!service) {
        throw new Error('서비스를 찾을 수 없습니다.');
      }

      // 2. 선택된 날짜의 요일 계산 (일요일=0, 월요일=1, ..., 토요일=6)
      const selectedDateObj = new Date(dateString);
      const dayOfWeek = selectedDateObj.getDay();

      // 3. 해당 요일의 운영시간 조회
      const { data: operatingHoursData, error: operatingHoursError } = await supabase
        .from('service_operating_hours')
        .select('start_time, end_time, is_closed')
        .eq('service_id', serviceId)
        .eq('day_of_week', dayOfWeek)
        .single();

      if (operatingHoursError) {
        // 운영시간 정보가 없는 경우 기본값 사용
        console.warn('운영시간 정보 조회 실패, 기본값 사용:', operatingHoursError.message);
      }

      // 4. 운영시간 설정 (기본값 또는 조회된 값)
      let operatingStart = "09:00";
      let operatingEnd = "22:00";
      let isClosed = false;

      if (operatingHoursData && !operatingHoursError) {
        // 시간 형식을 HH:MM으로 변환 (HH:MM:SS에서 SS 제거)
        operatingStart = operatingHoursData.start_time.substring(0, 5);
        operatingEnd = operatingHoursData.end_time.substring(0, 5);
        isClosed = operatingHoursData.is_closed || false;
      }

      console.log(`[useAvailableTimes] 운영시간 정보:`, {
        dayOfWeek,
        operatingStart,
        operatingEnd,
        isClosed
      });

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

      // 5. 예약 정보 조회
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('start_time, end_time, status')
        .eq('service_id', serviceId)
        .eq('reservation_date', dateString)
        .in('status', ['confirmed', 'pending', 'modified']);

      if (reservationsError) {
        throw new Error(`예약 정보 조회 실패: ${reservationsError.message}`);
      }

      // 6. 차단된 시간 조회
      const { data: blockedTimes, error: blockedError } = await supabase
        .from('blocked_times')
        .select('start_time, end_time')
        .eq('service_id', serviceId)
        .eq('blocked_date', dateString);

      if (blockedError) {
        console.warn('차단된 시간 조회 실패:', blockedError.message);
      }

      // 7. 현재 시간 및 오늘 여부 확인
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const isCurrentDay = dateString === today;
      
      setIsToday(isCurrentDay);
      if (isCurrentDay) {
        setCurrentTime(format(now, 'HH:mm'));
      }

      // 8. 시간 슬롯 생성
      const allSlots = generateTimeSlots(operatingStart, operatingEnd, 30);
      
      const processedSlots: TimeSlot[] = allSlots.map(time => {
        // 기본 상태
        let status: 'available' | 'unavailable' | 'selected' | 'reserved' = 'available';
        
        // 예약과 겹치는지 확인
        if (isTimeOverlapping(time, reservations || [])) {
          status = 'reserved';
        }
        
        // 차단된 시간인지 확인
        const isBlocked = (blockedTimes || []).some(blocked => {
          const slotMinutes = timeToMinutes(time);
          const startMinutes = timeToMinutes(blocked.start_time);
          const endMinutes = timeToMinutes(blocked.end_time);
          return slotMinutes >= startMinutes && slotMinutes < endMinutes;
        });
        if (isBlocked) {
          status = 'unavailable';
        }
        
        // 현재 시간 이전인지 확인 (오늘인 경우만)
        if (isCurrentDay) {
          const currentMinutes = timeToMinutes(format(now, 'HH:mm'));
          const slotMinutes = timeToMinutes(time);
          if (slotMinutes <= currentMinutes) {
            status = 'unavailable';
          }
        }
        
        return {
          time,
          status
        };
      });

      console.log(`[useAvailableTimes] 시간 슬롯 생성 완료:`, {
        total: processedSlots.length,
        available: processedSlots.filter(slot => slot.status === 'available').length,
        reserved: processedSlots.filter(slot => slot.status === 'reserved').length,
        unavailable: processedSlots.filter(slot => slot.status === 'unavailable').length
      });

      setTimeSlots(processedSlots);
      
      console.log(`[useAvailableTimes] 데이터 로딩 완료: ${dateString} (${processedSlots.length}개 슬롯)`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      console.error('[useAvailableTimes] 데이터 로딩 실패:', err);
      setError(errorMessage);
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, serviceId, dateString]);

  // 데이터 로딩 효과
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