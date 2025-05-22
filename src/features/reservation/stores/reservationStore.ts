"use client";

import { create } from "zustand";
import { addDays } from "date-fns";

/**
 * 예약 시간 범위 인터페이스
 */
export interface TimeRange {
  start: string;
  end: string;
  duration: number;
  price: number;
}

/**
 * 예약 상태 인터페이스
 */
interface ReservationState {
  // 예약 날짜 관련
  selectedDate: Date | null;
  maxDate: Date;
  
  // 예약 시간 관련
  selectedTimeRange: TimeRange;
  
  // 액션
  setSelectedDate: (date: Date | null) => void;
  setSelectedTimeRange: (timeRange: TimeRange) => void;
  resetTimeRange: () => void;
  
  // 계산된 값
  formattedDate: () => string | null;
}

/**
 * 예약 상태 관리 스토어
 */
export const useReservationStore = create<ReservationState>((set, get) => ({
  // 초기 상태
  selectedDate: new Date(),
  maxDate: addDays(new Date(), 90), // 3개월
  
  selectedTimeRange: {
    start: "",
    end: "",
    duration: 0,
    price: 0
  },
  
  // 액션
  setSelectedDate: (date) => {
    set({ selectedDate: date });
    get().resetTimeRange();
  },
  
  setSelectedTimeRange: (timeRange) => {
    set({ selectedTimeRange: timeRange });
  },
  
  resetTimeRange: () => {
    set({
      selectedTimeRange: {
        start: "",
        end: "",
        duration: 0,
        price: 0
      }
    });
  },
  
  // 계산된 값
  formattedDate: () => {
    const date = get().selectedDate;
    if (!date) return null;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
})); 