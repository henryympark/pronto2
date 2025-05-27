import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { Service } from "@/types/services";
import ServiceDetailClient from "@/components/ServiceDetailClient";
import { format } from "date-fns";

// 메타데이터 동적 생성
export async function generateMetadata({ params }: { params: Promise<{ serviceId: string }> }): Promise<Metadata> {
  const { serviceId } = await params;
  const service = await getService(serviceId);
  
  if (!service) {
    return {
      title: "서비스를 찾을 수 없습니다",
      description: "요청하신 서비스 정보를 찾을 수 없습니다."
    };
  }
  
  return {
    title: `${service.name} - Pronto 스튜디오`,
    description: service.description || "프론토 스튜디오 예약 서비스",
    openGraph: {
      images: service.image_url ? [service.image_url] : []
    }
  };
}

// 서비스 정보 조회 함수
async function getService(serviceId: string): Promise<Service | null> {
  const { data, error } = await supabaseServer
    .from("services")
    .select("*")
    .eq("slug", serviceId)
    .single();
    
  if (error || !data) {
    console.error("서비스 조회 오류:", error);
    return null;
  }
  
  return data as Service;
}

// 서비스 상세 페이지 (서버 컴포넌트)
export default async function ServiceDetailPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const service = await getService(serviceId);
  
  // 서비스가 존재하지 않으면 404 페이지 표시
  if (!service) {
    notFound();
  }
  
  return <ServiceDetailClient service={service} />;
} 