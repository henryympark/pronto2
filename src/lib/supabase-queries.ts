import { SupabaseClient } from '@supabase/supabase-js';

// 쿠폰 정보 타입
export interface CouponInfo {
  id: string;
  minutes: number;
  expires_at: string | null;
  created_at: string;
  granted_by?: string | null;
}

// 사용자 시간/쿠폰 정보 타입
export interface UserTimeAndCoupons {
  accumulatedTime: number;
  coupons: CouponInfo[];
  errors: {
    customer: any;
    coupons: any;
  };
}

/**
 * 사용자의 적립시간과 사용 가능한 쿠폰을 조회하는 공통 함수
 */
export const getUserTimeAndCoupons = async (
  supabase: SupabaseClient,
  userId: string
): Promise<UserTimeAndCoupons> => {
  console.log('[getUserTimeAndCoupons] 조회 시작:', userId);

  // 병렬로 적립시간과 쿠폰 정보 조회
  const [customerResult, couponsResult] = await Promise.all([
    // 적립 시간 조회
    supabase
      .from('customers')
      .select('accumulated_time_minutes')
      .eq('id', userId)
      .single(),
    
    // 사용 가능한 쿠폰 조회 (미사용, 미만료)
    supabase
      .from('customer_coupons')
      .select('id, minutes, expires_at, created_at, granted_by')
      .eq('customer_id', userId)
      .eq('is_used', false)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: true })
  ]);

  const result = {
    accumulatedTime: customerResult.data?.accumulated_time_minutes || 0,
    coupons: (couponsResult.data || []).map((coupon: any) => ({
      id: coupon.id,
      minutes: coupon.minutes,
      expires_at: coupon.expires_at,
      created_at: coupon.created_at,
      granted_by: coupon.granted_by
    })),
    errors: {
      customer: customerResult.error,
      coupons: couponsResult.error
    }
  };

  console.log('[getUserTimeAndCoupons] 조회 결과:', {
    accumulated: result.accumulatedTime,
    couponsCount: result.coupons.length,
    errors: result.errors
  });

  return result;
};

/**
 * 적립시간만 조회하는 함수 (간단한 경우용)
 */
export const getUserAccumulatedTime = async (
  supabase: SupabaseClient,
  userId: string
): Promise<{ time: number; error: any }> => {
  const { data, error } = await supabase
    .from('customers')
    .select('accumulated_time_minutes')
    .eq('id', userId)
    .single();

  return {
    time: data?.accumulated_time_minutes || 0,
    error
  };
};

/**
 * 사용 가능한 쿠폰만 조회하는 함수
 */
export const getUserAvailableCoupons = async (
  supabase: SupabaseClient,
  userId: string
): Promise<{ coupons: CouponInfo[]; error: any }> => {
  const { data, error } = await supabase
    .from('customer_coupons')
    .select('id, minutes, expires_at, created_at, granted_by')
    .eq('customer_id', userId)
    .eq('is_used', false)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .order('created_at', { ascending: true });

  return {
    coupons: (data || []).map((coupon: any) => ({
      id: coupon.id,
      minutes: coupon.minutes,
      expires_at: coupon.expires_at,
      created_at: coupon.created_at,
      granted_by: coupon.granted_by
    })),
    error
  };
}; 