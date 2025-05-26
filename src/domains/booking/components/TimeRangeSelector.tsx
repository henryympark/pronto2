"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/utils";
import { useToast } from "@/shared/hooks/useToast";
import { format } from "date-fns";
import { DEFAULT_TIMEZONE } from "@/constants/region";
import { TIME_SLOT_INTERVAL } from "@/constants/time";
import { API_PATHS } from "@/constants/apiPaths";
import TimeSlotGrid from "./TimeSlotGrid";
import { TimeSlot } from "@/types";

// 타입 정의
interface TimeRangeSelectorProps {
  serviceId: string;
  selectedDate: Date | null;
  onTimeRangeChange: (startTime: string, endTime: string, durationHours: number, price: number) => void;
  pricePerHour: number;
  initialStartTime?: string;
  initialEndTime?: string;
}

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
  const [operatingHours, setOperatingHours] = useState({
    start: "09:00",
    end: "22:00",
    isClosed: false,
    message: null
  });
  const [cachedResults, setCachedResults] = useState<CachedTimeSlots[]>([]);
  const [initialTimeSet, setInitialTimeSet] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 날짜가 변경될 때 시간 슬롯 정보 조회
  useEffect(() => {
    if (!selectedDate || !serviceId) return;
    
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    
    if (selectedSlots.length > 0) {
      setSelectedSlots([]);
    }
    
    const cachedData = cachedResults.find(item => item.date === dateString);
    
    if (cachedData) {
      setTimeSlots(cachedData.timeSlots);
      setOperatingHours(cachedData.operatingHours);
      return;
    }
    
    const fetchAvailableTimes = async () => {
      setLoading(true);
      setSelectedSlots([]);
      
      try {
        const response = await fetch(API_PATHS.SERVICES.AVAILABLE_TIMES(serviceId) + `?date=${dateString}`);
        
        if (!response.ok) {
          throw new Error(`API 응답 오류: ${response.status}`);
        }
        
        const data = await response.json();
        
        setCurrentTime(data.currentTime);
        
        const newOperatingHours = {
          start: data.operatingStartTime,
          end: data.operatingEndTime,
          isClosed: data.isClosed || false,
          message: data.message || null
        };
        
        setOperatingHours(newOperatingHours);

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
        
        setTimeSlots(allTimeSlots);
        
        setCachedResults(prev => {
          const filteredCache = prev.filter(item => item.date !== dateString);
          const newCache = [...filteredCache, {
            date: dateString,
            timeSlots: allTimeSlots,
            operatingHours: newOperatingHours
          }];
          
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
        const slotMinutes = timeToMinutes(slot.time);
        const nextSlotMinutes = slotMinutes + TIME_SLOT_INTERVAL;
        
        const nextSlotHours = Math.floor(nextSlotMinutes / 60);
        const nextSlotMins = nextSlotMinutes % 60;
        const nextSlotTime = `${nextSlotHours.toString().padStart(2, '0')}:${nextSlotMins.toString().padStart(2, '0')}`;
        
        const nextSlot = timeSlots.find(s => s.time === nextSlotTime);
        
        if (nextSlot && nextSlot.status === 'available') {
          newSelectedSlots = [slot.time, nextSlotTime];
        } else {
          newSelectedSlots = [slot.time];
        }
      } else {
        // 기존 선택 로직 (간소화)
        newSelectedSlots = [...selectedSlots, slot.time].sort();
      }
    }

    if (newSelectedSlots.length > 48) {
      toast({
        title: "최대 시간 초과",
        description: "최대 24시간까지만 예약 가능합니다.",
        variant: "destructive"
      });
      return;
    }

    setSelectedSlots(newSelectedSlots);
  }, [selectedDate, selectedSlots, timeSlots, toast]);

  // 선택된 시간이 변경될 때마다 부모 컴포넌트에 알림 - onTimeRangeChange 의존성 제거
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
      
      let endHours = lastHours;
      let endMinutes = lastMinutes + 30;
      
      if (endMinutes >= 60) {
        endHours += 1;
        endMinutes -= 60;
      }

      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
      const duration = selectedSlots.length * 0.5;
      const price = Math.round(duration * pricePerHour);
      
      onTimeRangeChange(startTime, endTime, duration, price);
    } else {
      onTimeRangeChange("", "", 0, 0);
    }
  }, [selectedSlots, pricePerHour]);

  return (
    <div className="w-full">
      <div className="mb-3 text-sm text-pronto-gray-600">
        최소 1시간 ~ 최대 24시간 이용 가능
      </div>
      
      {operatingHours.isClosed && operatingHours.message && (
        <div className="mb-3 p-3 bg-pronto-gray-100 border border-pronto-gray-300 rounded-md text-pronto-gray-700">
          {operatingHours.message}
        </div>
      )}
      
      <TimeSlotGrid 
        timeSlots={timeSlots}
        selectedSlots={selectedSlots}
        onSlotClick={handleSlotClick}
        loading={loading}
        currentTime={currentTime}
      />
      
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
      
      {selectedSlots.length > 0 && (
        <div className="mt-4 p-3 bg-pronto-gray-50 border border-pronto-gray-200 rounded-md">
          <div className="text-sm font-medium">선택한 시간</div>
          <div className="text-sm mt-1">
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
          </div>
        </div>
      )}
    </div>
  );
}