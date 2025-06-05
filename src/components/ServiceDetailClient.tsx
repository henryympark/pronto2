// src/components/ServiceDetailClient.tsx 리팩토링 버전

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
import { ContentContainer } from '@/components/layout/ContentContainer';

// 섹션 래퍼 컴포넌트 추가
interface SectionWrapperProps {
  children: React.ReactNode;
  variant?: 'white' | 'gray';
  className?: string;
}

function SectionWrapper({ children, variant = 'white', className = '' }: SectionWrapperProps) {
  const bgClass = variant === 'gray' ? 'bg-gray-50' : 'bg-white';
  
  return (
    <div className={`${bgClass} ${className}`}>
      <ContentContainer noPadding noShadow>
        <div className="py-6">
          {children}
        </div>
      </ContentContainer>
    </div>
  );
}

// 확장된 서비스 타입 (서버에서 전달받은 통합 데이터)
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
  const { user } = useAuth();
  
  // 현재 표시 중인 월 상태
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // 서버에서 전달받은 휴무일 데이터 사용
  const holidays = useMemo(() => service.holidays || [], [service.holidays]);
  
  // 운영시간 정보도 서버 데이터 활용
  const operatingHoursMap = useMemo(() => {
    const map = new Map<number, { start: string; end: string; isClosed: boolean }>();
    (service.operating_hours || []).forEach(oh => {
      map.set(oh.day_of_week, {
        start: oh.start_time.substring(0, 5),
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
    preloadedOperatingHours: operatingHoursMap
  });
  
  // 서비스를 스튜디오 형태로 변환
  const studioData: Studio = useMemo(() => {
    const defaultHours = operatingHoursMap.get(1) || { start: "09:00", end: "18:00", isClosed: false };
    
    return {
      id: service.id,
      name: service.name,
      description: service.description || undefined,
      images: service.image_url ? [service.image_url] : [],
      address: service.location || "주소 정보 없음",
      region: "서울",
      district: "강남구",
      phone: undefined,
      email: undefined,
      website: undefined,
      rating: service.average_rating,
      priceRange: {
        min: service.price_per_hour,
        max: service.price_per_hour,
      },
      amenities: [],
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

  // 초기 날짜 설정
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(new Date());
    }
  }, [selectedDate, setSelectedDate]);

  // 날짜 선택 핸들러
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (!date) {
      setSelectedDate(null);
      return;
    }
    
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

  // 시간 범위 변경 핸들러
  const handleTimeRangeChange = useCallback((startTime: string, endTime: string, durationHours: number, price: number) => {
    setSelectedTimeRange({
      start: startTime,
      end: endTime,
      duration: durationHours,
      price: price
    });
  }, [setSelectedTimeRange]);
  
  // 월 변경 핸들러
  const handleMonthChange = useCallback(async (newMonth: Date) => {
    setCurrentMonth(newMonth);
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 이미지 갤러리 - 흰색 배경 */}
      <div className="bg-white">
        <ContentContainer noPadding noGutter noShadow>
          <StudioImageGallery studio={studioData} />
        </ContentContainer>
      </div>
      
      {/* 기본 정보 - 회색 배경 */}
      <SectionWrapper variant="gray">
        <StudioHeader studio={studioData} />
      </SectionWrapper>
      
      {/* 탭 네비게이션 - 흰색 배경 */}
      <SectionWrapper variant="white">
        <StudioTabs studio={studioData} />
      </SectionWrapper>
      
      {/* 날짜 선택 - 회색 배경 */}
      <SectionWrapper variant="gray">
        <h3 className="text-lg font-semibold mb-4">날짜 선택</h3>
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleDateSelect}
            onMonthChange={handleMonthChange}
            className="rounded-md border bg-white"
            disabled={(date) =>
              date < new Date() || date < new Date("1900-01-01")
            }
          />
        </div>
      </SectionWrapper>

      {/* 시간 선택 - 흰색 배경 */}
      <SectionWrapper variant="white">
        <h3 className="text-lg font-semibold mb-4">시간 선택</h3>
        <TimeRangeSelector 
          serviceId={service.id}
          selectedDate={selectedDate}
          onTimeRangeChange={handleTimeRangeChange}
          pricePerHour={service.price_per_hour}
        />
      </SectionWrapper>
      
      {/* 예약 정보 - 회색 배경 */}
      <SectionWrapper variant="gray">
        <h3 className="text-lg font-semibold mb-4">예약 정보</h3>
        <BookingForm 
          serviceId={service.id} 
          onReservationComplete={() => {
            console.log('[ServiceDetailClient] 예약 완료 - 시간슬라이더 새로고침');
            refetchAvailableTimes();
          }}
        />
      </SectionWrapper>
    </div>
  );
}