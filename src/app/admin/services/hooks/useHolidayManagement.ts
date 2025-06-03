"use client";

import { useState, useEffect } from "react";
import { createAdminClient } from "@/lib/supabase-admin";
import { format } from "date-fns";

type Holiday = {
  id: string;
  service_id: string;
  holiday_date: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

type HolidayMessage = {
  type: 'success' | 'error' | 'info';
  text: string;
};

export function useHolidayManagement(serviceId?: string) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [holidayDescription, setHolidayDescription] = useState("");
  const [holidayMessage, setHolidayMessage] = useState<HolidayMessage | null>(null);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [savingHoliday, setSavingHoliday] = useState(false);
  
  const supabaseAdmin = createAdminClient();
  
  // 휴무일 조회 함수
  const fetchHolidays = async (targetServiceId: string) => {
    setLoadingHolidays(true);
    try {
      console.log('휴무일 조회 시작:', targetServiceId);
      
      const { data, error } = await supabaseAdmin
        .from('holidays')
        .select('*')
        .eq('service_id', targetServiceId)
        .order('holiday_date', { ascending: true });
        
      if (error) {
        console.error('Supabase 에러 정보:', JSON.stringify(error));
        throw error;
      }
      
      console.log('휴무일 조회 결과:', data);
      setHolidays(data || []);
      
      // 휴무일 날짜를 Date 객체로 변환
      const dates = (data || []).map(holiday => new Date(holiday.holiday_date));
      setSelectedDates(dates);
    } catch (err: any) {
      console.error('휴무일 조회 오류:', err);
      setHolidayMessage({
        type: 'error',
        text: err.message || '휴무일 정보를 불러오는데 실패했습니다.'
      });
    } finally {
      setLoadingHolidays(false);
    }
  };
  
  // 휴무일 추가 함수
  const handleAddHoliday = async () => {
    if (!serviceId || selectedDates.length === 0) return;
    
    setSavingHoliday(true);
    try {
      const holidayData = selectedDates.map(date => ({
        service_id: serviceId,
        holiday_date: format(date, 'yyyy-MM-dd'),
        description: holidayDescription || null
      }));
      
      const { error } = await supabaseAdmin
        .from('holidays')
        .insert(holidayData);
        
      if (error) {
        throw error;
      }
      
      setHolidayMessage({
        type: 'success',
        text: `${selectedDates.length}개의 휴무일이 등록되었습니다.`
      });
      
      // 상태 초기화
      setSelectedDates([]);
      setHolidayDescription("");
      
      // 데이터 새로고침
      await fetchHolidays(serviceId);
      
    } catch (err: any) {
      console.error('휴무일 등록 오류:', err);
      setHolidayMessage({
        type: 'error',
        text: err.message || '휴무일 등록에 실패했습니다.'
      });
    } finally {
      setSavingHoliday(false);
    }
  };
  
  // 휴무일 삭제 함수
  const handleDeleteHoliday = async (holidayDate: string) => {
    if (!serviceId) return;
    
    try {
      const { error } = await supabaseAdmin
        .from('holidays')
        .delete()
        .eq('service_id', serviceId)
        .eq('holiday_date', holidayDate);
        
      if (error) {
        throw error;
      }
      
      setHolidayMessage({
        type: 'success',
        text: '휴무일이 삭제되었습니다.'
      });
      
      // 데이터 새로고침
      await fetchHolidays(serviceId);
      
    } catch (err: any) {
      console.error('휴무일 삭제 오류:', err);
      setHolidayMessage({
        type: 'error',
        text: err.message || '휴무일 삭제에 실패했습니다.'
      });
    }
  };
  
  // 메시지 자동 제거
  useEffect(() => {
    if (holidayMessage) {
      const timer = setTimeout(() => {
        setHolidayMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [holidayMessage]);
  
  // 서비스 변경 시 휴무일 조회
  useEffect(() => {
    if (serviceId) {
      fetchHolidays(serviceId);
    }
  }, [serviceId]);
  
  return {
    holidays,
    selectedDates,
    setSelectedDates,
    holidayDescription,
    setHolidayDescription,
    holidayMessage,
    loadingHolidays,
    savingHoliday,
    handleAddHoliday,
    handleDeleteHoliday,
    refreshHolidays: () => serviceId && fetchHolidays(serviceId)
  };
} 