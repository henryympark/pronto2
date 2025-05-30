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
  onReservationComplete?: () => void; // 예약 완료 후 호출할 콜백 함수
}

export const BookingForm: React.FC<BookingFormProps> = ({ serviceId, onReservationComplete }) => {
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

      // 1. API를 통한 예약 생성 (동시성 에러 처리 포함)
      const reservationRequestData = {
        reservationDate: formattedDateStr,
        startTime: selectedTimeRange.start,
        endTime: selectedTimeRange.end,
        totalHours: selectedTimeRange.duration,
        totalPrice: selectedTimeRange.price,
        // 예약자 정보 추가
        customerName: formData.customerName,
        companyName: formData.companyName || null,
        shootingPurpose: formData.shootingPurpose || null,
        vehicleNumber: formData.vehicleNumber || null,
        privacyAgreed: formData.privacyAgreed,
        // 할인 관련 정보 추가
        selectedAccumulatedMinutes: timeUsageData.selectedAccumulatedMinutes,
        selectedCouponIds: timeUsageData.selectedCouponIds
      };

      console.log('[BookingForm] API 예약 생성 요청:', reservationRequestData);

      // Supabase 세션에서 액세스 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 세션이 있으면 Authorization 헤더 추가
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const reservationResponse = await fetch(`/api/services/${serviceId}/reservations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(reservationRequestData)
      });

      console.log('[BookingForm] API 응답 상태:', {
        ok: reservationResponse.ok,
        status: reservationResponse.status,
        statusText: reservationResponse.statusText,
        headers: Object.fromEntries(reservationResponse.headers.entries())
      });

      // 응답이 JSON인지 확인
      const contentType = reservationResponse.headers.get('content-type');
      console.log('[BookingForm] 응답 Content-Type:', contentType);

      let reservationResult;
      try {
        if (contentType && contentType.includes('application/json')) {
          reservationResult = await reservationResponse.json();
        } else {
          // JSON이 아닌 경우 텍스트로 읽기
          const textResponse = await reservationResponse.text();
          console.log('[BookingForm] 텍스트 응답:', textResponse);
          reservationResult = { error: 'INVALID_RESPONSE', message: textResponse };
        }
      } catch (jsonError) {
        console.error('[BookingForm] JSON 파싱 에러:', jsonError);
        reservationResult = { error: 'JSON_PARSE_ERROR', message: 'API 응답을 파싱할 수 없습니다.' };
      }

      console.log('[BookingForm] 파싱된 응답 결과:', reservationResult);

      if (!reservationResponse.ok) {
        console.error("[BookingForm] API 예약 생성 실패:", {
          status: reservationResponse.status,
          statusText: reservationResponse.statusText,
          result: reservationResult
        });
        
        // 동시성 에러 처리
        if (reservationResult.error === 'CONCURRENT_BOOKING') {
          toast({
            title: "동시 예약 충돌",
            description: "죄송합니다. 같은 시간에 다른 고객이 먼저 예약을 완료했습니다. 페이지를 새로고침하여 다른 시간을 선택해주세요.",
            variant: "destructive"
          } as any);
          
          // 페이지 새로고침을 위한 사용자 액션 제안
          setTimeout(() => {
            const shouldRefresh = confirm("페이지를 새로고침하여 최신 예약 현황을 확인하시겠습니까?");
            if (shouldRefresh) {
              window.location.reload();
            }
          }, 2000);
          
          setIsSubmitting(false);
          return;
        }

        // 예약 충돌 에러 처리
        if (reservationResult.error === 'BOOKING_CONFLICT') {
          toast({
            title: "예약 시간 충돌",
            description: reservationResult.message || "선택하신 시간에 이미 다른 예약이 있습니다. 다른 시간을 선택해주세요.",
            variant: "destructive"
          } as any);
          setIsSubmitting(false);
          return;
        }

        // 제약 조건 위반 에러 처리
        if (reservationResult.error === 'CONSTRAINT_VIOLATION') {
          toast({
            title: "입력 정보 오류",
            description: "예약 정보가 올바르지 않습니다. 입력 내용을 확인해주세요.",
            variant: "destructive"
          } as any);
          setIsSubmitting(false);
          return;
        }

        // 권한 문제 에러 처리 (RLS 정책 위반)
        if (reservationResult.error === 'PERMISSION_DENIED') {
          toast({
            title: "권한 오류",
            description: "예약 생성 권한이 없습니다. 로그인 상태를 확인해주세요.",
            variant: "destructive"
          } as any);
          setIsSubmitting(false);
          return;
        }

        // 일반적인 에러 처리
        toast({
          title: "예약 생성 실패",
          description: reservationResult.message || "예약을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.",
          variant: "destructive"
        } as any);
        setIsSubmitting(false);
        return;
      }

      const createdReservation = reservationResult.reservation;
      console.log("[BookingForm] API 예약 생성 성공:", createdReservation);

      // 예약 완료 후 시간슬라이더 실시간 반영
      console.log('[BookingForm] 예약 완료 후 시간슬라이더 새로고침 요청');
      onReservationComplete?.();

      // 마이페이지 실시간 반영을 위한 커스텀 이벤트 발생
      console.log('[BookingForm] 마이페이지 새로고침 이벤트 발생');
      window.dispatchEvent(new CustomEvent('reservation-created', {
        detail: { reservationId: createdReservation.id, serviceId }
      }));

      // 성공 토스트 메시지
      toast({
        title: "예약 완료",
        description: isUsingDiscount 
          ? `할인이 적용되어 예약이 완료되었습니다. (최종 금액: ${timeUsageData.finalPrice.toLocaleString()}원)`
          : "예약이 성공적으로 처리되었습니다."
      } as any);

      // 결제 완료 페이지로 리디렉션 (기존 결제 페이지 사용)
      router.push(`/payment/complete?reservationId=${createdReservation.id}`);
      
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