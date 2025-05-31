import { create } from 'zustand';
import { getUserTimeAndCoupons } from '@/lib/supabase-queries';
import { 
  calculateAccumulatedTimeDiscount, 
  calculateCouponDiscount, 
  calculateTotalDiscount,
  calculateFinalPrice 
} from '@/lib/discount-utils';

export interface CustomerFormData {
  customerName: string;
  companyName: string;
  shootingPurpose: string;
  vehicleNumber: string;
  privacyAgreed: boolean;
}

// 쿠폰 정보 타입
export interface CouponInfo {
  id: string;
  minutes: number;
  expires_at: string | null;
  created_at: string;
}

// 적립/쿠폰 사용 정보 타입
export interface TimeUsageData {
  // 사용자 보유 정보
  accumulatedTimeMinutes: number;
  availableCoupons: CouponInfo[];
  
  // 사용 선택 정보
  selectedAccumulatedMinutes: number; // 사용할 적립 시간 (분)
  selectedCouponIds: string[]; // 사용할 쿠폰 ID 목록
  
  // 계산된 할인 정보
  totalDiscountMinutes: number; // 총 할인된 시간 (분)
  discountAmount: number; // 할인 금액
  finalPrice: number; // 최종 결제 금액
}

interface BookingFormStore {
  formData: CustomerFormData;
  timeUsageData: TimeUsageData;
  showBookingForm: boolean;
  isSubmitting: boolean;
  isLoadingTimeData: boolean;
  
  setFormData: (updates: Partial<CustomerFormData>) => void;
  setTimeUsageData: (updates: Partial<TimeUsageData>) => void;
  toggleBookingForm: () => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setIsLoadingTimeData: (isLoading: boolean) => void;
  loadRecentBookingData: (supabase: any, userId: string) => Promise<void>;
  loadTimeUsageData: (supabase: any, userId: string) => Promise<void>;
  calculateDiscount: (totalMinutes: number, hourlyRate: number) => void;
  resetTimeUsage: () => void;
  resetForm: () => void;
}

const initialFormData: CustomerFormData = {
  customerName: '',
  companyName: '',
  shootingPurpose: '',
  vehicleNumber: '',
  privacyAgreed: false,
};

const initialTimeUsageData: TimeUsageData = {
  accumulatedTimeMinutes: 0,
  availableCoupons: [],
  selectedAccumulatedMinutes: 0,
  selectedCouponIds: [],
  totalDiscountMinutes: 0,
  discountAmount: 0,
  finalPrice: 0,
};

