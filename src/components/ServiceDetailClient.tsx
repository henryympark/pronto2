"use client";

import { useEffect, useMemo, useCallback } from "react";
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

interface ServiceDetailClientProps {
  service: Service;
}

export default function ServiceDetailClient({ service }: ServiceDetailClientProps) {
  const { setStudio } = useStudioDetailStore();
  const { selectedDate, setSelectedDate, setSelectedTimeRange } = useReservationStore();
  const { toast } = useToast();
  
  // 🚀 NEW: 임시 저장 복원을 위한 AuthContext 훅 추가
  const { user } = useAuth();
  
  // 서비스를 스튜디오 형태로 변환
  const studioData: Studio = useMemo(() => ({
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
    operatingHours: {
      monday: { open: "09:00", close: "18:00" },
      tuesday: { open: "09:00", close: "18:00" },
      wednesday: { open: "09:00", close: "18:00" },
      thursday: { open: "09:00", close: "18:00" },
      friday: { open: "09:00", close: "18:00" },
      saturday: { open: "09:00", close: "18:00" },
      sunday: null,
    },
    availability: true,
    createdAt: service.created_at,
    updatedAt: service.updated_at,
  }), [service]);
  
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

  // 로그인된 사용자만 예약 가능한 간단한 UX
  
  // 날짜 선택 핸들러
  const handleDateSelect = useCallback((date: Date | undefined) => {
    setSelectedDate(date || null);
  }, [setSelectedDate]);

  // 시간 범위 변경 핸들러 - useCallback으로 메모이제이션
  const handleTimeRangeChange = useCallback((startTime: string, endTime: string, durationHours: number, price: number) => {
    // 현재 상태와 비교해서 실제로 변경된 경우만 업데이트
    setSelectedTimeRange({
      start: startTime,
      end: endTime,
      duration: durationHours,
      price: price
    });
  }, [setSelectedTimeRange]);
  
  return (
    <div>
      {/* 반응형 레이아웃: lg 이상에서는 2단, 이하에서는 1단 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* 왼쪽 영역 (정보) - lg 이상에서 2칸 차지 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 대표 이미지 영역 */}
          <StudioImageGallery studio={studioData} />
          
          {/* 기본 정보 카드 */}
          <StudioHeader studio={studioData} />
          
          {/* 탭 네비게이션 */}
          <StudioTabs studio={studioData} />
        </div>
        
        {/* 오른쪽 영역 (예약) - lg 이상에서 1칸 차지, 스티키 */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-4 lg:space-y-6">
            {/* 날짜 선택 */}
            <div className="p-4 lg:p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-3 lg:mb-4">날짜 선택</h3>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={handleDateSelect}
                  className="rounded-md w-full max-w-sm"
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </div>
            </div>

            {/* 예약 시간 선택 */}
            <div className="p-4 lg:p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-3 lg:mb-4">시간 선택</h3>
              <TimeRangeSelector 
                serviceId={service.id}
                selectedDate={selectedDate}
                onTimeRangeChange={handleTimeRangeChange}
                pricePerHour={service.price_per_hour}
              />
            </div>
            
            {/* 예약 폼 */}
            <div data-section="reservation" className="p-4 lg:p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-3 lg:mb-4">예약 정보</h3>
              <BookingForm serviceId={service.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 