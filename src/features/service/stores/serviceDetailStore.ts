"use client";

import { create } from "zustand";
import { Service } from "@/types/services";

/**
 * 서비스 상세 상태 인터페이스
 */
interface ServiceDetailState {
  // 서비스 데이터
  service: Service | null;
  activeTab: string;
  
  // 액션
  setService: (service: Service) => void;
  setActiveTab: (tab: string) => void;
  
  // 계산된 값
  formattedPrice: () => string;
}

/**
 * 서비스 상세 상태 관리 스토어
 */
export const useServiceDetailStore = create<ServiceDetailState>((set, get) => ({
  // 초기 상태
  service: null,
  activeTab: "facility",
  
  // 액션
  setService: (service) => {
    set({ service });
  },
  
  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },
  
  // 계산된 값
  formattedPrice: () => {
    const service = get().service;
    if (!service) return "0";
    return service.price_per_hour.toLocaleString();
  }
})); 