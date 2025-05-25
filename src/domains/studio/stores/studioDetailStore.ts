/**
 * Studio Detail Store
 * 스튜디오 상세 페이지 상태 관리 (Zustand)
 */

"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Studio, StudioService } from "../types";

/**
 * 스튜디오 상세 상태 인터페이스
 */
interface StudioDetailState {
  // 스튜디오 데이터
  studio: Studio | null;
  services: StudioService[];
  activeTab: string;
  selectedImageIndex: number;
  
  // UI 상태
  isImageModalOpen: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 액션
  setStudio: (studio: Studio | null) => void;
  setServices: (services: StudioService[]) => void;
  setActiveTab: (tab: string) => void;
  setSelectedImageIndex: (index: number) => void;
  setImageModalOpen: (isOpen: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 계산된 값
  getFormattedPriceRange: () => string;
  getAvailableServices: () => StudioService[];
  getTotalImages: () => number;
  
  // 리셋
  reset: () => void;
}

/**
 * 스튜디오 상세 상태 관리 스토어
 */
export const useStudioDetailStore = create<StudioDetailState>()(
  devtools(
    (set, get) => ({
      // 초기 상태
      studio: null,
      services: [],
      activeTab: "overview",
      selectedImageIndex: 0,
      isImageModalOpen: false,
      isLoading: false,
      error: null,
      
      // 액션
      setStudio: (studio) => {
        set({ studio, error: null }, false, "setStudio");
      },
      
      setServices: (services) => {
        set({ services }, false, "setServices");
      },
      
      setActiveTab: (tab) => {
        set({ activeTab: tab }, false, "setActiveTab");
      },
      
      setSelectedImageIndex: (index) => {
        set({ selectedImageIndex: index }, false, "setSelectedImageIndex");
      },
      
      setImageModalOpen: (isOpen) => {
        set({ isImageModalOpen: isOpen }, false, "setImageModalOpen");
      },
      
      setLoading: (isLoading) => {
        set({ isLoading }, false, "setLoading");
      },
      
      setError: (error) => {
        set({ error, isLoading: false }, false, "setError");
      },
      
      // 계산된 값
      getFormattedPriceRange: () => {
        const { studio } = get();
        if (!studio) return "0원";
        
        const { min, max } = studio.priceRange;
        if (min === max) {
          return `${min.toLocaleString()}원`;
        }
        return `${min.toLocaleString()}원 - ${max.toLocaleString()}원`;
      },
      
      getAvailableServices: () => {
        const { services } = get();
        return services.filter(service => service.isActive);
      },
      
      getTotalImages: () => {
        const { studio } = get();
        return studio?.images?.length || 0;
      },
      
      // 리셋
      reset: () => {
        set({
          studio: null,
          services: [],
          activeTab: "overview",
          selectedImageIndex: 0,
          isImageModalOpen: false,
          isLoading: false,
          error: null,
        }, false, "reset");
      },
    }),
    {
      name: "studio-detail-store",
    }
  )
);
