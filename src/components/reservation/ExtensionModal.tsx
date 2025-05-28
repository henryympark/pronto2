"use client";

import { useState, useEffect } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock, CreditCard, Gift, AlertCircle } from 'lucide-react';
import { toast } from '@/shared/hooks/useToast';
import { formatTimeDisplay } from '@/lib/date-utils';
import type { 
  Reservation, 
  CheckExtensionEligibilityResponse,
  ExtendReservationResponse 
} from '@/types/reservation';

interface ExtensionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation;
  onSuccess: (updatedReservation: Reservation) => void;
}

interface CustomerCoupon {
  id: string;
  minutes: number;
  expires_at: string | null;
  granted_by?: string | null;
}

export function ExtensionModal({
  open,
  onOpenChange,
  reservation,
  onSuccess
}: ExtensionModalProps) {
  const supabase = useSupabase();
  
  // UI 상태
  const [isLoading, setIsLoading] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [extensionMinutes, setExtensionMinutes] = useState<number>(30);
  
  // 가능성 확인 결과
  const [eligibilityCheck, setEligibilityCheck] = useState<CheckExtensionEligibilityResponse | null>(null);
  
  // 사용자 보유 자원
  const [accumulatedTime, setAccumulatedTime] = useState<number>(0);
  const [availableCoupons, setAvailableCoupons] = useState<CustomerCoupon[]>([]);
  
  // 사용자 선택
  const [useAccumulatedTime, setUseAccumulatedTime] = useState<boolean>(true);
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);

  // 모달이 열릴 때 초기 데이터 로드
  useEffect(() => {
    if (open) {
      loadInitialData();
    } else {
      resetState();
    }
  }, [open]);

  // 연장 시간이 변경되거나 사용자 선택이 변경될 때 가능성 재확인
  useEffect(() => {
    if (open && extensionMinutes > 0) {
      checkExtensionEligibility();
    }
  }, [extensionMinutes, open]);

  const resetState = () => {
    setExtensionMinutes(30);
    setEligibilityCheck(null);
    setUseAccumulatedTime(true);
    setSelectedCoupons([]);
  };

  const loadInitialData = async () => {
    if (!reservation.customer_id) return;

    setIsLoading(true);
    try {
      // 적립 시간 조회
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('accumulated_time_minutes')
        .eq('id', reservation.customer_id)
        .single();

      if (customerError) {
        console.error('적립 시간 조회 실패:', customerError.message || customerError);
      } else {
        setAccumulatedTime(customerData?.accumulated_time_minutes || 0);
      }

      // 사용 가능한 쿠폰 조회 - 올바른 컬럼명 사용
      const { data: couponsData, error: couponsError } = await supabase
        .from('customer_coupons')
        .select('id, minutes, expires_at, granted_by')
        .eq('customer_id', reservation.customer_id)
        .eq('is_used', false)
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
        .order('expires_at', { ascending: true, nullsFirst: false });

      console.log('[ExtensionModal] 쿠폰 데이터 구조 확인:', couponsData);

      if (couponsError) {
        console.error('쿠폰 조회 실패:', couponsError.message || couponsError);
      } else {
        // 쿠폰 데이터가 있으면 처음 몇 개만 사용하도록 설정
        const validCoupons = (couponsData || []).slice(0, 5); // 최대 5개로 제한
        setAvailableCoupons(validCoupons);
      }

    } catch (error) {
      console.error('초기 데이터 로드 실패:', error instanceof Error ? error.message : '알 수 없는 에러');
      toast({
        title: "데이터 로드 실패",
        description: "예약 연장 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkExtensionEligibility = async () => {
    try {
      const response = await fetch(
        `/api/reservations/${reservation.id}/check-extension`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            extensionMinutes
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = '연장 가능성 확인 실패';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setEligibilityCheck(result);
      
    } catch (error) {
      console.error('연장 가능성 확인 실패:', error instanceof Error ? error.message : '알 수 없는 에러');
      setEligibilityCheck({
        eligible: false,
        reason: error instanceof Error ? error.message : '연장 가능성 확인 중 오류가 발생했습니다.',
        additionalCost: 0,
        timeDiscountAvailable: 0,
        gracePeriodRemaining: 0
      });
    }
  };

  const handleExtendReservation = async () => {
    if (!eligibilityCheck?.eligible) return;

    setIsExtending(true);
    try {
      const response = await fetch(
        `/api/reservations/${reservation.id}/extend`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            extensionMinutes,
            useAccumulatedTime,
            useCoupons: selectedCoupons
          }),
        }
      );

      const result: ExtendReservationResponse = await response.json();
      
      if (response.ok && result.success) {
        toast({
          title: "예약 연장 완료",
          description: `예약이 ${extensionMinutes}분 연장되었습니다.`,
        });

        if (result.updatedReservation) {
          onSuccess(result.updatedReservation);
        }
        
        onOpenChange(false);
      } else {
        throw new Error(result.error || '예약 연장 실패');
      }
    } catch (error) {
      console.error('예약 연장 실패:', error);
      toast({
        title: "예약 연장 실패",
        description: error instanceof Error ? error.message : '예약 연장 중 오류가 발생했습니다.',
        variant: "destructive",
      });
    } finally {
      setIsExtending(false);
    }
  };

  const handleCouponToggle = (couponId: string, checked: boolean) => {
    if (checked) {
      setSelectedCoupons(prev => [...prev, couponId]);
    } else {
      setSelectedCoupons(prev => prev.filter(id => id !== couponId));
    }
  };

  // 실제 사용될 시간 계산
  const calculateTimeUsage = () => {
    if (!eligibilityCheck) return { accumulated: 0, coupons: 0, totalDiscount: 0 };

    let remainingMinutes = extensionMinutes;
    let accumulatedUsed = 0;
    let couponsUsed = 0;

    // 적립 시간 사용
    if (useAccumulatedTime) {
      accumulatedUsed = Math.min(accumulatedTime, remainingMinutes);
      remainingMinutes -= accumulatedUsed;
    }

    // 쿠폰 사용
    for (const couponId of selectedCoupons) {
      if (remainingMinutes <= 0) break;
      
      const coupon = availableCoupons.find(c => c.id === couponId);
      if (coupon) {
        const couponUsed = Math.min(coupon.minutes, remainingMinutes);
        couponsUsed += couponUsed;
        remainingMinutes -= couponUsed;
      }
    }

    const totalDiscount = accumulatedUsed + couponsUsed;
    return { accumulated: accumulatedUsed, coupons: couponsUsed, totalDiscount };
  };

  const timeUsage = calculateTimeUsage();
  const finalCost = eligibilityCheck ? 
    Math.max(0, eligibilityCheck.additionalCost - (timeUsage.totalDiscount / 60 * (eligibilityCheck.additionalCost / (extensionMinutes / 60)))) :
    0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            예약 연장하기
          </DialogTitle>
          <DialogDescription>
            현재 예약을 30분 단위로 연장할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 연장 시간 선택 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">연장 시간 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={extensionMinutes.toString()}
                  onValueChange={(value) => setExtensionMinutes(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30분</SelectItem>
                    <SelectItem value="60">1시간</SelectItem>
                    <SelectItem value="90">1시간 30분</SelectItem>
                    <SelectItem value="120">2시간</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* 가능성 확인 결과 */}
            {eligibilityCheck && (
              <Card>
                <CardContent className="pt-4">
                  {eligibilityCheck.eligible ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600">
                        <div className="h-2 w-2 bg-green-600 rounded-full" />
                        <span className="text-sm font-medium">연장 가능</span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p>추가 요금: {eligibilityCheck.additionalCost.toLocaleString()}원</p>
                        <p>Grace Period: {eligibilityCheck.gracePeriodRemaining}분 남음</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">연장 불가</span>
                      </div>
                      <p className="text-sm text-red-600">{eligibilityCheck.reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 보유 시간 사용 옵션 */}
            {eligibilityCheck?.eligible && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">할인 옵션</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 적립 시간 사용 */}
                  {accumulatedTime > 0 && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="use-accumulated-time"
                        checked={useAccumulatedTime}
                        onCheckedChange={(checked) => setUseAccumulatedTime(checked === true)}
                      />
                      <label htmlFor="use-accumulated-time" className="text-sm flex-1">
                        적립 시간 사용 ({formatTimeDisplay(accumulatedTime)} 보유)
                      </label>
                    </div>
                  )}

                  {/* 쿠폰 사용 */}
                  {availableCoupons.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">쿠폰 사용</p>
                      {availableCoupons.map((coupon) => (
                        <div key={coupon.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`coupon-${coupon.id}`}
                            checked={selectedCoupons.includes(coupon.id)}
                            onCheckedChange={(checked) => 
                              handleCouponToggle(coupon.id, checked as boolean)
                            }
                          />
                          <label htmlFor={`coupon-${coupon.id}`} className="text-sm flex-1">
                            {formatTimeDisplay(coupon.minutes)} 쿠폰
                            {coupon.granted_by && (
                              <span className="text-gray-500 ml-1">({coupon.granted_by})</span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 요금 계산 미리보기 */}
            {eligibilityCheck?.eligible && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">요금 계산</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>기본 추가 요금</span>
                    <span>{eligibilityCheck.additionalCost.toLocaleString()}원</span>
                  </div>
                  
                  {timeUsage.accumulated > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>적립 시간 할인</span>
                      <span>-{Math.round((timeUsage.accumulated / 60) * (eligibilityCheck.additionalCost / (extensionMinutes / 60))).toLocaleString()}원</span>
                    </div>
                  )}
                  
                  {timeUsage.coupons > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>쿠폰 할인</span>
                      <span>-{Math.round((timeUsage.coupons / 60) * (eligibilityCheck.additionalCost / (extensionMinutes / 60))).toLocaleString()}원</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between text-base font-medium">
                    <span>최종 결제 금액</span>
                    <span>{Math.round(finalCost).toLocaleString()}원</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleExtendReservation}
            disabled={!eligibilityCheck?.eligible || isExtending}
          >
            {isExtending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                연장 중...
              </>
            ) : (
              `${extensionMinutes}분 연장하기`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 