// 할인 관련 상수
export const DISCOUNT_RATES = {
  // 30분 = 11,000원 고정 할인
  ACCUMULATED_TIME_PER_30MIN: 11000,
  COUPON_PER_30MIN: 11000,
  
  // 최소 할인 단위 (30분)
  MIN_DISCOUNT_MINUTES: 30,
} as const;

/**
 * 적립시간 할인 금액 계산 (고정 할인액 방식)
 * @param minutes 사용할 적립시간 (분)
 * @returns 할인 금액 (원)
 */
export const calculateAccumulatedTimeDiscount = (minutes: number): number => {
  // 30분 단위로 계산
  const thirtyMinuteUnits = Math.floor(minutes / DISCOUNT_RATES.MIN_DISCOUNT_MINUTES);
  return thirtyMinuteUnits * DISCOUNT_RATES.ACCUMULATED_TIME_PER_30MIN;
};

/**
 * 쿠폰 할인 금액 계산 (고정 할인액 방식)  
 * @param minutes 쿠폰 시간 (분)
 * @returns 할인 금액 (원)
 */
export const calculateCouponDiscount = (minutes: number): number => {
  // 30분 단위로 계산
  const thirtyMinuteUnits = Math.floor(minutes / DISCOUNT_RATES.MIN_DISCOUNT_MINUTES);
  return thirtyMinuteUnits * DISCOUNT_RATES.COUPON_PER_30MIN;
};

/**
 * 총 할인 금액 계산
 * @param accumulatedMinutes 사용할 적립시간 (분)
 * @param couponMinutes 사용할 쿠폰 시간 (분)
 * @returns 총 할인 금액 (원)
 */
export const calculateTotalDiscount = (
  accumulatedMinutes: number, 
  couponMinutes: number
): number => {
  const accumulatedDiscount = calculateAccumulatedTimeDiscount(accumulatedMinutes);
  const couponDiscount = calculateCouponDiscount(couponMinutes);
  return accumulatedDiscount + couponDiscount;
};

/**
 * 할인 적용 후 최종 가격 계산
 * @param originalPrice 원래 가격 (원)
 * @param discountAmount 할인 금액 (원)
 * @returns 최종 가격 (원), 음수가 될 수 없음
 */
export const calculateFinalPrice = (
  originalPrice: number, 
  discountAmount: number
): number => {
  return Math.max(0, originalPrice - discountAmount);
}; 