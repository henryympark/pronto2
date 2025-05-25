import { create } from 'zustand';

export interface BookingFormData {
  customerName: string;
  companyName: string;
  shootingPurpose: string;
  vehicleNumber: string;
  privacyAgreed: boolean;
}

interface BookingFormStore {
  formData: BookingFormData;
  showBookingForm: boolean;
  isSubmitting: boolean;
  
  setFormData: (updates: Partial<BookingFormData>) => void;
  toggleBookingForm: () => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  loadRecentBookingData: (supabase: any, userId: string) => Promise<void>;
  resetForm: () => void;
}

const initialFormData: BookingFormData = {
  customerName: '',
  companyName: '',
  shootingPurpose: '',
  vehicleNumber: '',
  privacyAgreed: false,
};

export const useBookingFormStore = create<BookingFormStore>((set, get) => ({
  formData: initialFormData,
  showBookingForm: false,
  isSubmitting: false,

  setFormData: (updates) => {
    set((state) => ({
      formData: { ...state.formData, ...updates }
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

  resetForm: () => {
    set({
      formData: initialFormData,
      showBookingForm: false,
      isSubmitting: false,
    });
  },
}));
