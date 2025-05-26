"use client";

import { useEffect, useMemo } from "react";
import { Service } from "@/types/services";
import { useStudioDetailStore } from "@/domains/studio/stores/studioDetailStore";
import { StudioHeader } from "@/domains/studio/components";
import { StudioImageGallery } from "@/domains/studio/components";
import { StudioTabs } from "@/domains/studio/components";
import { BookingForm } from "@/domains/booking/components";
import { TimeRangeSelector } from "@/domains/booking/components";
import type { Studio } from "@/domains/studio/types";

interface ServiceDetailClientProps {
  service: Service;
}

export default function ServiceDetailClient({ service }: ServiceDetailClientProps) {
  const { setStudio } = useStudioDetailStore();
  
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
          <div className="lg:sticky lg:top-6 space-y-6">
            {/* 예약 시간 선택 */}
            <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-4">예약 시간 선택</h3>
              <TimeRangeSelector />
            </div>
            
            {/* 예약 폼 */}
            <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-4">예약 정보</h3>
              <BookingForm serviceId={service.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 