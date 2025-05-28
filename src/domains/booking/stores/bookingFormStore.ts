import { create } from 'zustand';

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

      // 1. 적립 시간 조회
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('accumulated_time_minutes')
        .eq('id', userId)
        .single();

      if (customerError) {
        console.error('[BookingFormStore] 고객 정보 조회 오류:', customerError);
        return;
      }

      // 2. 사용 가능한 쿠폰 조회 (미사용, 미만료)
      const { data: couponsData, error: couponsError } = await supabase
        .from('customer_coupons')
        .select('id, minutes, expires_at, created_at')
        .eq('customer_id', userId)
        .eq('is_used', false)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: true });

      if (couponsError) {
        console.error('[BookingFormStore] 쿠폰 정보 조회 오류:', couponsError);
        return;
      }

      console.log('[BookingFormStore] 적립/쿠폰 정보 로드됨:', {
        accumulated: customerData?.accumulated_time_minutes || 0,
        coupons: couponsData || []
      });

      set((state) => ({
        timeUsageData: {
          ...state.timeUsageData,
          accumulatedTimeMinutes: customerData?.accumulated_time_minutes || 0,
          availableCoupons: (couponsData || []).map((coupon: any) => ({
            id: coupon.id,
            minutes: coupon.minutes,
            expires_at: coupon.expires_at,
            created_at: coupon.created_at
          }))
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
    
    // 할인 금액 계산
    const discountAmount = (actualDiscountMinutes / 60) * hourlyRate;
    const originalPrice = (totalMinutes / 60) * hourlyRate;
    const finalPrice = originalPrice - discountAmount;

    console.log('[BookingFormStore] 할인 계산:', {
      totalMinutes,
      excessMinutes,
      selectedCouponMinutes,
      selectedAccumulatedMinutes: timeUsageData.selectedAccumulatedMinutes,
      actualDiscountMinutes,
      discountAmount,
      finalPrice
    });

    set((state) => ({
      timeUsageData: {
        ...state.timeUsageData,
        totalDiscountMinutes: actualDiscountMinutes,
        discountAmount,
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
