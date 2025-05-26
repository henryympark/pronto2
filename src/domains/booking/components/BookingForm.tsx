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
    showBookingForm, 
    isSubmitting, 
    setFormData, 
    toggleBookingForm, 
    setIsSubmitting,
    loadRecentBookingData
  } = useBookingFormStore();
  
  const { selectedDate, selectedTimeRange, formattedDate } = useReservationStore();
  
  // 예약하기 버튼 클릭 핸들러
  const handleBookingClick = async () => {
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

    // 폼이 열릴 때 사용자의 가장 최근 예약 정보 가져오기
    if (!showBookingForm) {
      console.log('[BookingForm] 최근 예약 정보 로딩 시작');
      await loadRecentBookingData(supabase, user.id);
    }
    
    toggleBookingForm();
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

      // 예약 정보 Supabase DB에 저장
      const { data, error } = await supabase
        .from("reservations")
        .insert({
          service_id: serviceId,
          customer_id: user.id,
          reservation_date: formattedDateStr,
          start_time: startTime,
          end_time: endTime,
          total_hours: selectedTimeRange.duration,
          total_price: selectedTimeRange.price,
          original_total_price: selectedTimeRange.price,
          status: "confirmed",
          customer_name: formData.customerName,
          company_name: formData.companyName || null,
          shooting_purpose: formData.shootingPurpose || null,
          vehicle_number: formData.vehicleNumber || null,
          privacy_agreed: formData.privacyAgreed
        })
        .select()
        .single();

      if (error) {
        console.error("[BookingForm] 예약 생성 오류:", JSON.stringify(error, null, 2));
        toast({
          title: "예약 생성 실패",
          description: `예약 생성 오류: ${error.message || "예약을 생성하는 중 오류가 발생했습니다."}`,
          variant: "destructive"
        } as any);
        setIsSubmitting(false);
        return;
      }

      console.log("[BookingForm] 예약 생성 성공:", data);

      // 예약 성공 시 결제 완료 페이지로 이동
      toast({
        title: "예약이 완료되었습니다",
        description: "예약이 성공적으로 처리되었습니다."
      } as any);
      
      // 결제 완료 페이지로 리디렉션
      router.push(`/payment/complete?reservationId=${data.id}`);
      
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
        <div className="mt-6 space-y-4 border-t border-pronto-gray-200 pt-4">
          <h3 className="font-medium">예약 정보 입력</h3>
          
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

          <div className="flex items-center space-x-2 pt-2">
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
          
          <div className="pt-4">
            <Button
              onClick={handleCompleteBooking}
              className="w-full bg-pronto-primary hover:bg-pronto-primary/90"
              disabled={isSubmitting || !formData.privacyAgreed}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{user ? "예약 생성 중..." : "예약 정보 저장 중..."}</span>
                </div>
              ) : (
                "예약 완료 및 결제하기"
              )}
            </Button>
          </div>
          
          <p className="text-xs text-pronto-gray-500">
            * 예약 시 입력하신 개인정보는 예약 관리 목적으로만 사용됩니다.
          </p>
        </div>
      )}
    </div>
  );
};

// 기존 코드와의 호환성을 위한 default export
export default BookingForm;