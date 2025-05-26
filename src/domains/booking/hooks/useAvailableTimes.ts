import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { API_PATHS } from '@/constants/apiPaths';
import { TimeSlot } from '@/types';
import { TIME_SLOT_INTERVAL } from '@/constants/time';

interface AvailableTimesResponse {
  timeSlots: TimeSlot[];
  operatingHours: {
    start: string;
    end: string;
    isClosed: boolean;
    message: string | null;
  };
  currentTime?: string;
  isToday: boolean;
}

interface UseAvailableTimesOptions {
  serviceId: string;
  selectedDate: Date | null;
  prefetchDays?: number; // 프리로딩할 일수 (기본값: 3)
}

// API 호출 함수
const fetchAvailableTimes = async (serviceId: string, dateString: string): Promise<AvailableTimesResponse> => {
  const response = await fetch(API_PATHS.SERVICES.AVAILABLE_TIMES(serviceId) + `?date=${dateString}`);
  
  if (!response.ok) {
    throw new Error(`API 응답 오류: ${response.status}`);
  }
  
  const data = await response.json();
  
  const operatingHours = {
    start: data.operatingStartTime,
    end: data.operatingEndTime,
    isClosed: data.isClosed || false,
    message: data.message || null
  };

  const allTimeSlots: TimeSlot[] = [];
  const isToday = data.isToday === true;
  
  for (let hour = 0; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += TIME_SLOT_INTERVAL) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      
      let status: TimeSlot['status'] = 'available';
      
      if (data.isClosed) {
        status = 'unavailable';
      }
      else if (
        timeString < data.operatingStartTime || 
        timeString >= data.operatingEndTime || 
        data.unavailableSlots.includes(timeString)
      ) {
        status = 'unavailable';
      }
      else if (isToday && data.currentTime && timeString < data.currentTime) {
        status = 'unavailable';
      }
      
      allTimeSlots.push({ time: timeString, status });
    }
  }
  
  return {
    timeSlots: allTimeSlots,
    operatingHours,
    currentTime: data.currentTime,
    isToday
  };
};

export const useAvailableTimes = ({ serviceId, selectedDate, prefetchDays = 3 }: UseAvailableTimesOptions) => {
  const queryClient = useQueryClient();
  
  const dateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  
  // 캐시 상태 확인 및 로깅
  React.useEffect(() => {
    if (!dateString || !serviceId) return;
    
    const cachedData = queryClient.getQueryData(['availableTimes', serviceId, dateString]);
    if (cachedData) {
      console.log(`[useAvailableTimes] 캐시 히트: ${dateString} (즉시 로드)`);
    } else {
      console.log(`[useAvailableTimes] 캐시 미스: ${dateString} (API 호출 필요)`);
    }
  }, [queryClient, serviceId, dateString]);
  
  // 메인 쿼리
  const query = useQuery({
    queryKey: ['availableTimes', serviceId, dateString],
    queryFn: () => fetchAvailableTimes(serviceId, dateString!),
    enabled: !!serviceId && !!dateString,
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    gcTime: 30 * 60 * 1000, // 30분간 캐시 유지 (구 cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false, // 마운트 시 자동 재요청 방지 (캐시 우선 사용)
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수 백오프
  });

  // 프리로딩 효과
  React.useEffect(() => {
    if (!selectedDate || !serviceId) return;

    const prefetchNearbyDates = async () => {
      const promises: Promise<void>[] = [];
      
      // 확장된 프리로딩 범위 (앞뒤 5일씩)
      const extendedPrefetchDays = Math.max(prefetchDays, 5);
      
      for (let i = -extendedPrefetchDays; i <= extendedPrefetchDays; i++) {
        if (i === 0) continue; // 현재 날짜는 이미 로드됨
        
        const targetDate = addDays(selectedDate, i);
        const targetDateString = format(targetDate, 'yyyy-MM-dd');
        
        // 이미 캐시된 데이터가 있는지 확인
        const existingData = queryClient.getQueryData(['availableTimes', serviceId, targetDateString]);
        
        if (!existingData) {
          const promise = queryClient.prefetchQuery({
            queryKey: ['availableTimes', serviceId, targetDateString],
            queryFn: () => fetchAvailableTimes(serviceId, targetDateString),
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000, // 30분간 캐시 유지
          });
          promises.push(promise);
        }
      }
      
      // 백그라운드에서 프리로딩 실행 (에러 무시)
      Promise.allSettled(promises).then(results => {
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failCount = results.filter(r => r.status === 'rejected').length;
        
        if (successCount > 0) {
          console.log(`[useAvailableTimes] 프리로딩 완료: ${successCount}개 성공, ${failCount}개 실패`);
        }
      }).catch(console.error);
    };

    // 현재 쿼리가 성공한 후 프리로딩 실행
    if (query.isSuccess) {
      // 약간의 지연을 두어 메인 UI 렌더링을 방해하지 않음
      setTimeout(prefetchNearbyDates, 100);
    }
  }, [selectedDate, serviceId, prefetchDays, queryClient, query.isSuccess]);

  return {
    ...query,
    timeSlots: query.data?.timeSlots || [],
    operatingHours: query.data?.operatingHours || {
      start: "09:00",
      end: "22:00",
      isClosed: false,
      message: null
    },
    currentTime: query.data?.currentTime,
    isToday: query.data?.isToday || false,
  };
};

// 특정 날짜의 캐시된 데이터를 가져오는 헬퍼 함수
export const useGetCachedAvailableTimes = (serviceId: string, date: Date | null) => {
  const queryClient = useQueryClient();
  const dateString = date ? format(date, 'yyyy-MM-dd') : null;
  
  return React.useMemo(() => {
    if (!dateString) return null;
    return queryClient.getQueryData<AvailableTimesResponse>(['availableTimes', serviceId, dateString]);
  }, [queryClient, serviceId, dateString]);
};

// 캐시 무효화 함수 (예약 완료 후 사용)
export const useInvalidateAvailableTimes = () => {
  const queryClient = useQueryClient();
  
  return React.useCallback((serviceId: string, date?: Date) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      queryClient.invalidateQueries({
        queryKey: ['availableTimes', serviceId, dateString]
      });
    } else {
      // 모든 날짜의 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: ['availableTimes', serviceId]
      });
    }
  }, [queryClient]);
}; 