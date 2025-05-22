"use client";

import { useEffect, useCallback, memo } from "react";
import { Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Service } from "@/types/services";
import { useReservationStore } from "../stores/reservationStore";
import TimeRangeSelector from "./TimeRangeSelector";
import BookingForm from "./BookingForm";

interface ReservationSidebarProps {
  service: Service;
}

// 메모이제이션된 캘린더 컴포넌트
const MemoizedCalendar = memo(Calendar);

export default function ReservationSidebar({ service }: ReservationSidebarProps) {
  const { 
    selectedDate, 
    maxDate, 
    selectedTimeRange, 
    setSelectedDate, 
    setSelectedTimeRange 
  } = useReservationStore();
  
  // 컴포넌트 마운트 시 오늘 날짜 선택 (이미 선택된 날짜가 없는 경우)
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(new Date());
    }
  }, [selectedDate, setSelectedDate]);
  
  // 날짜 선택 핸들러
  const handleDateChange = (date: Date | null) => {
    if (date) {
      // 날짜가 변경되면 시간 범위 초기화
      setSelectedTimeRange({
        start: "",
        end: "",
        duration: 0,
        price: 0
      });
      // 새 날짜 설정
      setSelectedDate(date);
    }
  };
  
  // 시간 범위 선택 핸들러 (useCallback으로 최적화)
  const handleTimeRangeChange = useCallback((startTime: string, endTime: string, duration: number, price: number) => {
    setSelectedTimeRange({
      start: startTime,
      end: endTime,
      duration,
      price
    });
  }, [setSelectedTimeRange]);
  
  return (
    <div className="border rounded-lg p-4 shadow-sm bg-white lg:sticky lg:top-20">
      <h2 className="text-xl font-bold mb-6">예약하기</h2>
      
      {/* 캘린더 영역 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4">날짜 선택</h3>
        <div className="flex flex-col items-center">
          <MemoizedCalendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateChange}
            disabled={{ before: new Date(), after: maxDate }}
            className="rounded-md"
          />
        </div>
      </div>
      
      {/* 시간 슬롯 선택 영역 */}
      <div className="mt-6">
        <h3 className="flex items-center text-lg font-medium mb-3">
          <Clock className="h-5 w-5 mr-2" />
          시간 선택
        </h3>
        
        <TimeRangeSelector
          serviceId={service.id}
          selectedDate={selectedDate}
          onTimeRangeChange={handleTimeRangeChange}
          pricePerHour={service.price_per_hour}
        />
        
      </div>
      
      {/* 예약 폼 */}
      <div className="mt-6">
        <BookingForm serviceId={service.id} />
      </div>
    </div>
  );
} 