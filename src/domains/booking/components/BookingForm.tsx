"use client";

import { useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useBookingFormStore } from "../stores";
import { useReservationStore } from "../stores";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/domains/auth";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useRouter } from "next/navigation";
import { TimeUsageSelector } from "./TimeUsageSelector";

interface BookingFormProps {
  serviceId: string;
}

export const BookingForm: React.FC<BookingFormProps> = ({ serviceId }) => {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = useSupabase();
  const { user } = useAuth();
  
  const { 
    formData, 
    timeUsageData,
    showBookingForm, 
    isSubmitting, 
    setFormData, 
    toggleBookingForm, 
    setIsSubmitting,
    loadRecentBookingData,
    loadTimeUsageData,
    calculateDiscount
  } = useBookingFormStore();
  
  const { selectedDate, selectedTimeRange, formattedDate } = useReservationStore();

  // 예약 시간이 변경될 때마다 할인 계산
  useEffect(() => {
    if (selectedTimeRange.duration && selectedTimeRange.price && showBookingForm) {
      const totalMinutes = selectedTimeRange.duration * 60;
      const hourlyRate = selectedTimeRange.price / selectedTimeRange.duration;
      calculateDiscount(totalMinutes, hourlyRate);
    }
  }, [selectedTimeRange.duration, selectedTimeRange.price, showBookingForm, calculateDiscount]);
  
  // 예약하기 버튼 클릭 핸들러
  const handleBookingClick = async () => {
    try {
      if (!selectedTimeRange.start || !selectedTimeRange.end) {
        toast({
          title: "시간 선택 필요",
          description: "예약 시간을 선택해주세요.",
          variant: "destructive"
        } as any);
        return;
      }

      // 로그인 상태 확인
      if (!user) {
        toast({
          title: "로그인이 필요합니다",
          description: "예약을 위해 먼저 로그인해주세요.",
          variant: "default"
        } as any);
        
        // 현재 페이지를 returnUrl로 설정하여 로그인 후 돌아올 수 있도록 함
        const returnUrl = encodeURIComponent(window.location.href);
        router.push(`/auth/login?returnUrl=${returnUrl}`);
        return;
      }

      // 폼이 열릴 때 사용자의 가장 최근 예약 정보와 적립/쿠폰 정보 가져오기
      if (!showBookingForm) {
        console.log('[BookingForm] 최근 예약 정보 로딩 시작');
        try {
          await Promise.all([
            loadRecentBookingData(supabase, user.id),
            loadTimeUsageData(supabase, user.id)
          ]);

          // 초기 할인 계산
          if (selectedTimeRange.duration && selectedTimeRange.price) {
            const totalMinutes = selectedTimeRange.duration * 60;
            const hourlyRate = selectedTimeRange.price / selectedTimeRange.duration;
            calculateDiscount(totalMinutes, hourlyRate);
          }
        } catch (error) {
          console.error('[BookingForm] 데이터 로딩 오류:', error);
          toast({
            title: "데이터 로딩 실패",
            description: "사용자 정보를 불러오는 중 오류가 발생했습니다.",
            variant: "destructive"
          } as any);
        }
      }
      
      toggleBookingForm();
    } catch (error) {
      console.error('[BookingForm] handleBookingClick 오류:', error);
      toast({
        title: "오류 발생",
        description: "예약 폼을 여는 중 오류가 발생했습니다.",
        variant: "destructive"
      } as any);
    }
  };
  
  // 예약 완료 및 결제하기 버튼 핸들러
  const handleCompleteBooking = async () => {
    try {
      console.log('[BookingForm] 예약 완료 처리 시작');
      
      // 입력 검증
      if (!formData.customerName.trim()) {
        toast({
          title: "이름을 입력해주세요",
          description: "예약자 이름은 필수입니다.",
          variant: "destructive"
        } as any);
        return;
      }

      if (!formData.privacyAgreed) {
        toast({
          title: "개인정보 수집 동의가 필요합니다",
          description: "개인정보 수집에 동의해주세요.",
          variant: "destructive"
        } as any);
        return;
      }

      // 로그인 상태 재확인 (보안상 필요)
      if (!user) {
        toast({
          title: "세션 만료",
          description: "다시 로그인해주세요.",
          variant: "destructive"
        } as any);
        const returnUrl = encodeURIComponent(window.location.href);
        router.push(`/auth/login?returnUrl=${returnUrl}`);
        setIsSubmitting(false);
        return;
      }

      if (!selectedDate || !selectedTimeRange.start || !selectedTimeRange.end) {
        toast({
          title: "예약 시간을 선택해주세요",
          description: "날짜와 시간을 모두 선택해야 합니다.",
          variant: "destructive"
        } as any);
        return;
      }

      setIsSubmitting(true);

      // 날짜 포맷팅
      const formattedDateStr = formattedDate();
      if (!formattedDateStr) {
        toast({
          title: "날짜 형식 오류",
          description: "날짜 형식이 올바르지 않습니다.",
          variant: "destructive"
        } as any);
        setIsSubmitting(false);
        return;
      }

      // 시간 형식을 HH:MM:SS 형식으로 변환
      const startTime = `${selectedTimeRange.start}:00`;
      const endTime = `${selectedTimeRange.end}:00`;

      // 예약 시간이 현재 시간보다 이후인지 확인
      const now = new Date();
      const [year, month, day] = formattedDateStr.split('-').map(Number);
      const [hours, minutes] = selectedTimeRange.start.split(':').map(Number);
      
      const reservationDateTime = new Date(year, month - 1, day, hours, minutes);
      const cutoffTime = new Date(now.getTime() + 60000); // 현재 시간 + 1분
      
      if (reservationDateTime < cutoffTime) {
        toast({
          title: "예약 시간 오류",
          description: "이미 지나간 시간이나 현재 시간에 너무 가까운 시간은 예약할 수 없습니다.",
          variant: "destructive"
        } as any);
        setIsSubmitting(false);
        return;
      }

      // 적립/쿠폰 사용 검증
      const isUsingDiscount = timeUsageData.selectedAccumulatedMinutes > 0 || timeUsageData.selectedCouponIds.length > 0;
      const finalPrice = isUsingDiscount ? timeUsageData.finalPrice : selectedTimeRange.price;

      console.log('[BookingForm] 예약 정보:', {
        selectedAccumulatedMinutes: timeUsageData.selectedAccumulatedMinutes,
        selectedCouponIds: timeUsageData.selectedCouponIds,
        finalPrice,
        originalPrice: selectedTimeRange.price
      });

      // 트랜잭션으로 예약 생성 및 적립/쿠폰 차감 처리
      console.log('[BookingForm] 예약 데이터:', {
        formattedDateStr,
        startTime,
        endTime,
        p_reservation_date: formattedDateStr,
        p_start_time: startTime,
        p_end_time: endTime
      });

      // 1. 먼저 일반 예약 생성 (기존 방식 사용)
      const reservationData = {
        service_id: serviceId,
        customer_id: user.id,
        start_time: `${formattedDateStr} ${startTime}`,
        end_time: `${formattedDateStr} ${endTime}`,
        total_hours: selectedTimeRange.duration,
        total_price: selectedTimeRange.price,
        final_price: finalPrice,
        original_total_price: selectedTimeRange.price,
        status: 'confirmed',
        customer_name: formData.customerName,
        company_name: formData.companyName || null,
        shooting_purpose: formData.shootingPurpose || null,
        vehicle_number: formData.vehicleNumber || null,
        privacy_agreed: formData.privacyAgreed,
        used_coupon_ids: timeUsageData.selectedCouponIds,
        used_accumulated_time_minutes: timeUsageData.selectedAccumulatedMinutes,
        reservation_date: formattedDateStr
      };

      console.log('[BookingForm] 예약 생성 데이터:', reservationData);

      const { data: reservationResult, error: reservationError } = await supabase
        .from('reservations')
        .insert([reservationData])
        .select()
        .single();

      if (reservationError) {
        console.error("[BookingForm] 예약 생성 오류:", JSON.stringify(reservationError, null, 2));
        toast({
          title: "예약 생성 실패",
          description: `예약 생성 오류: ${reservationError.message || "예약을 생성하는 중 오류가 발생했습니다."}`,
          variant: "destructive"
        } as any);
        setIsSubmitting(false);
        return;
      }

      console.log("[BookingForm] 예약 생성 성공:", reservationResult);

      try {
        // 2. 쿠폰 사용 처리
        if (timeUsageData.selectedCouponIds.length > 0) {
          const { error: couponError } = await supabase
            .from('customer_coupons')
            .update({
              is_used: true,
              used_at: new Date().toISOString(),
              used_reservation_id: reservationResult.id,
              updated_at: new Date().toISOString()
            })
            .in('id', timeUsageData.selectedCouponIds)
            .eq('customer_id', user.id)
            .eq('is_used', false);

          if (couponError) {
            console.error("[BookingForm] 쿠폰 업데이트 오류:", couponError);
            // 쿠폰 업데이트 실패 시 예약 삭제
            await supabase.from('reservations').delete().eq('id', reservationResult.id);
            throw new Error(`쿠폰 처리 실패: ${couponError.message}`);
          }
          console.log("[BookingForm] 쿠폰 사용 처리 완료");
        }

        // 3. 적립 시간 차감
        if (timeUsageData.selectedAccumulatedMinutes > 0) {
          // 현재 적립 시간 조회
          const { data: customerData, error: customerSelectError } = await supabase
            .from('customers')
            .select('accumulated_time_minutes')
            .eq('id', user.id)
            .single();

          if (customerSelectError || !customerData) {
            console.error("[BookingForm] 고객 정보 조회 오류:", customerSelectError);
            throw new Error('고객 정보를 찾을 수 없습니다.');
          }

          // 적립 시간 차감
          const newAccumulatedMinutes = customerData.accumulated_time_minutes - timeUsageData.selectedAccumulatedMinutes;
          
          if (newAccumulatedMinutes < 0) {
            throw new Error('적립 시간이 부족합니다.');
          }

          const { error: customerUpdateError } = await supabase
            .from('customers')
            .update({
              accumulated_time_minutes: newAccumulatedMinutes,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (customerUpdateError) {
            console.error("[BookingForm] 적립 시간 차감 오류:", customerUpdateError);
            throw new Error(`적립 시간 차감 실패: ${customerUpdateError.message}`);
          }
          console.log("[BookingForm] 적립 시간 차감 완료");
        }

      } catch (discountError) {
        console.error("[BookingForm] 할인 처리 중 오류:", discountError);
        // 할인 처리 실패 시 예약 삭제
        await supabase.from('reservations').delete().eq('id', reservationResult.id);
        toast({
          title: "할인 처리 실패",
          description: discountError instanceof Error ? discountError.message : "할인 처리 중 오류가 발생했습니다.",
          variant: "destructive"
        } as any);
        setIsSubmitting(false);
        return;
      }

      // 예약 성공 시 결제 완료 페이지로 이동
      toast({
        title: "예약이 완료되었습니다",
        description: isUsingDiscount 
          ? `적립/쿠폰 할인이 적용되어 ${finalPrice.toLocaleString()}원으로 예약되었습니다.`
          : "예약이 성공적으로 처리되었습니다."
      } as any);
      
      // 결제 완료 페이지로 리디렉션
      router.push(`/payment/complete?reservationId=${reservationResult.id}`);
      
    } catch (err) {
      console.error("[BookingForm] 예약 처리 중 오류:", err);
      toast({
        title: "오류 발생",
        description: "예약 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      } as any);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* 예약하기 버튼 */}
      <div>
        <Button 
          onClick={handleBookingClick} 
          className="w-full bg-pronto-primary hover:bg-pronto-primary/90 flex items-center justify-center space-x-1"
          disabled={!selectedTimeRange.start || !selectedTimeRange.end}
        >
          <span>{showBookingForm ? "예약 정보 입력 완료" : "예약하기"}</span>
          {showBookingForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* 예약 폼 (기본적으로 숨겨짐) */}
      {showBookingForm && (
        <div className="mt-6 space-y-6 border-t border-pronto-gray-200 pt-4">
          <h3 className="font-medium">예약 정보 입력</h3>
          
          {/* 기본 예약 정보 입력 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">이름 <span className="text-red-500">*</span></Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ customerName: e.target.value })}
                placeholder="예약자 이름을 입력해주세요"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">업체명</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ companyName: e.target.value })}
                placeholder="업체명을 입력해주세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shootingPurpose">촬영 목적</Label>
              <Input
                id="shootingPurpose"
                value={formData.shootingPurpose}
                onChange={(e) => setFormData({ shootingPurpose: e.target.value })}
                placeholder="촬영 목적을 입력해주세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleNumber">차량번호 (선택)</Label>
              <Input
                id="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ vehicleNumber: e.target.value })}
                placeholder="차량번호를 입력해주세요"
              />
            </div>
          </div>

          {/* 적립/쿠폰 시간 사용 섹션 */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-medium mb-4">적립/쿠폰 시간 사용</h4>
            <TimeUsageSelector
              totalMinutes={selectedTimeRange.duration * 60}
              hourlyRate={selectedTimeRange.price / selectedTimeRange.duration}
              isVisible={true}
            />
          </div>

          {/* 개인정보 동의 및 완료 버튼 */}
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="privacyAgreed" 
                checked={formData.privacyAgreed}
                onCheckedChange={(checked) => setFormData({ privacyAgreed: checked as boolean })}
                required
              />
              <Label 
                htmlFor="privacyAgreed" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                개인정보 수집 및 이용에 동의합니다 <span className="text-red-500">*</span>
              </Label>
            </div>
            
            <Button
              onClick={handleCompleteBooking}
              className="w-full bg-pronto-primary hover:bg-pronto-primary/90"
              disabled={isSubmitting || !formData.privacyAgreed}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>예약 생성 중...</span>
                </div>
              ) : (
                <>
                  예약 완료 및 결제하기
                  {timeUsageData.finalPrice > 0 && timeUsageData.finalPrice !== selectedTimeRange.price && (
                    <span className="ml-2 text-sm">
                      ({timeUsageData.finalPrice.toLocaleString()}원)
                    </span>
                  )}
                </>
              )}
            </Button>
            
            <p className="text-xs text-pronto-gray-500">
              * 예약 시 입력하신 개인정보는 예약 관리 목적으로만 사용됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// 기존 코드와의 호환성을 위한 default export
export default BookingForm;