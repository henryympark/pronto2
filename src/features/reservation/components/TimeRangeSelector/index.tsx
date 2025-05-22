"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DEFAULT_TIMEZONE } from "@/constants/region";
import { TIME_SLOT_INTERVAL } from "@/constants/time";
import { API_PATHS } from "@/constants/apiPaths";
import { timeToMinutes, formatMinutesToTime, formatTimeWithoutSeconds } from "@/lib/date-utils";
import { useReservationStore } from "../../stores/reservationStore";
import { TimeSlot } from "@/types";
import TimeSlotGrid from "./TimeSlotGrid";
import TimeSlotLegend from "./TimeSlotLegend";
import TimeRangeInfo from "./TimeRangeInfo";

// 캐시 인터페이스
interface CachedTimeSlots {
  date: string;
  timeSlots: TimeSlot[];
  operatingHours: {
    start: string;
    end: string;
    isClosed: boolean;
    message: string | null;
  };
}

interface TimeRangeSelectorProps {
  serviceId: string;
  selectedDate: Date | null;
  onTimeRangeChange: (startTime: string, endTime: string, durationHours: number, price: number) => void;
  pricePerHour: number;
  initialStartTime?: string; // 기존 예약 시작 시간
  initialEndTime?: string;   // 기존 예약 종료 시간
}

