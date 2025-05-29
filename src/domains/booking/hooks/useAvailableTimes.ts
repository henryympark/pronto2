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
  try {
    const response = await fetch(API_PATHS.SERVICES.AVAILABLE_TIMES(serviceId) + `?date=${dateString}`);
    
    if (!response.ok) {
      throw new Error(`API 응답 오류: ${response.status} ${response.statusText}`);
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
    
    // 휴무일인 경우 빈 배열 반환
    if (data.isClosed) {
      return {
        timeSlots: allTimeSlots,
        operatingHours,
        currentTime: data.currentTime,
        isToday
      };
    }
    
    // 운영시간 파싱
    const [startHour, startMinute] = data.operatingStartTime.split(':').map(Number);
    const [endHour, endMinute] = data.operatingEndTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    // 운영시간 내의 슬롯만 생성 (30분 단위)
    for (let totalMinutes = startTotalMinutes; totalMinutes < endTotalMinutes; totalMinutes += TIME_SLOT_INTERVAL) {
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      
      let status: TimeSlot['status'] = 'available';
      
      // 예약 불가능한 슬롯 체크
      if (data.unavailableSlots && data.unavailableSlots.includes(timeString)) {
        status = 'unavailable';
      }
      // 오늘 날짜이고 현재 시간 이전인 경우
      else if (isToday && data.currentTime && timeString < data.currentTime) {
        status = 'unavailable';
      }
      
      allTimeSlots.push({ time: timeString, status });
    }
    
    return {
      timeSlots: allTimeSlots,
      operatingHours,
      currentTime: data.currentTime,
      isToday
    };
  } catch (error) {
    console.error(`시간 정보 조회 오류 (서비스: ${serviceId}, 날짜: ${dateString}):`, error);
    throw error;
  }
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
    // 캐시 시간을 상수와 일치시켜 더 일관성 있게 관리
    staleTime: dateString === format(new Date(), 'yyyy-MM-dd')
      ? 10 * 1000    // 오늘: 10초간 fresh (CACHE_DURATIONS.AVAILABLE_TIMES.TODAY와 일치)
      : 5 * 60 * 1000, // 미래 날짜: 5분간 fresh (CACHE_DURATIONS.AVAILABLE_TIMES.FUTURE와 일치)
    gcTime: 30 * 60 * 1000, // 30분간 캐시 유지 (구 cacheTime)
    refetchOnWindowFocus: dateString === format(new Date(), 'yyyy-MM-dd'), // 오늘 날짜는 포커스 시 재요청
    refetchOnMount: false, // 마운트 시 자동 재요청 방지 (캐시 우선 사용)
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수 백오프
  });

  // 프리로딩 효과
  React.useEffect(() => {
    if (!selectedDate || !serviceId) return;

    const prefetchNearbyDates = async () => {
      try {
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
            }).catch(error => {
              console.warn(`프리로딩 실패 (${targetDateString}):`, error);
              // 개별 프리로딩 실패는 무시
            });
            promises.push(promise);
          }
        }
        
        // 백그라운드에서 프리로딩 실행
        const results = await Promise.allSettled(promises);
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failCount = results.filter(r => r.status === 'rejected').length;
        
        if (successCount > 0 || failCount > 0) {
          console.log(`[useAvailableTimes] 프리로딩 완료: ${successCount}개 성공, ${failCount}개 실패`);
        }
      } catch (error) {
        console.error('[useAvailableTimes] 프리로딩 중 예상치 못한 오류:', error);
      }
    };

    // 현재 쿼리가 성공한 후 프리로딩 실행
    if (query.isSuccess) {
      // 약간의 지연을 두어 메인 UI 렌더링을 방해하지 않음
      setTimeout(() => {
        prefetchNearbyDates().catch(error => {
          console.error('[useAvailableTimes] 프리로딩 실행 중 오류:', error);
        });
      }, 100);
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

// 캐시 무효화 함수 (예약 완료 후 사용) - 강화된 버전
export const useInvalidateAvailableTimes = () => {
  const queryClient = useQueryClient();
  
  return React.useCallback((serviceId: string, date?: Date) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      console.log(`[useInvalidateAvailableTimes] 특정 날짜 캐시 무효화: ${dateString}`);
      
      // 1. 해당 날짜의 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: ['availableTimes', serviceId, dateString]
      });
      
      // 2. 해당 날짜의 캐시 즉시 제거 (무효화보다 더 강력)
      queryClient.removeQueries({
        queryKey: ['availableTimes', serviceId, dateString]
      });
      
      // 3. 관련된 인접 날짜들도 무효화 (다른 사용자들이 보고 있을 수 있음)
      const adjacentDates = [
        format(addDays(date, -1), 'yyyy-MM-dd'), // 전날
        format(addDays(date, 1), 'yyyy-MM-dd'),  // 다음날
      ];
      
      adjacentDates.forEach(adjDate => {
        queryClient.invalidateQueries({
          queryKey: ['availableTimes', serviceId, adjDate]
        });
      });
      
      // 4. 즉시 새로운 데이터 프리페치 (사용자 경험 향상)
      queryClient.prefetchQuery({
        queryKey: ['availableTimes', serviceId, dateString],
        queryFn: () => fetchAvailableTimes(serviceId, dateString),
        staleTime: 0, // 즉시 fresh 상태로 만들기
      }).catch(error => {
        console.warn(`[useInvalidateAvailableTimes] 프리페치 실패 (${dateString}):`, error);
      });
      
    } else {
      console.log(`[useInvalidateAvailableTimes] 전체 서비스 캐시 무효화: ${serviceId}`);
      
      // 모든 날짜의 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: ['availableTimes', serviceId]
      });
      
      // 모든 날짜의 캐시 즉시 제거
      queryClient.removeQueries({
        queryKey: ['availableTimes', serviceId]
      });
    }
  }, [queryClient]);
};

// 전역 캐시 무효화 유틸리티 (다른 컴포넌트에서도 사용 가능)
export const invalidateAvailableTimesGlobally = (queryClient: any, serviceId: string, date?: Date) => {
  if (date) {
    const dateString = format(date, 'yyyy-MM-dd');
    console.log(`[Global] 캐시 무효화: ${serviceId} - ${dateString}`);
    
    // 즉시 제거 + 무효화 + 프리페치
    queryClient.removeQueries({
      queryKey: ['availableTimes', serviceId, dateString]
    });
    
    queryClient.invalidateQueries({
      queryKey: ['availableTimes', serviceId, dateString]
    });
    
    // 백그라운드에서 새 데이터 프리페치
    queryClient.prefetchQuery({
      queryKey: ['availableTimes', serviceId, dateString],
      queryFn: () => fetchAvailableTimes(serviceId, dateString),
      staleTime: 0,
    }).catch(console.warn);
    
  } else {
    console.log(`[Global] 전체 서비스 캐시 무효화: ${serviceId}`);
    queryClient.removeQueries({
      queryKey: ['availableTimes', serviceId]
    });
    queryClient.invalidateQueries({
      queryKey: ['availableTimes', serviceId]
    });
  }
}; 