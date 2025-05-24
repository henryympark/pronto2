"use client";

import { useEffect } from "react";
import { Service } from "@/types/services";
import { useServiceDetailStore } from "@/features/service/stores/serviceDetailStore";
import ServiceHeader from "@/features/service/components/ServiceDetail/ServiceHeader";
import ServiceImageGallery from "@/features/service/components/ServiceDetail/ServiceImageGallery";
import ServiceTabs from "@/features/service/components/ServiceDetail/ServiceTabs";
import ReservationSidebar from "@/features/reservation/components/ReservationSidebar";

interface ServiceDetailClientProps {
  service: Service;
}

export default function ServiceDetailClient({ service }: ServiceDetailClientProps) {
  const { setService } = useServiceDetailStore();
  
  // 서비스 정보 스토어에 저장
  useEffect(() => {
    setService(service);
  }, [service, setService]);
  
  return (
    <div>
      {/* 반응형 레이아웃: lg 이상에서는 2단, 이하에서는 1단 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* 왼쪽 영역 (정보) - lg 이상에서 2칸 차지 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 대표 이미지 영역 */}
          <ServiceImageGallery 
            imageUrl={service.image_url || undefined}
            serviceName={service.name} 
          />
          
          {/* 기본 정보 카드 */}
          <ServiceHeader service={service} />
          
          {/* 탭 네비게이션 */}
          <ServiceTabs service={service} />
        </div>
        
        {/* 오른쪽 영역 (예약) - lg 이상에서 1칸 차지, 스티키 */}
        <div className="lg:col-span-1">
          <ReservationSidebar service={service} />
        </div>
      </div>
    </div>
  );
} 