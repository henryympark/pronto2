"use client";

import { create } from "zustand";
import { createClient$ } from "@/lib/supabase";

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
  
  // 비동기 액션
  loadRecentBookingData: (userId: string) => Promise<void>;
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
  
  // 비동기 액션
  loadRecentBookingData: async (userId) => {
    try {
      const supabase = createClient$();
      const { data: recentReservation, error } = await supabase
        .from("reservations")
        .select("customer_name, company_name, shooting_purpose")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
      if (recentReservation && !error) {
        // 최근 예약 정보가 있으면 자동으로 채우기
        set((state) => ({
          formData: {
            ...state.formData,
            customerName: recentReservation.customer_name || "",
            companyName: recentReservation.company_name || "",
            shootingPurpose: recentReservation.shooting_purpose || ""
          }
        }));
      }
    } catch (err) {
      console.log("최근 예약 정보가 없습니다.");
    }
  }
})); 