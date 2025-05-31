import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { Service } from "@/types/services";
import ServiceDetailClient from "@/components/ServiceDetailClient";

// 통합된 서비스 데이터 타입
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

// 메타데이터 동적 생성
export async function generateMetadata({ params }: { params: Promise<{ serviceId: string }> }): Promise<Metadata> {
  const { serviceId } = await params;
  const serviceData = await getServiceWithDetails(serviceId);
  
  if (!serviceData) {
    return {
      title: "서비스를 찾을 수 없습니다",
      description: "요청하신 서비스 정보를 찾을 수 없습니다."
    };
  }
  
  return {
    title: `${serviceData.name} - Pronto 스튜디오`,
    description: serviceData.description || "프론토 스튜디오 예약 서비스",
    openGraph: {
      images: serviceData.image_url ? [serviceData.image_url] : []
    }
  };
}

// 🚀 최적화된 서비스 정보 통합 조회 함수
async function getServiceWithDetails(serviceId: string): Promise<ServiceWithDetails | null> {
  try {
    console.log(`[getServiceWithDetails] 통합 데이터 조회 시작: ${serviceId}`);
    
    // 현재 월 계산 (휴무일 조회용)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0);
    
    // 🔥 병렬 쿼리 실행 - 3개의 독립적인 쿼리를 동시에 실행
    const [serviceResult, operatingHoursResult, holidaysResult] = await Promise.all([
      // 1. 서비스 기본 정보
      supabaseServer
        .from("services")
        .select("*")
        .eq("slug", serviceId)
        .single(),
      
      // 2. 운영시간 정보 (모든 요일)
      supabaseServer
        .from("service_operating_hours")
        .select("day_of_week, start_time, end_time, is_closed")
        .eq("service_id", serviceId)
        .order("day_of_week", { ascending: true }),
      
      // 3. 현재 월 휴무일 정보
      supabaseServer
        .from("holidays")
        .select("id, holiday_date, description")
        .eq("service_id", serviceId)
        .gte("holiday_date", startDate.toISOString().split('T')[0])
        .lte("holiday_date", endDate.toISOString().split('T')[0])
        .order("holiday_date", { ascending: true })
    ]);

    // 에러 체크
    if (serviceResult.error) {
      console.error("서비스 조회 오류:", serviceResult.error);
      return null;
    }

    if (operatingHoursResult.error) {
      console.warn("운영시간 조회 오류:", operatingHoursResult.error);
    }

    if (holidaysResult.error) {
      console.warn("휴무일 조회 오류:", holidaysResult.error);
    }

    if (!serviceResult.data) {
      console.error(`서비스를 찾을 수 없음: ${serviceId}`);
      return null;
    }

    // 🎯 통합된 데이터 구조로 반환
    const serviceWithDetails: ServiceWithDetails = {
      ...serviceResult.data,
      operating_hours: operatingHoursResult.data || [],
      holidays: holidaysResult.data || []
    };

    console.log(`[getServiceWithDetails] 통합 데이터 조회 완료:`, {
      serviceId: serviceWithDetails.id,
      operatingHoursCount: serviceWithDetails.operating_hours.length,
      holidaysCount: serviceWithDetails.holidays.length
    });

    return serviceWithDetails;
    
  } catch (error) {
    console.error("서비스 통합 조회 오류:", error);
    return null;
  }
}

// 서비스 상세 페이지 (서버 컴포넌트)
export default async function ServiceDetailPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const serviceData = await getServiceWithDetails(serviceId);
  
  // 서비스가 존재하지 않으면 404 페이지 표시
  if (!serviceData) {
    notFound();
  }
  
  return <ServiceDetailClient service={serviceData} />;
} 