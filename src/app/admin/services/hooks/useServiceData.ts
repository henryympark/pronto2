"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/contexts/SupabaseContext";

type Service = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_per_hour: number;
  location: string;
  image_url: string;
  notice?: string;
  refund_policy?: string;
  average_rating?: number;
  review_count?: number;
};

export function useServiceData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  const supabase = useSupabase();
  
  // 서비스 목록 조회
  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setServices(data || []);
      if (data && data.length > 0 && !selectedService) {
        setSelectedService(data[0]);
      }
    } catch (err: any) {
      console.error('서비스 정보 로딩 오류:', err);
      setError(err.message || '서비스 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // 서비스 선택 변경
  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setSelectedService(service);
    }
  };
  
  // 초기 데이터 로딩
  useEffect(() => {
    fetchServices();
  }, [supabase]);
  
  return {
    loading,
    error,
    services,
    selectedService,
    handleServiceChange,
    refreshServices: fetchServices
  };
} 