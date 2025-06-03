"use client";

import { useState, useEffect } from "react";
import { createAdminClient } from "@/lib/supabase-admin";

type OperatingHours = {
  id?: string;
  service_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
};

type OperatingHoursMessage = {
  type: 'success' | 'error' | 'info';
  text: string;
};

export function useOperatingHours(serviceId?: string) {
  const [operatingHours, setOperatingHours] = useState<OperatingHours[]>([]);
  const [loadingOperatingHours, setLoadingOperatingHours] = useState(false);
  const [savingOperatingHours, setSavingOperatingHours] = useState(false);
  const [operatingHoursMessage, setOperatingHoursMessage] = useState<OperatingHoursMessage | null>(null);
  
  const supabaseAdmin = createAdminClient();
  
  // 운영시간 조회 함수
  const fetchOperatingHours = async (targetServiceId: string) => {
    setLoadingOperatingHours(true);
    try {
      console.log('운영시간 조회 시작:', targetServiceId);
      
      const { data, error } = await supabaseAdmin
        .from('service_operating_hours')
        .select('*')
        .eq('service_id', targetServiceId)
        .order('day_of_week', { ascending: true });
        
      if (error) {
        console.error('운영시간 조회 에러:', error);
        throw error;
      }
      
      console.log('운영시간 조회 결과:', data);
      
      // 7일치 데이터가 없으면 기본값으로 초기화
      const defaultOperatingHours: OperatingHours[] = [];
      for (let day = 0; day < 7; day++) {
        const existingHour = data?.find(h => h.day_of_week === day);
        if (existingHour) {
          // 데이터베이스에서 가져온 시간 형식을 HH:MM으로 변환
          defaultOperatingHours.push({
            ...existingHour,
            start_time: existingHour.start_time ? existingHour.start_time.slice(0, 5) : '09:00',
            end_time: existingHour.end_time ? existingHour.end_time.slice(0, 5) : '18:00'
          });
        } else {
          // 기본값 설정
          defaultOperatingHours.push({
            service_id: targetServiceId,
            day_of_week: day,
            start_time: '09:00',
            end_time: '18:00',
            is_closed: false
          });
        }
      }
      
      setOperatingHours(defaultOperatingHours);
    } catch (err: any) {
      console.error('운영시간 조회 오류:', err);
      setOperatingHoursMessage({
        type: 'error',
        text: err.message || '운영시간 정보를 불러오는데 실패했습니다.'
      });
    } finally {
      setLoadingOperatingHours(false);
    }
  };
  
  // 운영시간 변경 함수
  const handleOperatingHourChange = (
    dayOfWeek: number, 
    field: 'start_time' | 'end_time' | 'is_closed', 
    value: string | boolean
  ) => {
    setOperatingHours(prev => 
      prev.map(hour => 
        hour.day_of_week === dayOfWeek 
          ? { ...hour, [field]: value }
          : hour
      )
    );
  };
  
  // 운영시간 저장 함수
  const handleSaveOperatingHours = async () => {
    if (!serviceId) return;
    
    setSavingOperatingHours(true);
    try {
      // 기존 데이터 삭제
      const { error: deleteError } = await supabaseAdmin
        .from('service_operating_hours')
        .delete()
        .eq('service_id', serviceId);
        
      if (deleteError) {
        throw deleteError;
      }
      
      // 새 데이터 삽입
      const { error: insertError } = await supabaseAdmin
        .from('service_operating_hours')
        .insert(
          operatingHours.map(hour => ({
            service_id: serviceId,
            day_of_week: hour.day_of_week,
            start_time: hour.start_time + ':00',
            end_time: hour.end_time + ':00',
            is_closed: hour.is_closed
          }))
        );
        
      if (insertError) {
        throw insertError;
      }
      
      setOperatingHoursMessage({
        type: 'success',
        text: '운영시간이 성공적으로 저장되었습니다.'
      });
      
      // 데이터 새로고침
      await fetchOperatingHours(serviceId);
      
    } catch (err: any) {
      console.error('운영시간 저장 오류:', err);
      setOperatingHoursMessage({
        type: 'error',
        text: err.message || '운영시간 저장에 실패했습니다.'
      });
    } finally {
      setSavingOperatingHours(false);
    }
  };
  
  // 메시지 자동 제거
  useEffect(() => {
    if (operatingHoursMessage) {
      const timer = setTimeout(() => {
        setOperatingHoursMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [operatingHoursMessage]);
  
  // 서비스 변경 시 운영시간 조회
  useEffect(() => {
    if (serviceId) {
      fetchOperatingHours(serviceId);
    }
  }, [serviceId]);
  
  return {
    operatingHours,
    loadingOperatingHours,
    savingOperatingHours,
    operatingHoursMessage,
    handleOperatingHourChange,
    handleSaveOperatingHours,
    refreshOperatingHours: () => serviceId && fetchOperatingHours(serviceId)
  };
} 