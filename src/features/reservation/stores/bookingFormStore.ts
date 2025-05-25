"use client";

import { create } from "zustand";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * 예약 폼 데이터 인터페이스
 */
export interface BookingFormData {
  customerName: string;
  companyName: string;
  shootingPurpose: string;
  vehicleNumber: string;
  privacyAgreed: boolean;
}

/**
 * 예약 폼 상태 인터페이스
 */
interface BookingFormState {
  // 폼 상태
  formData: BookingFormData;
  showBookingForm: boolean;
  isSubmitting: boolean;
  
  // 액션
  setFormData: (data: Partial<BookingFormData>) => void;
  toggleBookingForm: () => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  resetForm: () => void;
  
  // 비동기 액션 (Supabase 클라이언트를 파라미터로 받음)
  loadRecentBookingData: (supabase: SupabaseClient, userId: string) => Promise<void>;
}

/**
 * 예약 폼 상태 관리 스토어
 */
export const useBookingFormStore = create<BookingFormState>((set, get) => ({
  // 초기 상태
  formData: {
    customerName: "",
    companyName: "",
    shootingPurpose: "",
    vehicleNumber: "",
    privacyAgreed: false
  },
  showBookingForm: false,
  isSubmitting: false,
  
  // 액션
  setFormData: (data) => {
    set((state) => ({
      formData: {
        ...state.formData,
        ...data
      }
    }));
  },
  
  toggleBookingForm: () => {
    set((state) => ({
      showBookingForm: !state.showBookingForm
    }));
  },
  
  setIsSubmitting: (isSubmitting) => {
    set({ isSubmitting });
  },
  
  resetForm: () => {
    set({
      formData: {
        customerName: "",
        companyName: "",
        shootingPurpose: "",
        vehicleNumber: "",
        privacyAgreed: false
      }
    });
  },
  
  // 비동기 액션 - Supabase 클라이언트를 파라미터로 받음
  loadRecentBookingData: async (supabase: SupabaseClient, userId: string) => {
    try {
      console.log('[BookingStore] 최근 예약 정보 로딩 시작:', { userId });
      
      const { data: recentReservation, error } = await supabase
        .from("reservations")
        .select("customer_name, company_name, shooting_purpose")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
      if (error) {
        console.log('[BookingStore] 최근 예약 정보 없음:', error.message);
        return;
      }
        
      if (recentReservation) {
        console.log('[BookingStore] 최근 예약 정보 발견:', recentReservation);
        
        // 최근 예약 정보가 있으면 자동으로 채우기
        set((state) => ({
          formData: {
            ...state.formData,
            customerName: recentReservation.customer_name || "",
            companyName: recentReservation.company_name || "",
            shootingPurpose: recentReservation.shooting_purpose || ""
          }
        }));
        
        console.log('[BookingStore] 폼 데이터 자동 입력 완료');
      }
    } catch (err) {
      console.log('[BookingStore] 최근 예약 정보 로딩 실패:', err);
    }
  }
}));