export const useBookingFormStore = create<BookingFormStore>((set, get) => ({
  formData: initialFormData,
  timeUsageData: initialTimeUsageData,
  showBookingForm: false,
  isSubmitting: false,
  isLoadingTimeData: false,

  setFormData: (updates) => {
    set((state) => ({
      formData: { ...state.formData, ...updates }
    }));
  },

  setTimeUsageData: (updates) => {
    set((state) => ({
      timeUsageData: { ...state.timeUsageData, ...updates }
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

  setIsLoadingTimeData: (isLoading) => {
    set({ isLoadingTimeData: isLoading });
  },

  loadRecentBookingData: async (supabase, userId) => {
    try {
      console.log('[BookingFormStore] 최근 예약 정보 로딩:', userId);
      
      const { data, error } = await supabase
        .from('reservations')
        .select('customer_name, company_name, shooting_purpose, vehicle_number')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.log('[BookingFormStore] 이전 예약 정보 없음:', error.message);
        return;
      }

      if (data) {
        console.log('[BookingFormStore] 최근 예약 정보 로드됨:', data);
        set((state) => ({
          formData: {
            ...state.formData,
            customerName: data.customer_name || '',
            companyName: data.company_name || '',
            shootingPurpose: data.shooting_purpose || '',
            vehicleNumber: data.vehicle_number || '',
          }
        }));
      }
    } catch (err) {
      console.error('[BookingFormStore] 최근 예약 정보 로딩 오류:', err);
    }
  },

  loadTimeUsageData: async (supabase, userId) => {
    try {
      console.log('[BookingFormStore] 적립/쿠폰 시간 정보 로딩:', userId);
      set({ isLoadingTimeData: true });

      // 공통 함수를 사용하여 적립시간과 쿠폰 정보 조회
      const { accumulatedTime, coupons, errors } = await getUserTimeAndCoupons(supabase, userId);

      if (errors.customer) {
        console.error('[BookingFormStore] 고객 정보 조회 오류:', errors.customer);
      }

      if (errors.coupons) {
        console.error('[BookingFormStore] 쿠폰 정보 조회 오류:', errors.coupons);
      }

      // 에러가 있어도 정상적으로 로드된 데이터는 사용
      console.log('[BookingFormStore] 적립/쿠폰 정보 로드됨:', {
        accumulated: accumulatedTime,
        coupons: coupons
      });

      set((state) => ({
        timeUsageData: {
          ...state.timeUsageData,
          accumulatedTimeMinutes: accumulatedTime,
          availableCoupons: coupons
        }
      }));
    } catch (err) {
      console.error('[BookingFormStore] 적립/쿠폰 시간 정보 로딩 오류:', err);
    } finally {
      set({ isLoadingTimeData: false });
    }
  },

  calculateDiscount: (totalMinutes: number, hourlyRate: number) => {
    const state = get();
    const { timeUsageData } = state;
    
    // PRD F-TIME-005: 총 예약 시간이 1시간 초과 시에만 적립/쿠폰 사용 가능
    if (totalMinutes <= 60) {
      set((state) => ({
        timeUsageData: {
          ...state.timeUsageData,
          selectedAccumulatedMinutes: 0,
          selectedCouponIds: [],
          totalDiscountMinutes: 0,
          discountAmount: 0,
          finalPrice: (totalMinutes / 60) * hourlyRate
        }
      }));
      return;
    }

    // 선택된 쿠폰들의 총 시간 계산
    const selectedCouponMinutes = timeUsageData.availableCoupons
      .filter(coupon => timeUsageData.selectedCouponIds.includes(coupon.id))
      .reduce((sum, coupon) => sum + coupon.minutes, 0);

    // 총 할인 시간 계산 (쿠폰 + 적립 시간)
    const totalDiscountMinutes = selectedCouponMinutes + timeUsageData.selectedAccumulatedMinutes;
    
    // 할인 가능한 최대 시간은 1시간 초과분만 가능
    const excessMinutes = totalMinutes - 60;
    const actualDiscountMinutes = Math.min(totalDiscountMinutes, excessMinutes);
    
    // ✅ 새로운 고정 할인 방식: 30분 = 11,000원
    const accumulatedDiscountAmount = calculateAccumulatedTimeDiscount(
      Math.min(timeUsageData.selectedAccumulatedMinutes, actualDiscountMinutes)
    );
    const couponDiscountAmount = calculateCouponDiscount(
      Math.min(selectedCouponMinutes, actualDiscountMinutes - timeUsageData.selectedAccumulatedMinutes)
    );
    const totalDiscountAmount = accumulatedDiscountAmount + couponDiscountAmount;
    
    const originalPrice = (totalMinutes / 60) * hourlyRate;
    const finalPrice = calculateFinalPrice(originalPrice, totalDiscountAmount);

    console.log('[BookingFormStore] 고정 할인 계산:', {
      totalMinutes,
      excessMinutes,
      selectedCouponMinutes,
      selectedAccumulatedMinutes: timeUsageData.selectedAccumulatedMinutes,
      actualDiscountMinutes,
      accumulatedDiscountAmount,
      couponDiscountAmount,
      totalDiscountAmount,
      originalPrice,
      finalPrice,
      note: '30분당 11,000원 고정 할인 적용'
    });

    set((state) => ({
      timeUsageData: {
        ...state.timeUsageData,
        totalDiscountMinutes: actualDiscountMinutes,
        discountAmount: totalDiscountAmount,
        finalPrice
      }
    }));
  },

  resetTimeUsage: () => {
    set((state) => ({
      timeUsageData: {
        ...state.timeUsageData,
        selectedAccumulatedMinutes: 0,
        selectedCouponIds: [],
        totalDiscountMinutes: 0,
        discountAmount: 0,
        finalPrice: 0
      }
    }));
  },

  resetForm: () => {
    set({
      formData: initialFormData,
      timeUsageData: initialTimeUsageData,
      showBookingForm: false,
      isSubmitting: false,
      isLoadingTimeData: false,
    });
  },
}));
