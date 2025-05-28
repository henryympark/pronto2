"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO, addMinutes, isBefore } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, ChevronLeft } from "lucide-react";
import { toast } from "@/shared/hooks/useToast";
import { TimeRangeSelector } from "@/domains/booking";
import PriceChangeInfo from "@/components/PriceChangeInfo";

// 타임 슬롯 타입
type TimeSlot = {
  time: string;
  status: 'available' | 'unavailable' | 'selected' | 'disabled';
};

// 예약 타입
type Reservation = {
  id: string;
  service_id: string;
  customer_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  total_price: number;
  status: string;
  created_at: string;
  updated_at: string;
};

// 서비스 타입
type Service = {
  id: string;
  name: string;
  price_per_hour: number;
};

export default function ChangeReservationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const reservationId = params.reservationId as string;
  const supabase = useSupabase();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<{
    start: string;
    end: string;
    duration: number;
    price: number;
  }>({
    start: "",
    end: "",
    duration: 0,
    price: 0
  });
  const [priceChange, setPriceChange] = useState<{
    originalPrice: number;
    newPrice: number;
    difference: number;
    isAdditionalPayment: boolean;
    isRefund: boolean;
  }>({
    originalPrice: 0,
    newPrice: 0,
    difference: 0,
    isAdditionalPayment: false,
    isRefund: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 예약 정보 불러오기
  useEffect(() => {
    const fetchReservationDetails = async () => {
      if (!user || !reservationId) return;

      try {
        setIsLoading(true);

        // 예약 정보 조회
        const { data: reservationData, error: reservationError } = await supabase
          .from('reservations')
          .select('*')
          .eq('id', reservationId)
          .eq('customer_id', user.id)
          .single();

        if (reservationError) {
          console.error('예약 정보 조회 실패:', reservationError);
          toast({
            title: "예약 정보 조회 실패",
            description: "예약 정보를 불러오는데 실패했습니다.",
            variant: "destructive",
          });
          router.push('/my');
          return;
        }

        console.log('불러온 예약 정보:', {
          start_time: reservationData.start_time,
          end_time: reservationData.end_time
        });
        
        setReservation(reservationData);
        
        // 원래 가격 정보 설정
        const originalPrice = reservationData.total_price;
        
        setPriceChange(prev => ({
          ...prev,
          originalPrice: originalPrice
        }));

        // 예약 상태가 confirmed 또는 modified가 아닌 경우 변경 불가
        if (reservationData.status !== 'confirmed' && reservationData.status !== 'modified') {
          toast({
            title: "예약 변경 불가",
            description: "확정된 예약 또는 이미 변경된 예약만 변경할 수 있습니다.",
            variant: "destructive",
          });
          router.push('/my');
          return;
        }

        // 예약 시작 시간이 현재 시간으로부터 1분 이내인지 확인
        // 예약 날짜와 시간을 모두 고려하여 Date 객체 생성
        const getReservationDateTime = (dateStr: string, timeStr: string) => {
          const [year, month, day] = dateStr.split('-').map(Number);
          const [hours, minutes] = timeStr.split(':').map(Number);
          
          return new Date(year, month - 1, day, hours, minutes, 0);
        };
        
        const reservationDateTime = getReservationDateTime(
          reservationData.reservation_date, 
          reservationData.start_time
        );
        const oneMinuteBeforeStart = addMinutes(new Date(), 1);
        
        console.log('예약 변경 시간 비교:', {
          reservation_date: reservationData.reservation_date,
          start_time: reservationData.start_time,
          reservationDateTime: reservationDateTime.toISOString(),
          currentTime: new Date().toISOString(),
          oneMinuteBeforeStart: oneMinuteBeforeStart.toISOString(),
          canChange: isBefore(oneMinuteBeforeStart, reservationDateTime)
        });
        
        if (isBefore(reservationDateTime, oneMinuteBeforeStart)) {
          toast({
            title: "예약 변경 불가",
            description: "예약 시작 1분 전부터는 예약을 변경할 수 없습니다.",
            variant: "destructive",
          });
          router.push('/my');
          return;
        }

        // 서비스 정보 조회
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('id, name, price_per_hour')
          .eq('id', reservationData.service_id)
          .single();

        if (serviceError) {
          console.error('서비스 정보 조회 실패:', serviceError);
        } else {
          setService(serviceData);
        }

        // 예약 날짜를 초기 선택 날짜로 설정
        setSelectedDate(new Date(reservationData.reservation_date));

      } catch (error) {
        console.error('예약 정보 조회 중 오류 발생:', error);
        toast({
          title: "오류 발생",
          description: "예약 정보를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (!loading && user) {
      fetchReservationDetails();
    } else if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, reservationId, router]);

  // 예약 정보가 로드된 후 초기 시간 정보 로그 출력
  useEffect(() => {
    if (reservation) {
      console.log('TimeRangeSelector에 전달할 초기 시간 정보:', {
        initialStartTime: reservation.start_time,
        initialEndTime: reservation.end_time,
        formattedStartTime: reservation.start_time.substring(0, 5),
        formattedEndTime: reservation.end_time.substring(0, 5)
      });
    }
  }, [reservation]);

  // 시간 범위 선택 핸들러
  const handleTimeRangeChange = (startTime: string, endTime: string, duration: number, price: number) => {
    setSelectedTimeRange({
      start: startTime,
      end: endTime,
      duration,
      price
    });
    
    // 가격 차이 계산
    if (reservation) {
      const originalPrice = reservation.total_price;
      const difference = price - originalPrice;
      
      setPriceChange({
        originalPrice,
        newPrice: price,
        difference: Math.abs(difference),
        isAdditionalPayment: difference > 0,
        isRefund: difference < 0
      });
    }
  };

  // 예약 변경 요청
  const handleSubmit = async () => {
    if (!user || !reservation || !selectedDate || !selectedTimeRange.start || !selectedTimeRange.end) {
      toast({
        title: "입력 오류",
        description: "모든 필수 정보를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // 날짜 포맷팅
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');

      // 시간 형식을 HH:MM:SS 형식으로 변환 (데이터베이스의 time without time zone 타입에 맞춤)
      const startTimeFormatted = `${selectedTimeRange.start}:00`;
      const endTimeFormatted = `${selectedTimeRange.end}:00`;

      console.log("예약 변경 정보:", {
        reservation_date: formattedDate,
        start_time: startTimeFormatted,
        end_time: endTimeFormatted,
        total_hours: selectedTimeRange.duration,
        status: 'modified',
        // 아직 데이터베이스에 필드가 없으므로 주석 처리
        // recalculated_total_amount: selectedTimeRange.price,
        // pending_payment_amount: priceChange.isAdditionalPayment ? priceChange.difference : 0,
        // pending_refund_amount: priceChange.isRefund ? priceChange.difference : 0
      });



      // 예약 정보 업데이트
      const { error } = await supabase
        .from('reservations')
        .update({
          reservation_date: formattedDate,
          start_time: startTimeFormatted,
          end_time: endTimeFormatted,
          total_hours: selectedTimeRange.duration,
          status: 'modified',
          total_price: selectedTimeRange.price, // 새 가격으로 업데이트
          updated_at: new Date().toISOString()
        })
        .eq('id', reservation.id)
        .eq('customer_id', user.id);

      if (error) {
        console.error("예약 변경 오류:", JSON.stringify(error, null, 2));
        throw new Error(`예약 변경 실패: ${error.message}`);
      }

      // 가격 변동 정보 업데이트 시도 (필드가 없을 수 있으므로 별도 처리)
      try {
        await supabase
          .from('reservations')
          .update({
            original_total_price: reservation.total_price,
            recalculated_total_amount: selectedTimeRange.price,
            pending_payment_amount: priceChange.isAdditionalPayment ? priceChange.difference : 0,
            pending_refund_amount: priceChange.isRefund ? priceChange.difference : 0
          })
          .eq('id', reservation.id)
          .eq('customer_id', user.id);
      } catch (updateError) {
        // 필드가 없어서 오류가 발생해도 예약 변경 자체는 성공으로 처리
        console.warn("가격 변동 정보 업데이트 실패 (필드가 없을 수 있음):", updateError);
      }

      // 웹훅 이벤트 발생 (booking.changed)
      await fetch('/api/webhooks/booking-changed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId: reservation.id,
          customerId: user.id,
          serviceId: reservation.service_id,
          oldStartTime: reservation.start_time,
          oldEndTime: reservation.end_time,
          newStartTime: startTimeFormatted,
          newEndTime: endTimeFormatted,
          reservationDate: formattedDate,
          priceChange: {
            originalPrice: priceChange.originalPrice,
            newPrice: priceChange.newPrice,
            difference: priceChange.difference,
            isAdditionalPayment: priceChange.isAdditionalPayment,
            isRefund: priceChange.isRefund
          }
        }),
      });

      toast({
        title: "예약 변경 완료",
        description: "예약이 성공적으로 변경되었습니다.",
      });

      // 마이페이지로 이동
      router.push('/my');
    } catch (error) {
      console.error('예약 변경 중 오류 발생:', error);
      toast({
        title: "예약 변경 실패",
        description: "예약 변경 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          뒤로
        </Button>
        <h1 className="text-2xl font-bold">예약 변경</h1>
      </div>

      {reservation && service && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>현재 예약 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><span className="font-medium">서비스:</span> {service.name}</p>
              <p>
                <span className="font-medium">예약 날짜:</span> {format(new Date(reservation.reservation_date), 'yyyy년 MM월 dd일 (eee)', { locale: ko })}
              </p>
              <p>
                <span className="font-medium">예약 시간:</span> {reservation.start_time.substring(0, 5)} ~ {reservation.end_time.substring(0, 5)}
              </p>
              <p>
                <span className="font-medium">원래 금액:</span> {priceChange.originalPrice.toLocaleString()}원
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>새 예약 정보 선택</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">날짜 선택</h3>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    required={false} 
                    selected={selectedDate || undefined}
                    onSelect={(date) => setSelectedDate(date || null)}
                    className="border rounded-md p-2"
                    disabled={(date) => {
                      // 오늘 이전 날짜는 선택 불가
                      return date < new Date(new Date().setHours(0, 0, 0, 0));
                    }}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">시간 선택</h3>
                {selectedDate ? (
                  <div className="space-y-4">
                    {service && reservation && (
                      <TimeRangeSelector
                        serviceId={service.id}
                        selectedDate={selectedDate}
                        onTimeRangeChange={handleTimeRangeChange}
                        pricePerHour={service.price_per_hour}
                        initialStartTime={reservation.start_time}
                        initialEndTime={reservation.end_time}
                      />
                    )}
                    
                    <div className="p-3 bg-muted rounded-md max-w-[350px] mx-auto">
                      <p className="font-medium">
                        {selectedTimeRange.start && selectedTimeRange.end 
                          ? `${selectedTimeRange.start} ~ ${selectedTimeRange.end} (${selectedTimeRange.duration}시간)` 
                          : "시간을 선택해주세요"}
                      </p>
                      <p className="mt-1">
                        {selectedTimeRange.price > 0 ? `${selectedTimeRange.price.toLocaleString()}원` : ""}
                      </p>
                    </div>
                    
                    {/* 가격 변동 정보 표시 */}
                    {selectedTimeRange.price > 0 && priceChange.originalPrice > 0 && (
                      <div className="max-w-[350px] mx-auto">
                        <PriceChangeInfo 
                          originalPrice={priceChange.originalPrice}
                          newPrice={priceChange.newPrice}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">날짜를 먼저 선택해주세요.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedTimeRange.start || !selectedTimeRange.end || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                '예약 변경하기'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 
