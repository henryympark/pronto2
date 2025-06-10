"use client";

import { useRef, memo, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/utils";
import { TimeSlot } from "@/types";

interface TimeSlotGridProps {
  timeSlots: TimeSlot[];
  selectedSlots: string[];
  onSlotClick: (slot: TimeSlot) => void;
  currentTime?: string; // 현재 시간 추가 (API에서 제공하는 현재 시간)
}

// 메모이제이션을 통해 불필요한 리렌더링 방지
const TimeSlotGrid = memo(function TimeSlotGrid({
  timeSlots,
  selectedSlots,
  onSlotClick,
  currentTime
}: TimeSlotGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 현재 시간으로 자동 스크롤 처리
  useEffect(() => {
    if (!scrollContainerRef.current || !timeSlots.length) return;
    
    // 현재 시간이 제공되지 않은 경우 브라우저의 현재 시간 사용
    const now = currentTime || new Date().toTimeString().substring(0, 5);
    console.log('[TimeSlotGrid] 현재 시간 기준 스크롤 시도:', now);
    
    // 현재 시간과 가장 가까운 슬롯 찾기
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const nowMinutes = timeToMinutes(now);
    
    // 가장 가까운 슬롯 인덱스 찾기
    let closestIndex = 0;
    let minDiff = Infinity;
    
    timeSlots.forEach((slot, index) => {
      const slotMinutes = timeToMinutes(slot.time);
      const diff = Math.abs(slotMinutes - nowMinutes);
      
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = index;
      }
    });
    
    // 현재 시간 슬롯으로 스크롤 (약간 왼쪽으로 오프셋 주기)
    const container = scrollContainerRef.current;
    const slotWidth = 33; // 32px 슬롯 너비 + 1px 간격
    const containerWidth = container.clientWidth;
    const scrollPosition = Math.max(0, (closestIndex * slotWidth) - (containerWidth / 3));
    
    // 부드러운 스크롤로 이동
    setTimeout(() => {
      container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      console.log('[TimeSlotGrid] 현재 시간으로 스크롤 완료:', {
        closestTime: timeSlots[closestIndex]?.time,
        scrollPosition,
        closestIndex
      });
    }, 300);
  }, [timeSlots, currentTime]);

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

  // 슬롯 상태에 따른 클래스 결정
  const getSlotClass = (slot: TimeSlot) => {
    if (selectedSlots.includes(slot.time)) {
      return "bg-pronto-primary text-white";
    }
    
    switch (slot.status) {
      case 'unavailable':
        return "bg-[#C0C2C5] cursor-not-allowed";
      case 'reserved':
        return "bg-[#C0C2C5] cursor-not-allowed"; // 'reserved'도 'unavailable'과 동일하게 처리
      case 'loading':
        return "bg-gray-200 animate-pulse cursor-not-allowed"; // 로딩 중 상태
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

  // 시간 슬롯이 없는 경우 간단한 메시지 표시
  if (!timeSlots.length) {
    return (
      <div className="text-center py-8">
        <div className="text-sm text-gray-500">
          선택한 날짜의 예약 가능 시간을 확인하는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[468px] mx-auto">
      {/* 좌우 스크롤 버튼 - 모바일에서 더 큰 터치 영역 */}
      <Button
        variant="outline"
        size="icon"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 lg:h-8 lg:w-8 sm:h-10 sm:w-10 rounded-full bg-white/90 shadow-md touch-manipulation"
        onClick={() => handleScroll('left')}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 lg:h-8 lg:w-8 sm:h-10 sm:w-10 rounded-full bg-white/90 shadow-md touch-manipulation"
        onClick={() => handleScroll('right')}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      <div className="w-full overflow-hidden border border-white rounded-md">
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* CSS Grid 기반 시간 선택 UI */}
          <div 
            className="grid min-w-max"
            style={{ 
              gridTemplateColumns: `repeat(${timeSlots.length}, 32px)`,
              gridTemplateRows: 'auto 1fr',
              columnGap: '1px',
              backgroundColor: 'white',
            }}
          >
            {/* 첫 번째 행: 시간 눈금 및 레이블 영역 (회색 배경) */}
            <div className="col-span-full bg-white relative h-10 border-b border-white">
              {timeSlots.map((slot, index) => {
                // 32px 슬롯 너비 + 1px 간격을 고려한 정확한 위치 계산
                const leftPosition = index * 32 + index * 1;
                
                return (
                  <div
                    key={`tick-${slot.time}`}
                    className="absolute top-0 bottom-0"
                    style={{ left: `${leftPosition}px` }}
                  >
                    {/* 정각 시간 눈금과 레이블 */}
                    {slot.time.endsWith(':00') && (
                      <>
                        <div className="absolute bottom-0 left-0 w-[1px] h-6 bg-pronto-gray-400"></div>
                        <div className="absolute bottom-7 left-1 text-[10px] text-pronto-gray-600 whitespace-nowrap">
                          {formatTimeLabel(slot.time)}
                        </div>
                      </>
                    )}
                    
                    {/* 30분 시간 눈금 (30분 텍스트 추가) */}
                    {slot.time.endsWith(':30') && (
                      <>
                        <div className="absolute bottom-0 left-0 w-[1px] h-3 bg-pronto-gray-300"></div>
                        <div className="absolute bottom-4 left-1 text-[10px] text-pronto-gray-600 whitespace-nowrap">
                          30분
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* 두 번째 행: 시간 슬롯 영역 (흰색 배경) */}
            <div className="col-span-full grid grid-flow-col gap-[1px]" style={{ gridTemplateColumns: `repeat(${timeSlots.length}, 32px)` }}>
              {timeSlots.map((slot, index) => (
                <button
                  key={`slot-${slot.time}`}
                  type="button"
                  onClick={() => onSlotClick(slot)}
                  disabled={slot.status === 'unavailable'}
                  className={cn(
                    "h-16 transition-colors touch-manipulation active:scale-95 rounded-md",
                    getSlotClass(slot),
                    slot.status === 'available' && !selectedSlots.includes(slot.time) ? "hover:bg-pronto-gray-200 cursor-pointer active:bg-pronto-gray-300" : ""
                  )}
                  title={slot.time}
                ></button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default TimeSlotGrid;