export default function TimeRangeSelector({
  serviceId,
  selectedDate,
  onTimeRangeChange,
  pricePerHour,
  initialStartTime,
  initialEndTime
}: TimeRangeSelectorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [operatingHours, setOperatingHours] = useState<{
    start: string;
    end: string;
    isClosed: boolean;
    message: string | null;
  }>({
    start: "09:00",
    end: "22:00",
    isClosed: false,
    message: null
  });
  // 결과 캐싱을 위한 상태 추가
  const [cachedResults, setCachedResults] = useState<CachedTimeSlots[]>([]);
  // 초기 시간 설정 여부 추적
  const [initialTimeSet, setInitialTimeSet] = useState(false);

  // 초기 예약 시간 설정을 위한 useEffect
  useEffect(() => {
    if (initialStartTime && initialEndTime && !initialTimeSet && timeSlots.length > 0) {
      try {
        // 시작 시간과 종료 시간에서 초 부분 제거 (HH:MM:SS 또는 HH:MM 형식 모두 처리)
        const startTime = formatTimeWithoutSeconds(initialStartTime);
        const endTime = formatTimeWithoutSeconds(initialEndTime);
        
        // 시작 시간과 종료 시간을 분으로 변환
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        
        // 종료 시간은 30분을 빼서 마지막 슬롯 시간을 구함 (종료 시간은 다음 슬롯의 시작)
        const lastSlotMinutes = endMinutes - 30;
        
        // 선택할 슬롯 배열 생성
        const newSelectedSlots: string[] = [];
        
        // 시작 시간부터 마지막 슬롯까지 30분 간격으로 슬롯 추가
        let currentMinutes = startMinutes;
        while (currentMinutes <= lastSlotMinutes) {
          const timeStr = formatMinutesToTime(currentMinutes);
          
          // 해당 시간 슬롯을 추가 (가용성 체크 없이 강제로 추가)
          newSelectedSlots.push(timeStr);
          
          currentMinutes += 30; // 30분 간격으로 증가
        }
        
        // 선택된 슬롯 설정 (빈 배열이 아닌 경우에만)
        if (newSelectedSlots.length > 0) {
          setSelectedSlots(newSelectedSlots);
          setInitialTimeSet(true);
        }
      } catch (error) {
        console.error('초기 예약 시간 설정 오류:', error);
      }
    }
  }, [initialStartTime, initialEndTime, initialTimeSet, timeSlots]);

  // 날짜 문자열 생성 함수 (메모이제이션)
  const dateString = useMemo(() => 
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '', 
    [selectedDate]
  );
  
  // 캐시에서 데이터 가져오기 (메모이제이션)
  const cachedData = useMemo(() => 
    dateString ? cachedResults.find(item => item.date === dateString) : undefined,
    [dateString, cachedResults]
  );

  // API에서 시간 슬롯 데이터 가져오기 (useCallback으로 최적화)
  const fetchAvailableTimes = useCallback(async () => {
    if (!selectedDate || !serviceId || !dateString) return;
    
    // 이미 로딩 중이면 중복 요청 방지
    if (loading) return;
    
    // 캐시된 데이터가 있으면 바로 사용
    if (cachedData) {
      setTimeSlots(cachedData.timeSlots);
      setOperatingHours(cachedData.operatingHours);
      return;
    }
    
    setLoading(true);
    
    try {
      // API 호출
      const response = await fetch(API_PATHS.SERVICES.AVAILABLE_TIMES(serviceId) + `?date=${dateString}`);
      
      if (!response.ok) {
        throw new Error(`API 응답 오류: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 운영 정보 설정
      const newOperatingHours = {
        start: data.operatingStartTime,
        end: data.operatingEndTime,
        isClosed: data.isClosed || false,
        message: data.message || null
      };
      
      // 모든 시간 슬롯 생성 (00:00부터 23:30까지 TIME_SLOT_INTERVAL 단위)
      const allTimeSlots: TimeSlot[] = [];
      
      for (let hour = 0; hour <= 23; hour++) {
        for (let minute = 0; minute < 60; minute += TIME_SLOT_INTERVAL) {
          const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
          
          // 슬롯 상태 결정 (최적화된 조건 검사)
          let status: TimeSlot['status'] = 'available';
          
          if (
            data.isClosed || 
            timeString < data.operatingStartTime || 
            timeString >= data.operatingEndTime || 
            data.unavailableSlots.includes(timeString) ||
            (data.currentTime && timeString < data.currentTime)
          ) {
            status = 'unavailable';
          }
          
          allTimeSlots.push({ time: timeString, status });
        }
      }
      
      // 상태 업데이트 (배치 처리)
      setTimeSlots(allTimeSlots);
      setOperatingHours(newOperatingHours);
      
      // 캐시에 결과 추가 (최대 10개 날짜까지만 캐시)
      setCachedResults(prev => {
        const newCache = [...prev.filter(item => item.date !== dateString), {
          date: dateString,
          timeSlots: allTimeSlots,
          operatingHours: newOperatingHours
        }];
        
        // 캐시 크기 제한
        return newCache.length > 10 ? newCache.slice(newCache.length - 10) : newCache;
      });
    } catch (error) {
      console.error("예약 가능 시간 조회 오류:", error);
      toast({
        title: "시간 조회 실패",
        description: "예약 가능 시간을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
      
      // 기본 시간 슬롯 생성 (오류 발생 시)
      const defaultSlots: TimeSlot[] = [];
      for (let hour = 0; hour <= 23; hour++) {
        for (let minute = 0; minute < 60; minute += TIME_SLOT_INTERVAL) {
          const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
          // 9시 ~ 22시 사이만 가능하도록 설정
          const status = (hour >= 9 && hour < 22) ? 'available' : 'unavailable';
          defaultSlots.push({ time: timeString, status });
        }
      }
      setTimeSlots(defaultSlots);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, serviceId, dateString, loading, cachedData, toast]);

  // 날짜가 변경될 때 시간 슬롯 정보 조회
  useEffect(() => {
    if (!selectedDate || !serviceId) return;
    
    // 날짜가 변경되면 선택된 슬롯 초기화
    if (!cachedData) {
      setSelectedSlots([]);
    }
    
    fetchAvailableTimes();
  }, [selectedDate, serviceId, fetchAvailableTimes, cachedData]);

  // 시간 슬롯 클릭 핸들러
  const handleSlotClick = (slot: TimeSlot) => {
    if (!selectedDate || slot.status === 'unavailable') {
      return;
    }

    let newSelectedSlots: string[] = [];

    // 이미 선택된 슬롯이면 선택 취소 로직 적용
    if (selectedSlots.includes(slot.time)) {
      // 선택된 슬롯이 2개(1시간)만 남았으면 전체 선택 취소
      if (selectedSlots.length <= 2) {
        setSelectedSlots([]);
        return;
      }

      // 분으로 변환하고 정렬된 시간 슬롯
      const sortedSlotMinutes = selectedSlots.map(timeToMinutes).sort((a, b) => a - b);
      const slotMinutes = timeToMinutes(slot.time);
      
      // 첫 슬롯이나 마지막 슬롯을 클릭한 경우, 해당 슬롯만 제거
      if (slotMinutes === sortedSlotMinutes[0] || slotMinutes === sortedSlotMinutes[sortedSlotMinutes.length - 1]) {
        newSelectedSlots = selectedSlots.filter(time => time !== slot.time);
      } else {
        // 중간 슬롯을 클릭한 경우는 전체 선택 취소
        setSelectedSlots([]);
        return;
      }
    } else {
      // 새로운 슬롯 선택 로직
      
      // 아무것도 선택되지 않은 경우, 1시간(2개 슬롯) 자동 선택
      if (selectedSlots.length === 0) {
        const slotMinutes = timeToMinutes(slot.time);
        const nextSlotMinutes = slotMinutes + TIME_SLOT_INTERVAL;
        
        // 다음 슬롯이 있는지 확인
        const nextSlotTime = formatMinutesToTime(nextSlotMinutes);
        
        // 다음 슬롯이 예약 가능한지 확인
        const nextSlot = timeSlots.find(s => s.time === nextSlotTime);
        
        if (nextSlot && nextSlot.status === 'available') {
          // 1시간(현재 슬롯 + 다음 슬롯) 선택
          newSelectedSlots = [slot.time, nextSlotTime];
        } else {
          // 다음 슬롯이 없거나 예약 불가능하면 현재 슬롯만 선택
          newSelectedSlots = [slot.time];
        }
      } else {
        // 선택 로직
        const slotMinutes = timeToMinutes(slot.time);
        
        // 선택된 슬롯 시간을 분으로 변환하고 정렬
        const selectedSlotMinutes = selectedSlots.map(timeToMinutes).sort((a, b) => a - b);
        const minSelected = selectedSlotMinutes[0];
        const maxSelected = selectedSlotMinutes[selectedSlotMinutes.length - 1];
        
        // 새 슬롯이 선택 범위 이전이면 시작점으로 설정
        if (slotMinutes < minSelected) {
          // 연속성 확인 (TIME_SLOT_INTERVAL 간격)
          if (minSelected - slotMinutes === TIME_SLOT_INTERVAL) {
            // 기존 선택 앞에 추가
            newSelectedSlots = [slot.time, ...selectedSlots];
          } else {
            // 연속적이지 않으면 1시간 자동 선택
            const nextSlotMinutes = slotMinutes + TIME_SLOT_INTERVAL;
            const nextSlotTime = formatMinutesToTime(nextSlotMinutes);
            
            // 다음 슬롯이 예약 가능한지 확인
            const nextSlot = timeSlots.find(s => s.time === nextSlotTime);
            
            if (nextSlot && nextSlot.status === 'available') {
              // 1시간 선택
              newSelectedSlots = [slot.time, nextSlotTime];
            } else {
              // 다음 슬롯이 없거나 예약 불가능하면 현재 슬롯만 선택
              newSelectedSlots = [slot.time];
            }
          }
        }
        // 새 슬롯이 선택 범위 이후면 종료점으로 설정
        else if (slotMinutes > maxSelected) {
          // 연속성 확인 (TIME_SLOT_INTERVAL 간격)
          if (slotMinutes - maxSelected === TIME_SLOT_INTERVAL) {
            // 기존 선택 뒤에 추가
            newSelectedSlots = [...selectedSlots, slot.time];
          } else {
            // 연속적이지 않으면 1시간 자동 선택
            const nextSlotMinutes = slotMinutes + TIME_SLOT_INTERVAL;
            const nextSlotTime = formatMinutesToTime(nextSlotMinutes);
            
            // 다음 슬롯이 예약 가능한지 확인
            const nextSlot = timeSlots.find(s => s.time === nextSlotTime);
            
            if (nextSlot && nextSlot.status === 'available') {
              // 1시간 선택
              newSelectedSlots = [slot.time, nextSlotTime];
            } else {
              // 다음 슬롯이 없거나 예약 불가능하면 현재 슬롯만 선택
              newSelectedSlots = [slot.time];
            }
          }
        }
        // 선택 범위 내부인 경우 (이미 선택된 슬롯 포함)
        else {
          // 새 범위 설정 (시작점부터 클릭한 슬롯까지)
          const newRange: string[] = [];
          let current = minSelected;
          
          while (current <= slotMinutes) {
            const timeStr = formatMinutesToTime(current);
            
            // 해당 시간 슬롯이 예약 가능한지 확인
            const isAvailable = timeSlots.find(s => s.time === timeStr)?.status === 'available' || 
                               selectedSlots.includes(timeStr);
            
            if (isAvailable) {
              newRange.push(timeStr);
            } else {
              // 불가능한 슬롯이 있으면 범위 선택 실패
              toast({
                title: "연속된 시간만 선택 가능합니다",
                description: "선택한 범위 내에 예약 불가능한 시간이 포함되어 있습니다.",
                variant: "destructive"
              });
              return;
            }
            
            current += TIME_SLOT_INTERVAL; // TIME_SLOT_INTERVAL 간격으로 증가
          }
          
          newSelectedSlots = newRange;
        }
      }
    }

    // 최대 24시간(48개 슬롯) 제한
    if (newSelectedSlots.length > 48) {
      toast({
        title: "최대 시간 초과",
        description: "최대 24시간까지만 예약 가능합니다.",
        variant: "destructive"
      });
      return;
    }

    setSelectedSlots(newSelectedSlots);
  };

  // 선택된 시간이 변경될 때마다 부모 컴포넌트에 알림 (메모이제이션)
  useEffect(() => {
    if (selectedSlots.length > 0) {
      // 시간 정렬
      const sortedSlots = [...selectedSlots].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
      const startTime = sortedSlots[0];
      
      // 마지막 슬롯 시간에서 30분을 더한 시간이 종료 시간
      const lastSlot = sortedSlots[sortedSlots.length - 1];
      const lastSlotMinutes = timeToMinutes(lastSlot);
      const endTimeMinutes = lastSlotMinutes + TIME_SLOT_INTERVAL;
      const endTime = formatMinutesToTime(endTimeMinutes);
      
      // 선택 시간 계산
      const duration = selectedSlots.length * 0.5; // 각 슬롯은 30분 (0.5시간)
      const price = Math.round(duration * pricePerHour);
      
      onTimeRangeChange(startTime, endTime, duration, price);
    } else {
      onTimeRangeChange("", "", 0, 0);
    }
  }, [selectedSlots, pricePerHour, onTimeRangeChange]);

  return (
    <div className="w-full">
      {/* 최상단 안내 텍스트 */}
      <div className="text-sm text-pronto-gray-600">
        최소 1시간 ~ 최대 24시간 이용 가능
      </div>
      
      {/* 휴무일 메시지 */}
      {operatingHours.isClosed && operatingHours.message && (
        <div className="mb-3 p-3 bg-pronto-gray-100 border border-pronto-gray-300 rounded-md text-pronto-gray-700">
          {operatingHours.message}
        </div>
      )}
      
      {/* 시간 선택 그리드 */}
      <TimeSlotGrid 
        timeSlots={timeSlots}
        selectedSlots={selectedSlots}
        onSlotClick={handleSlotClick}
        loading={loading}
      />
      
      {/* 색상 범례 */}
      <TimeSlotLegend />
      
      {/* 선택 정보 요약 */}
      <TimeRangeInfo 
        selectedSlots={selectedSlots}
        slotDuration={TIME_SLOT_INTERVAL}
      />
      
      <div className="mt-4 text-center text-sm text-pronto-gray-500">
        <p>최소 1시간 이상 예약이 필요합니다.</p>
        <p>연속된 시간만 선택 가능합니다.</p>
      </div>
    </div>
  );
} 