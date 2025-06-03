"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { Service } from "@/types/services";
import { useStudioDetailStore } from "@/domains/studio/stores/studioDetailStore";
import { StudioHeader } from "@/domains/studio/components";
import { StudioImageGallery } from "@/domains/studio/components";
import { StudioTabs } from "@/domains/studio/components";
import { BookingForm } from "@/domains/booking/components";
import { TimeRangeSelector } from "@/domains/booking/components";
import { useReservationStore } from "@/domains/booking/stores";
import { Calendar } from "@/components/ui/calendar";
import type { Studio } from "@/domains/studio/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/shared/hooks/useToast";
import { useAvailableTimes } from "@/domains/booking/hooks/useAvailableTimes";

// 🚀 확장된 서비스 타입 (서버에서 전달받은 통합 데이터)
interface ServiceWithDetails extends Service {
  operating_hours: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_closed: boolean;
  }>;
  holidays: Array<{
    id: string;
    holiday_date: string;
    description?: string;
  }>;
}

interface ServiceDetailClientProps {
  service: ServiceWithDetails;
}

export default function ServiceDetailClient({ service }: ServiceDetailClientProps) {
  const { setStudio } = useStudioDetailStore();
  const { selectedDate, setSelectedDate, setSelectedTimeRange } = useReservationStore();
  const { toast } = useToast();
  
  // 🚀 NEW: 임시 저장 복원을 위한 AuthContext 훅 추가
  const { user } = useAuth();
  
  // 현재 표시 중인 월 상태
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // 🎯 서버에서 전달받은 휴무일 데이터 사용 (API 호출 제거)
  const holidays = useMemo(() => service.holidays || [], [service.holidays]);
  
  console.log(`[ServiceDetailClient] 서버에서 받은 통합 데이터:`, {
    serviceId: service.id,
    operatingHoursCount: service.operating_hours?.length || 0,
    holidaysCount: holidays.length,
    holidays: holidays.map(h => h.holiday_date)
  });
  
  // 🚀 운영시간 정보도 서버 데이터 활용
  const operatingHoursMap = useMemo(() => {
    const map = new Map<number, { start: string; end: string; isClosed: boolean }>();
    (service.operating_hours || []).forEach(oh => {
      map.set(oh.day_of_week, {
        start: oh.start_time.substring(0, 5), // HH:MM:SS -> HH:MM
        end: oh.end_time.substring(0, 5),
        isClosed: oh.is_closed
      });
    });
    return map;
  }, [service.operating_hours]);
  
  // 시간 슬라이더 실시간 반영을 위한 useAvailableTimes 훅
  const { refetch: refetchAvailableTimes } = useAvailableTimes({
    serviceId: service.id,
    selectedDate: selectedDate,
    // 🔥 서버 데이터를 훅에 전달하여 중복 쿼리 방지
    preloadedOperatingHours: operatingHoursMap
  });
  
  // 서비스를 스튜디오 형태로 변환 - 운영시간 정보 포함
  const studioData: Studio = useMemo(() => {
    // 기본 운영시간 설정 (첫 번째 요일의 시간을 기준으로, 없으면 기본값)
    const defaultHours = operatingHoursMap.get(1) || { start: "09:00", end: "18:00", isClosed: false };
    
    return {
      id: service.id,
      name: service.name,
      description: service.description || undefined,
      images: service.image_url ? [service.image_url] : [],
      address: service.location || "주소 정보 없음",
      region: "서울", // 기본값
      district: "강남구", // 기본값
      phone: undefined,
      email: undefined,
      website: undefined,
      rating: service.average_rating,
      priceRange: {
        min: service.price_per_hour,
        max: service.price_per_hour,
      },
      amenities: [],
      // 🎯 서버에서 받은 운영시간 데이터 활용
      operatingHours: {
        monday: operatingHoursMap.get(1) ? { 
          open: operatingHoursMap.get(1)!.start, 
          close: operatingHoursMap.get(1)!.end 
        } : { open: "09:00", close: "18:00" },
        tuesday: operatingHoursMap.get(2) ? { 
          open: operatingHoursMap.get(2)!.start, 
          close: operatingHoursMap.get(2)!.end 
        } : { open: "09:00", close: "18:00" },
        wednesday: operatingHoursMap.get(3) ? { 
          open: operatingHoursMap.get(3)!.start, 
          close: operatingHoursMap.get(3)!.end 
        } : { open: "09:00", close: "18:00" },
        thursday: operatingHoursMap.get(4) ? { 
          open: operatingHoursMap.get(4)!.start, 
          close: operatingHoursMap.get(4)!.end 
        } : { open: "09:00", close: "18:00" },
        friday: operatingHoursMap.get(5) ? { 
          open: operatingHoursMap.get(5)!.start, 
          close: operatingHoursMap.get(5)!.end 
        } : { open: "09:00", close: "18:00" },
        saturday: operatingHoursMap.get(6) ? { 
          open: operatingHoursMap.get(6)!.start, 
          close: operatingHoursMap.get(6)!.end 
        } : { open: "09:00", close: "18:00" },
        sunday: operatingHoursMap.get(0)?.isClosed ? null : operatingHoursMap.get(0) ? { 
          open: operatingHoursMap.get(0)!.start, 
          close: operatingHoursMap.get(0)!.end 
        } : null,
      },
      availability: true,
      createdAt: service.created_at,
      updatedAt: service.updated_at,
    };
  }, [service, operatingHoursMap]);
  
  // 스튜디오 데이터를 스토어에 저장
  useEffect(() => {
    setStudio(studioData);
  }, [studioData, setStudio]);

  // 초기 날짜 설정 (오늘 날짜)
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(new Date());
    }
  }, [selectedDate, setSelectedDate]);

  // 날짜 선택 핸들러 - 서버에서 받은 휴무일 데이터로 체크
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (!date) {
      setSelectedDate(null);
      return;
    }
    
    // 🎯 서버에서 받은 휴무일 데이터로 검증 (API 호출 없음)
    const dateString = date.toISOString().split('T')[0];
    const isHoliday = holidays.some(holiday => holiday.holiday_date === dateString);
    
    if (isHoliday) {
      toast({
        title: "휴무일입니다",
        description: "선택하신 날짜는 휴무일로 지정되어 예약이 불가능합니다.",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedDate(date);
  }, [setSelectedDate, holidays, toast]);

  // 시간 범위 변경 핸들러 - useCallback으로 메모이제이션
  const handleTimeRangeChange = useCallback((startTime: string, endTime: string, durationHours: number, price: number) => {
    setSelectedTimeRange({
      start: startTime,
      end: endTime,
      duration: durationHours,
      price: price
    });
  }, [setSelectedTimeRange]);
  
  // 🚀 월 변경 시 필요하면 추가 휴무일 로딩 (현재 월 외의 데이터)
  const handleMonthChange = useCallback(async (newMonth: Date) => {
    setCurrentMonth(newMonth);
    
    const newYear = newMonth.getFullYear();
    const newMonthNum = newMonth.getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1;
    
    // 현재 월이 아닌 경우에만 추가 데이터 로딩
    if (newYear !== currentYear || newMonthNum !== currentMonthNum) {
      console.log(`[ServiceDetailClient] 다른 월 휴무일 조회 필요: ${newYear}-${newMonthNum}`);
      // TODO: 필요시 추가 월의 휴무일 데이터 로딩 로직
      // 현재는 서버에서 받은 현재 월 데이터만 사용
    }
  }, []);
  
  return (
    <div className="w-full max-w-[500px] mx-auto px-4 py-6">
      {/* 단일 열 레이아웃 - 모바일 친화적 */}
      <div className="space-y-6">
        {/* 대표 이미지 영역 */}
        <StudioImageGallery studio={studioData} />
        
        {/* 기본 정보 카드 */}
        <StudioHeader studio={studioData} />
        
        {/* 탭 네비게이션 */}
        <StudioTabs studio={studioData} />
        
        {/* 날짜 선택 */}
        <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-4">날짜 선택</h3>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate || undefined}
              onSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
              className="rounded-md w-full max-w-sm"
              disabled={(date) => {
                // 과거 날짜 비활성화
                if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
                  return true;
                }
                
                // 🎯 서버에서 받은 휴무일 데이터로 체크 (빠른 로컬 검증)
                const dateString = date.toISOString().split('T')[0];
                return holidays.some(holiday => holiday.holiday_date === dateString);
              }}
              modifiers={{
                holiday: holidays.map(holiday => new Date(holiday.holiday_date))
              }}
              modifiersClassNames={{
                holiday: "bg-gray-100 text-gray-400 line-through"
              }}
            />
          </div>
          
          {/* 휴무일 안내 */}
          {holidays.length > 0 && (
            <div className="mt-3 text-sm text-gray-500 text-center">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 bg-gray-100 border rounded"></span>
                휴무일 (예약 불가)
              </span>
            </div>
          )}
        </div>

        {/* 예약 시간 선택 */}
        <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-4">시간 선택</h3>
          <TimeRangeSelector 
            serviceId={service.id}
            selectedDate={selectedDate}
            onTimeRangeChange={handleTimeRangeChange}
            pricePerHour={service.price_per_hour}
          />
        </div>
        
        {/* 예약 폼 */}
        <div data-section="reservation" className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-4">예약 정보</h3>
          <BookingForm 
            serviceId={service.id} 
            onReservationComplete={() => {
              console.log('[ServiceDetailClient] 예약 완료 - 시간슬라이더 새로고침');
              refetchAvailableTimes();
            }}
          />
        </div>
      </div>
    </div>
  );
} 