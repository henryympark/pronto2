"use client";

import { create } from "zustand";
import { format } from "date-fns";

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
  // 상태
  selectedDate: Date | null;
  selectedTimeRange: TimeRange;
  
  // 액션
  setSelectedDate: (date: Date | null) => void;
  setSelectedTimeRange: (timeRange: Partial<TimeRange>) => void;
  resetReservation: () => void;
  
  // 도우미 함수
  formattedDate: () => string | null;
}

/**
 * 예약 상태 관리 스토어
 */
export const useReservationStore = create<ReservationState>((set, get) => ({
  // 초기 상태
  selectedDate: null,
  selectedTimeRange: {
    start: "",
    end: "",
    duration: 0,
    price: 0
  },
  
  // 액션
  setSelectedDate: (date) => {
    set({ selectedDate: date });
  },
  
  setSelectedTimeRange: (timeRange) => {
    set((state) => ({
      selectedTimeRange: {
        ...state.selectedTimeRange,
        ...timeRange
      }
    }));
  },
  
  resetReservation: () => {
    set({
      selectedDate: null,
      selectedTimeRange: {
        start: "",
        end: "",
        duration: 0,
        price: 0
      }
    });
  },
  
  // 도우미 함수
  formattedDate: () => {
    const { selectedDate } = get();
    if (!selectedDate) return null;
    return format(selectedDate, 'yyyy-MM-dd');
  }
}));
