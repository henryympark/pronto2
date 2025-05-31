"use client";

import React from "react";
import { Clock, Ticket, Minus, Plus, Gift, Info } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatTimeDisplay } from "@/lib/date-utils";
import { useBookingFormStore, CouponInfo } from "../stores/bookingFormStore";
import { 
  calculateAccumulatedTimeDiscount, 
  calculateCouponDiscount 
} from "@/lib/discount-utils";

interface TimeUsageSelectorProps {
  totalMinutes: number;
  hourlyRate: number;
  isVisible: boolean;
}

export const TimeUsageSelector: React.FC<TimeUsageSelectorProps> = ({
  totalMinutes,
  hourlyRate,
  isVisible
}) => {
  const {
    timeUsageData,
    setTimeUsageData,
    calculateDiscount,
    isLoadingTimeData
  } = useBookingFormStore();

  // 1시간 초과 여부 확인
  const canUseTimeDiscount = totalMinutes > 60;
  const excessMinutes = Math.max(0, totalMinutes - 60);
  const originalPrice = (totalMinutes / 60) * hourlyRate;

  // 현재 선택된 쿠폰의 총 시간 계산
  const selectedCouponMinutes = timeUsageData.availableCoupons
    .filter(coupon => timeUsageData.selectedCouponIds.includes(coupon.id))
    .reduce((sum, coupon) => sum + coupon.minutes, 0);

  // 적립 시간 사용량 조정
  const handleAccumulatedTimeChange = (change: number) => {
    const newValue = Math.max(0, Math.min(
      timeUsageData.selectedAccumulatedMinutes + change,
      timeUsageData.accumulatedTimeMinutes,
      excessMinutes - selectedCouponMinutes
    ));
    
    // 30분 단위로 조정
    const roundedValue = Math.floor(newValue / 30) * 30;
    
    setTimeUsageData({ selectedAccumulatedMinutes: roundedValue });
    calculateDiscount(totalMinutes, hourlyRate);
  };

  // 쿠폰 선택/해제
  const handleCouponToggle = (couponId: string, checked: boolean) => {
    let newSelectedCouponIds: string[];
    
    if (checked) {
      newSelectedCouponIds = [...timeUsageData.selectedCouponIds, couponId];
    } else {
      newSelectedCouponIds = timeUsageData.selectedCouponIds.filter(id => id !== couponId);
    }

    // 선택된 쿠폰들의 총 시간 계산
    const newSelectedCouponMinutes = timeUsageData.availableCoupons
      .filter(coupon => newSelectedCouponIds.includes(coupon.id))
      .reduce((sum, coupon) => sum + coupon.minutes, 0);

    // 초과 시간을 넘지 않도록 적립 시간 조정
    const maxAccumulatedMinutes = Math.max(0, excessMinutes - newSelectedCouponMinutes);
    const adjustedAccumulatedMinutes = Math.min(
      timeUsageData.selectedAccumulatedMinutes,
      maxAccumulatedMinutes
    );

    setTimeUsageData({ 
      selectedCouponIds: newSelectedCouponIds,
      selectedAccumulatedMinutes: adjustedAccumulatedMinutes
    });
    calculateDiscount(totalMinutes, hourlyRate);
  };

  // 전체 초기화
  const handleReset = () => {
    setTimeUsageData({
      selectedAccumulatedMinutes: 0,
      selectedCouponIds: [],
      totalDiscountMinutes: 0,
      discountAmount: 0,
      finalPrice: originalPrice
    });
  };

  // 빠른 할인 적용 (최대한 많이 사용)
  const handleMaxDiscount = () => {
    // 먼저 사용 가능한 모든 쿠폰 선택
    const allCouponIds = timeUsageData.availableCoupons.map(c => c.id);
    const allCouponMinutes = timeUsageData.availableCoupons.reduce((sum, c) => sum + c.minutes, 0);
    
    // 남은 시간만큼 적립 시간 사용
    const remainingMinutes = Math.max(0, excessMinutes - allCouponMinutes);
    const maxAccumulatedMinutes = Math.min(
      timeUsageData.accumulatedTimeMinutes,
      remainingMinutes,
      Math.floor(remainingMinutes / 30) * 30 // 30분 단위로
    );

    setTimeUsageData({
      selectedCouponIds: allCouponIds,
      selectedAccumulatedMinutes: maxAccumulatedMinutes
    });
    calculateDiscount(totalMinutes, hourlyRate);
  };

  // 표시되지 않거나 로딩 중일 때
  if (!isVisible || isLoadingTimeData) {
    return (
      <div className="space-y-4">
        {isLoadingTimeData && (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pronto-primary"></div>
            <span className="ml-3 text-gray-600">할인 혜택 확인 중...</span>
          </div>
        )}
      </div>
    );
  }

  // 사용 가능한 할인이 없는 경우
  const hasNoDiscountOptions = timeUsageData.accumulatedTimeMinutes === 0 && timeUsageData.availableCoupons.length === 0;

  return (
    <div className="space-y-6">
      {/* 할인 사용 불가 안내 */}
      {!canUseTimeDiscount ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800 mb-1">할인 혜택은 1시간 초과 예약 시 사용 가능해요</p>
                <p className="text-sm text-amber-700">
                  현재 예약 시간: <span className="font-medium">{formatTimeDisplay(totalMinutes)}</span> 
                  (1시간 더 예약하시면 할인 혜택을 받으실 수 있어요!)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : hasNoDiscountOptions ? (
        /* 할인 옵션이 없는 경우 */
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Gift className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-700 mb-1">사용 가능한 할인 혜택이 없어요</p>
                <p className="text-sm text-gray-600">
                  리뷰 작성 시 적립 시간을 받거나, 운영자가 부여한 쿠폰을 활용해보세요!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 할인 혜택 요약 */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <Gift className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800 mb-1">🎉 할인 혜택을 사용할 수 있어요!</p>
                    <p className="text-sm text-green-700 mb-2">
                      {formatTimeDisplay(excessMinutes)}까지 할인받을 수 있어요 (1시간 초과분)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {timeUsageData.accumulatedTimeMinutes > 0 && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          적립시간 {formatTimeDisplay(timeUsageData.accumulatedTimeMinutes)}
                        </Badge>
                      )}
                      {timeUsageData.availableCoupons.length > 0 && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          쿠폰 {timeUsageData.availableCoupons.length}장
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {(timeUsageData.accumulatedTimeMinutes > 0 || timeUsageData.availableCoupons.length > 0) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMaxDiscount}
                    className="text-green-700 border-green-300 hover:bg-green-100 shrink-0"
                  >
                    최대 할인
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 쿠폰 선택 */}
          {timeUsageData.availableCoupons.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center">
                  <Ticket className="h-5 w-5 mr-2 text-purple-600" />
                  쿠폰 사용하기
                  <Badge className="ml-2 bg-purple-100 text-purple-800">
                    {timeUsageData.availableCoupons.length}장 보유
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">쿠폰은 적립 시간보다 우선 적용돼요</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {timeUsageData.availableCoupons.map((coupon: CouponInfo) => {
                  const isSelected = timeUsageData.selectedCouponIds.includes(coupon.id);
                  const otherSelectedCouponMinutes = timeUsageData.availableCoupons
                    .filter(c => timeUsageData.selectedCouponIds.includes(c.id) && c.id !== coupon.id)
                    .reduce((sum, c) => sum + c.minutes, 0);
                  const isDisabled = !isSelected && 
                    (otherSelectedCouponMinutes + timeUsageData.selectedAccumulatedMinutes + coupon.minutes > excessMinutes);

                  const savingAmount = Math.round((coupon.minutes / 60) * hourlyRate);

                  return (
                    <div 
                      key={coupon.id} 
                      className={`relative p-4 border-2 rounded-lg transition-all ${
                        isSelected 
                          ? 'border-purple-300 bg-purple-50' 
                          : isDisabled 
                            ? 'border-gray-200 bg-gray-50' 
                            : 'border-gray-200 hover:border-purple-200 hover:bg-purple-25'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`coupon-${coupon.id}`}
                          checked={isSelected}
                          disabled={isDisabled}
                          onCheckedChange={(checked) => handleCouponToggle(coupon.id, checked as boolean)}
                          className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                        />
                        <Label 
                          htmlFor={`coupon-${coupon.id}`}
                          className={`flex-1 cursor-pointer ${isDisabled ? 'text-gray-400' : ''}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-semibold text-lg">{formatTimeDisplay(coupon.minutes)}</span>
                                <span className="text-purple-600 font-medium">
                                  {calculateCouponDiscount(coupon.minutes).toLocaleString()}원 할인
                                </span>
                              </div>
                              {coupon.expires_at && (
                                <p className="text-xs text-gray-500">
                                  만료일: {new Date(coupon.expires_at).toLocaleDateString('ko-KR')}
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <Badge className="bg-purple-600 text-white">선택됨</Badge>
                            )}
                          </div>
                        </Label>
                      </div>
                      {isDisabled && (
                        <p className="text-xs text-gray-500 mt-2">
                          할인 가능한 시간을 초과했어요
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* 적립 시간 사용 */}
          {timeUsageData.accumulatedTimeMinutes > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  적립 시간 사용하기
                  <Badge className="ml-2 bg-blue-100 text-blue-800">
                    {formatTimeDisplay(timeUsageData.accumulatedTimeMinutes)} 보유
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">30분 단위로 사용 가능해요</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-blue-900">사용할 시간</p>
                    <p className="text-sm text-blue-700">
                      {timeUsageData.selectedAccumulatedMinutes > 0 
                        ? `${Math.round((timeUsageData.selectedAccumulatedMinutes / 60) * hourlyRate).toLocaleString()}원 할인`
                        : '시간을 선택해 주세요'
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAccumulatedTimeChange(-30)}
                      disabled={timeUsageData.selectedAccumulatedMinutes <= 0}
                      className="h-10 w-10 p-0"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="text-center min-w-[80px]">
                      <span className="text-xl font-bold text-blue-900">
                        {formatTimeDisplay(timeUsageData.selectedAccumulatedMinutes)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAccumulatedTimeChange(30)}
                      disabled={
                        timeUsageData.selectedAccumulatedMinutes + 30 > timeUsageData.accumulatedTimeMinutes ||
                        timeUsageData.selectedAccumulatedMinutes + 30 > excessMinutes - selectedCouponMinutes
                      }
                      className="h-10 w-10 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* 사용 가능한 최대 시간 안내 */}
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    최대 {formatTimeDisplay(Math.min(
                      timeUsageData.accumulatedTimeMinutes,
                      excessMinutes - selectedCouponMinutes
                    ))}까지 사용 가능
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 할인 적용 결과 */}
          {(timeUsageData.selectedAccumulatedMinutes > 0 || timeUsageData.selectedCouponIds.length > 0) && (
            <Card className="border-pronto-primary bg-gradient-to-r from-pronto-primary/5 to-pronto-primary/10">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg text-pronto-primary flex items-center">
                    <Gift className="h-5 w-5 mr-2" />
                    할인 적용 결과
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="text-pronto-primary border-pronto-primary/30"
                  >
                    전체 취소
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 할인 내역 */}
                <div className="space-y-2">
                  {timeUsageData.selectedCouponIds.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center">
                        <Ticket className="h-3 w-3 mr-1 text-purple-600" />
                        쿠폰 할인 ({formatTimeDisplay(selectedCouponMinutes)})
                      </span>
                      <span className="font-medium text-purple-600">
                        -{calculateCouponDiscount(selectedCouponMinutes).toLocaleString()}원
                      </span>
                    </div>
                  )}
                  {timeUsageData.selectedAccumulatedMinutes > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-blue-600" />
                        적립시간 할인 ({formatTimeDisplay(timeUsageData.selectedAccumulatedMinutes)})
                      </span>
                      <span className="font-medium text-blue-600">
                        -{calculateAccumulatedTimeDiscount(timeUsageData.selectedAccumulatedMinutes).toLocaleString()}원
                      </span>
                    </div>
                  )}
                </div>

                {/* 총 할인 금액 */}
                <div className="pt-3 border-t border-pronto-primary/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">원래 금액</span>
                    <span className="line-through text-gray-500">
                      {originalPrice.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium">총 할인 금액</span>
                    <span className="font-bold text-red-600 text-lg">
                      -{timeUsageData.discountAmount.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">최종 결제 금액</span>
                    <span className="font-bold text-pronto-primary text-2xl">
                      {timeUsageData.finalPrice.toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 절약 메시지 */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-green-800 font-medium">
                    🎉 총 {timeUsageData.discountAmount.toLocaleString()}원을 절약했어요!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default TimeUsageSelector; 