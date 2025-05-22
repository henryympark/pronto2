"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DEFAULT_TIMEZONE } from "@/constants/region";
import { TIME_SLOT_INTERVAL } from "@/constants/time";
import { API_PATHS } from "@/constants/apiPaths";
import TimeSlotGrid from "./TimeRangeSelector/TimeSlotGrid";
import { TimeSlot } from "@/types";

// 타입 정의 (TimeSlot 제거하고 import로 대체)
interface TimeRangeSelectorProps {
  serviceId: string;
  selectedDate: Date | null;
  onTimeRangeChange: (startTime: string, endTime: string, durationHours: number, price: number) => void;
  pricePerHour: number;
  initialStartTime?: string; // 기존 예약 시작 시간
  initialEndTime?: string;   // 기존 예약 종료 시간
}

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
  const [currentTime, setCurrentTime] = useState<string | undefined>(undefined);
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

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 초기 예약 시간 설정을 위한 useEffect
  useEffect(() => {
    if (initialStartTime && initialEndTime && !initialTimeSet && timeSlots.length > 0) {
      try {
        // 시작 시간과 종료 시간에서 초 부분 제거 (HH:MM:SS 또는 HH:MM 형식 모두 처리)
        const startTime = initialStartTime.includes(':') ? 
          initialStartTime.substring(0, 5) : initialStartTime;
        const endTime = initialEndTime.includes(':') ? 
          initialEndTime.substring(0, 5) : initialEndTime;
        
        console.log('[TimeRangeSelector] 초기 예약 시간 설정 시도:', { 
          originalStartTime: initialStartTime, 
          originalEndTime: initialEndTime,
          formattedStartTime: startTime, 
          formattedEndTime: endTime 
        });
        
        // 시간을 분으로 변환하는 함수
        const timeToMinutes = (time: string): number => {
          const [hours, minutes] = time.split(":").map(Number);
          return hours * 60 + minutes;
        };
        
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
          const hours = Math.floor(currentMinutes / 60);
          const minutes = currentMinutes % 60;
          const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          
          // 해당 시간 슬롯이 가용한지 확인
          const isAvailable = timeSlots.find(slot => slot.time === timeStr)?.status === 'available';
          
          if (isAvailable) {
            // 가용한 슬롯만 추가
            newSelectedSlots.push(timeStr);
          } else {
            console.log(`[TimeRangeSelector] 슬롯 ${timeStr}은 예약 불가능하여 건너뜁니다.`);
          }
          
          currentMinutes += 30; // 30분 간격으로 증가
        }
        
        console.log('[TimeRangeSelector] 선택된 초기 시간 슬롯:', newSelectedSlots);
        
        // 선택된 슬롯 설정 (빈 배열이 아닌 경우에만)
        if (newSelectedSlots.length > 0) {
          setSelectedSlots(newSelectedSlots);
          setInitialTimeSet(true);
          console.log('[TimeRangeSelector] 초기 시간 설정 완료');
        } else {
          console.log('[TimeRangeSelector] 초기 시간 설정 실패: 선택 가능한 슬롯이 없습니다');
        }
      } catch (error) {
        console.error('[TimeRangeSelector] 초기 예약 시간 설정 오류:', error);
      }
    }
  }, [initialStartTime, initialEndTime, initialTimeSet, timeSlots, selectedDate]);

  // 날짜가 변경될 때 시간 슬롯 정보 조회
  useEffect(() => {
    if (!selectedDate || !serviceId) return;
    
    // 날짜 형식 변환 (YYYY-MM-DD)
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    
    console.log('[TimeRangeSelector] 날짜 변경:', dateString);
    
    // 선택된 슬롯 초기화 (날짜가 변경되면 선택된 시간도 초기화)
    if (selectedSlots.length > 0) {
      setSelectedSlots([]);
    }
    
    // 캐시에서 해당 날짜의 데이터 찾기
    const cachedData = cachedResults.find(item => item.date === dateString);
    
    if (cachedData) {
      // 캐시된 데이터가 있으면 바로 사용
      console.log('[TimeRangeSelector] 캐시된 데이터 사용:', dateString);
      setTimeSlots(cachedData.timeSlots);
      setOperatingHours(cachedData.operatingHours);
      return;
    }
    
    const fetchAvailableTimes = async () => {
      setLoading(true);
      setSelectedSlots([]);
      
      try {
        // API 호출 (상수 파일에서 경로 가져오기)
        const response = await fetch(API_PATHS.SERVICES.AVAILABLE_TIMES(serviceId) + `?date=${dateString}`);
        
        if (!response.ok) {
          throw new Error(`API 응답 오류: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[TimeRangeSelector] API 응답:', data);
        
        // 현재 시간 설정
        setCurrentTime(data.currentTime);
        
        // 운영 정보 설정
        const newOperatingHours = {
          start: data.operatingStartTime,
          end: data.operatingEndTime,
          isClosed: data.isClosed || false,
          message: data.message || null
        };
        
        setOperatingHours(newOperatingHours);

        // 모든 시간 슬롯 생성 (00:00부터 23:30까지 TIME_SLOT_INTERVAL 단위)
        const allTimeSlots: TimeSlot[] = [];
        
        // 오늘 날짜인지 확인 (API에서 명시적으로 제공하는 정보 사용)
        const isToday = data.isToday === true;
        console.log('[TimeRangeSelector] 오늘 날짜 여부:', isToday, '현재 시간:', data.currentTime, '날짜 차이:', data.daysDiff);
        
        for (let hour = 0; hour <= 23; hour++) {
          for (let minute = 0; minute < 60; minute += TIME_SLOT_INTERVAL) {
            const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
            
            // 슬롯 상태 결정
            let status: TimeSlot['status'] = 'available';
            
            // 휴무일인 경우 모든 슬롯 불가능
            if (data.isClosed) {
              status = 'unavailable';
            }
            // 운영 시간 외 시간은 불가능
            else if (
              timeString < data.operatingStartTime || 
              timeString >= data.operatingEndTime || 
              data.unavailableSlots.includes(timeString)
            ) {
              status = 'unavailable';
            }
            // 오늘인 경우에만 현재 시간 이전 슬롯은 불가능
            else if (isToday && data.currentTime && timeString < data.currentTime) {
              status = 'unavailable';
            }
            
            allTimeSlots.push({ time: timeString, status });
          }
        }
        
        // 디버깅: 생성된 시간 슬롯 확인
        console.log(`[TimeRangeSelector] ${dateString}에 대한 시간 슬롯 생성 완료:`, 
          allTimeSlots.filter(slot => slot.status === 'available').length, '개 가능,',
          allTimeSlots.filter(slot => slot.status === 'unavailable').length, '개 불가능');
        
        setTimeSlots(allTimeSlots);
        
        // 캐시에 결과 추가 (최대 10개 날짜까지만 캐시)
        setCachedResults(prev => {
          // 동일한 날짜의 이전 캐시 항목 제거
          const filteredCache = prev.filter(item => item.date !== dateString);
          
          const newCache = [...filteredCache, {
            date: dateString,
            timeSlots: allTimeSlots,
            operatingHours: newOperatingHours
          }];
          
          // 캐시 크기 제한 (최대 10개 날짜)
          if (newCache.length > 10) {
            return newCache.slice(newCache.length - 10);
          }
          
          return newCache;
        });
      } catch (error) {
        console.error("예약 가능 시간 조회 오류:", error);
        toast({
          title: "시간 정보 조회 실패",
          description: "예약 가능 시간을 불러오는데 문제가 발생했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAvailableTimes();
  }, [selectedDate, serviceId, toast]);

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

      // 시간을 분으로 변환하는 헬퍼 함수
      const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      };

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
      // 시간을 분으로 변환하는 헬퍼 함수
      const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      };

      // 아무것도 선택되지 않은 경우, 1시간(2개 슬롯) 자동 선택
      if (selectedSlots.length === 0) {
        const slotMinutes = timeToMinutes(slot.time);
        const nextSlotMinutes = slotMinutes + TIME_SLOT_INTERVAL;
        
        // 다음 슬롯이 있는지 확인
        const nextSlotHours = Math.floor(nextSlotMinutes / 60);
        const nextSlotMins = nextSlotMinutes % 60;
        const nextSlotTime = `${nextSlotHours.toString().padStart(2, '0')}:${nextSlotMins.toString().padStart(2, '0')}`;
        
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
        // 선택 로직 (기존과 동일)
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
            const nextSlotHours = Math.floor(nextSlotMinutes / 60);
            const nextSlotMins = nextSlotMinutes % 60;
            const nextSlotTime = `${nextSlotHours.toString().padStart(2, '0')}:${nextSlotMins.toString().padStart(2, '0')}`;
            
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
            const nextSlotHours = Math.floor(nextSlotMinutes / 60);
            const nextSlotMins = nextSlotMinutes % 60;
            const nextSlotTime = `${nextSlotHours.toString().padStart(2, '0')}:${nextSlotMins.toString().padStart(2, '0')}`;
            
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
            const hours = Math.floor(current / 60);
            const minutes = current % 60;
            const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
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

  // 슬라이더 스크롤 핸들러
  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    
    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // 선택된 시간이 변경될 때마다 부모 컴포넌트에 알림
  useEffect(() => {
    if (selectedSlots.length > 0) {
      // 시간 정렬
      const sortedSlots = [...selectedSlots].sort((a, b) => {
        const [aHours, aMinutes] = a.split(":").map(Number);
        const [bHours, bMinutes] = b.split(":").map(Number);
        return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
      });
      
      const startTime = sortedSlots[0];
      
      // 마지막 슬롯 시간에서 30분을 더한 시간이 종료 시간
      const lastSlot = sortedSlots[sortedSlots.length - 1];
      const [lastHours, lastMinutes] = lastSlot.split(":").map(Number);
      
      let endHours = lastHours;
      let endMinutes = lastMinutes + 30;
      
      if (endMinutes >= 60) {
        endHours += 1;
        endMinutes -= 60;
      }

      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
      
      // 선택 시간 계산
      const duration = selectedSlots.length * 0.5; // 각 슬롯은 30분 (0.5시간)
      const price = Math.round(duration * pricePerHour);
      
      onTimeRangeChange(startTime, endTime, duration, price);
    } else {
      onTimeRangeChange("", "", 0, 0);
    }
  }, [selectedSlots, pricePerHour]);

  // 슬롯 상태에 따른 클래스 결정
  const getSlotClass = (slot: TimeSlot) => {
    if (selectedSlots.includes(slot.time)) {
      return "bg-pronto-primary text-white";
    }
    
    switch (slot.status) {
      case 'unavailable':
        return "bg-[#C0C2C5] cursor-not-allowed";
      case 'reserved':
        return "bg-[#C0C2C5] cursor-not-allowed";
      case 'available':
        return "bg-[#F3F4F6] hover:bg-pronto-gray-200";
      default:
        return "bg-[#F3F4F6]";
    }
  };

  // 시간대 레이블 포맷 (HH:MM -> HH시)
  const formatTimeLabel = (time: string): string => {
    const [hours] = time.split(':').map(Number);
    return `${hours.toString().padStart(2, '0')}시`;
  };

  return (
    <div className="w-full">
      {/* 최상단 안내 텍스트 */}
      <div className="mb-3 text-sm text-pronto-gray-600">
        최소 1시간 ~ 최대 24시간 이용 가능
      </div>
      
      {/* 휴무일 메시지 */}
      {operatingHours.isClosed && operatingHours.message && (
        <div className="mb-3 p-3 bg-pronto-gray-100 border border-pronto-gray-300 rounded-md text-pronto-gray-700">
          {operatingHours.message}
        </div>
      )}
      
      {/* 시간 선택 영역 - TimeSlotGrid 컴포넌트 사용 */}
      <TimeSlotGrid 
        timeSlots={timeSlots}
        selectedSlots={selectedSlots}
        onSlotClick={handleSlotClick}
        loading={loading}
        currentTime={currentTime}
      />
      
      {/* 색상 범례 */}
      <div className="flex gap-4 mt-4 text-xs text-pronto-gray-600">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-pronto-primary rounded-sm mr-1"></div>
          <span>선택됨</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-[#C0C2C5] rounded-sm mr-1"></div>
          <span>예약 불가</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-[#F3F4F6] border border-pronto-gray-200 rounded-sm mr-1"></div>
          <span>예약 가능</span>
        </div>
      </div>
      
      {/* 선택 정보 요약 */}
      {selectedSlots.length > 0 && (
        <div className="mt-4 p-3 bg-pronto-gray-50 border border-pronto-gray-200 rounded-md">
          <div className="text-sm font-medium">선택한 시간</div>
          <div className="flex flex-wrap gap-2 mt-1">
            {selectedSlots.length > 0 && (
              <div className="text-sm">
                {selectedSlots.sort().length > 0 && (
                  <>
                    <span className="font-medium">{selectedSlots.sort()[0]}</span>
                    <span> ~ </span>
                    <span className="font-medium">
                      {(() => {
                        const lastSlot = selectedSlots.sort()[selectedSlots.length - 1];
                        const [hours, minutes] = lastSlot.split(":").map(Number);
                        let endHours = hours;
                        let endMinutes = minutes + 30;
                        
                        if (endMinutes >= 60) {
                          endHours += 1;
                          endMinutes -= 60;
                        }
                        
                        return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
                      })()}
                    </span>
                    <span className="ml-2">
                      (총 {selectedSlots.length * 30 / 60} 시간)
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 