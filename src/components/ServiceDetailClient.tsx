"use client";

import { useEffect } from "react";
import { Service } from "@/types/services";
import { useStudioDetailStore } from "@/domains/studio/stores/studioDetailStore";
import { StudioHeader } from "@/domains/studio/components";
import { StudioImageGallery } from "@/domains/studio/components";
import { StudioTabs } from "@/domains/studio/components";
// ReservationSidebar는 booking domain으로 이동했을 수 있음
// import ReservationSidebar from "@/domains/booking/components/ReservationSidebar";

interface ServiceDetailClientProps {
  service: Service;
}

export default function ServiceDetailClient({ service }: ServiceDetailClientProps) {
  const { setStudio } = useStudioDetailStore();
  
  // 서비스 정보 스토어에 저장
  useEffect(() => {
    setStudio(service);
  }, [service, setStudio]);
  
  return (
    <div>
      {/* 반응형 레이아웃: lg 이상에서는 2단, 이하에서는 1단 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* 왼쪽 영역 (정보) - lg 이상에서 2칸 차지 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 대표 이미지 영역 */}
          <StudioImageGallery 
            imageUrl={service.image_url || undefined}
            serviceName={service.name} 
          />
          
          {/* 기본 정보 카드 */}
          <StudioHeader service={service} />
          
          {/* 탭 네비게이션 */}
          <StudioTabs service={service} />
        </div>
        
        {/* 오른쪽 영역 (예약) - lg 이상에서 1칸 차지, 스티키 */}
        <div className="lg:col-span-1">
          {/* TODO: ReservationSidebar 컴포넌트 경로 확인 후 수정 */}
          <div className="p-4 border rounded-md">
            <p className="text-gray-500">예약 사이드바 구현 예정</p>
          </div>
        </div>
      </div>
    </div>
  );
} 
