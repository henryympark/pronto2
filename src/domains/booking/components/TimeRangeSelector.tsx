"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/utils";

import { format } from "date-fns";
import { DEFAULT_TIMEZONE } from "@/constants/region";
import { TIME_SLOT_INTERVAL } from "@/constants/time";
import TimeSlotGrid from "./TimeSlotGrid";
import { TimeSlot } from "@/types";
import { useAvailableTimes } from "../hooks/useAvailableTimes";

// 타입 정의
interface TimeRangeSelectorProps {
  serviceId: string;
  selectedDate: Date | null;
  onTimeRangeChange: (startTime: string, endTime: string, durationHours: number, price: number) => void;
  pricePerHour: number;
  initialStartTime?: string;
  initialEndTime?: string;
}

export default function TimeRangeSelector({
  serviceId,
  selectedDate,
  onTimeRangeChange,
  pricePerHour,
  initialStartTime,
  initialEndTime
}: TimeRangeSelectorProps) {
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [initialTimeSet, setInitialTimeSet] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // React Query 훅 사용
  const {
    timeSlots,
    operatingHours,
    currentTime,
    isLoading,
    isError,
    error
  } = useAvailableTimes({
    serviceId,
    selectedDate,
    prefetchDays: 7 // 앞뒤 7일씩 프리로딩 (총 15일)
  });

  // 날짜가 변경될 때 선택된 슬롯 초기화
  useEffect(() => {
    if (selectedDate) {
      setSelectedSlots([]);
      setInitialTimeSet(false);
    }
  }, [selectedDate]);

  // 시간 슬롯 클릭 핸들러
  const handleSlotClick = useCallback((slot: TimeSlot) => {
    if (!selectedDate || slot.status === 'unavailable') {
      return;
    }

    let newSelectedSlots: string[] = [];

    if (selectedSlots.includes(slot.time)) {
      if (selectedSlots.length <= 2) {
        setSelectedSlots([]);
        return;
      }

      const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const sortedSlotMinutes = selectedSlots.map(timeToMinutes).sort((a, b) => a - b);
      const slotMinutes = timeToMinutes(slot.time);
      
      if (slotMinutes === sortedSlotMinutes[0] || slotMinutes === sortedSlotMinutes[sortedSlotMinutes.length - 1]) {
        newSelectedSlots = selectedSlots.filter(time => time !== slot.time);
      } else {
        setSelectedSlots([]);
        return;
      }
    } else {
      const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      };

      if (selectedSlots.length === 0) {
        // 첫 번째 슬롯 선택 시 자동으로 1시간(2슬롯) 선택
        const slotMinutes = timeToMinutes(slot.time);
        const autoSelectSlots = [slot.time];
        
        // 다음 슬롯 자동 선택 (1시간 완성)
        const nextSlotMinutes = slotMinutes + TIME_SLOT_INTERVAL;
        const nextSlotHours = Math.floor(nextSlotMinutes / 60);
        const nextSlotMins = nextSlotMinutes % 60;
        const nextSlotTime = `${nextSlotHours.toString().padStart(2, '0')}:${nextSlotMins.toString().padStart(2, '0')}`;
        
        const nextSlot = timeSlots.find(s => s.time === nextSlotTime);
        if (nextSlot && nextSlot.status === 'available') {
          autoSelectSlots.push(nextSlotTime);
        }
        
        newSelectedSlots = autoSelectSlots;
      } else {
        // 연속 슬롯 선택 로직 개선
        const allSlots = [...selectedSlots, slot.time];
        const sortedSlotMinutes = allSlots.map(timeToMinutes).sort((a, b) => a - b);
        
        // 연속성 확인
        let isConsecutive = true;
        for (let i = 1; i < sortedSlotMinutes.length; i++) {
          if (sortedSlotMinutes[i] - sortedSlotMinutes[i - 1] !== TIME_SLOT_INTERVAL) {
            isConsecutive = false;
            break;
          }
        }
        
        if (isConsecutive) {
          newSelectedSlots = allSlots.sort();
        } else {
          // 연속되지 않는 경우 새로운 시간부터 1시간 자동 선택
          const autoSelectSlots = [slot.time];
          const nextSlotMinutes = timeToMinutes(slot.time) + TIME_SLOT_INTERVAL;
          const nextSlotHours = Math.floor(nextSlotMinutes / 60);
          const nextSlotMins = nextSlotMinutes % 60;
          const nextSlotTime = `${nextSlotHours.toString().padStart(2, '0')}:${nextSlotMins.toString().padStart(2, '0')}`;
          
          const nextSlot = timeSlots.find(s => s.time === nextSlotTime);
          if (nextSlot && nextSlot.status === 'available') {
            autoSelectSlots.push(nextSlotTime);
          }
          
          newSelectedSlots = autoSelectSlots;
        }
      }
    }

    if (newSelectedSlots.length > 48) {
      return;
    }

    setSelectedSlots(newSelectedSlots);
  }, [selectedDate, selectedSlots, timeSlots]);

  // 선택된 시간이 변경될 때마다 부모 컴포넌트에 알림
  useEffect(() => {
    if (selectedSlots.length > 0) {
      const sortedSlots = [...selectedSlots].sort((a, b) => {
        const [aHours, aMinutes] = a.split(":").map(Number);
        const [bHours, bMinutes] = b.split(":").map(Number);
        return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
      });
      
      const startTime = sortedSlots[0];
      const lastSlot = sortedSlots[sortedSlots.length - 1];
      const [lastHours, lastMinutes] = lastSlot.split(":").map(Number);
      const endMinutes = lastHours * 60 + lastMinutes + TIME_SLOT_INTERVAL;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
      
      const durationHours = selectedSlots.length * (TIME_SLOT_INTERVAL / 60);
      const totalPrice = durationHours * pricePerHour;
      
      onTimeRangeChange(startTime, endTime, durationHours, totalPrice);
    } else {
      onTimeRangeChange("", "", 0, 0);
    }
  }, [selectedSlots, pricePerHour, onTimeRangeChange]);

  // 초기 시간 설정
  useEffect(() => {
    if (
      !initialTimeSet &&
      initialStartTime &&
      initialEndTime &&
      timeSlots.length > 0 &&
      !isLoading
    ) {
      const startHour = parseInt(initialStartTime.split(":")[0]);
      const startMinute = parseInt(initialStartTime.split(":")[1]);
      const endHour = parseInt(initialEndTime.split(":")[0]);
      const endMinute = parseInt(initialEndTime.split(":")[1]);

      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      const initialSlots: string[] = [];
      for (let minutes = startMinutes; minutes < endMinutes; minutes += TIME_SLOT_INTERVAL) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const timeString = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
        
        const slot = timeSlots.find(s => s.time === timeString);
        if (slot && slot.status === 'available') {
          initialSlots.push(timeString);
        }
      }

      if (initialSlots.length > 0) {
        setSelectedSlots(initialSlots);
      }
      setInitialTimeSet(true);
    }
  }, [initialStartTime, initialEndTime, timeSlots, initialTimeSet, isLoading]);

  // 에러 상태 처리
  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-700 text-sm">
          시간 정보를 불러오는 중 오류가 발생했습니다.
        </p>
        <p className="text-red-600 text-xs mt-1">
          {error instanceof Error ? error.message : '알 수 없는 오류'}
        </p>
      </div>
    );
  }

  // 운영 시간 외 메시지 표시
  if (operatingHours.isClosed && operatingHours.message) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
        <p className="text-gray-700 text-sm">{operatingHours.message}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* 시간 선택 그리드 */}
      <TimeSlotGrid
        timeSlots={timeSlots}
        selectedSlots={selectedSlots}
        onSlotClick={handleSlotClick}
        loading={isLoading}
        currentTime={currentTime}
      />

      {/* 선택된 시간 정보 표시 */}
      {selectedSlots.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-blue-900">
                선택된 시간: {selectedSlots.length * (TIME_SLOT_INTERVAL / 60)}시간
              </p>
              <p className="text-xs text-blue-700">
                {selectedSlots[0]} ~ {(() => {
                  const lastSlot = selectedSlots[selectedSlots.length - 1];
                  const [hours, minutes] = lastSlot.split(":").map(Number);
                  const endMinutes = hours * 60 + minutes + TIME_SLOT_INTERVAL;
                  const endHours = Math.floor(endMinutes / 60);
                  const endMins = endMinutes % 60;
                  return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
                })()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-blue-900">
                {(selectedSlots.length * (TIME_SLOT_INTERVAL / 60) * pricePerHour).toLocaleString()}원
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}