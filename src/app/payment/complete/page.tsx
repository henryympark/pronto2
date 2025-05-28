"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, MapPin, Calendar, Clock, CreditCard, User, Mail, Phone, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Reservation } from "@/types/reservation";
import { useSupabase } from "@/contexts/SupabaseContext"; // ✅ 올바른 훅 사용
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

// Reservation에 customer_name이 포함된 확장 타입 정의
interface ReservationWithDetails extends Reservation {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method?: string;
  // 할인 관련 필드 추가
  final_price?: number;
  original_total_price?: number;
  used_coupon_ids?: string[];
  used_accumulated_time_minutes?: number;
  services?: {
    name: string;
    price_per_hour: number;
    location: string | null;
    image_url: string | null;
    description: string | null;
  };
}

function PaymentCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId");
  const [reservation, setReservation] = useState<ReservationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabase(); // ✅ 올바른 훅 사용
  const { toast } = useToast(); // ✅ useToast 훅 사용

  useEffect(() => {
    // ✅ URL 파라미터 검증 강화
    if (!reservationId) {
      setError("예약 정보를 찾을 수 없습니다. 올바른 링크를 통해 접근해주세요.");
      setLoading(false);
      return;
    }

    // ✅ UUID 형식 검증 (보안 강화)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(reservationId)) {
      setError("잘못된 예약 ID 형식입니다.");
      setLoading(false);
      return;
    }

    // 예약 정보 조회 - RLS 무한 재귀 문제를 해결하기 위해 두 개의 쿼리로 분리
    const fetchReservation = async () => {
      try {
        // 1. 예약 정보와 서비스 정보만 먼저 조회
        const { data: reservationData, error: reservationError } = await supabase
          .from("reservations")
          .select(`
            *,
            services(name, price_per_hour, location, image_url, description)
          `)
          .eq("id", reservationId)
          .maybeSingle(); // ✅ .single() → .maybeSingle() 변경

        if (reservationError) {
          console.error("예약 조회 오류:", JSON.stringify(reservationError, null, 2));
          setError(`예약 정보를 불러오는 중 문제가 발생했습니다. (${reservationError.code}: ${reservationError.message})`);
          setLoading(false);
          return;
        }

        // ✅ 데이터 존재 여부 확인 강화
        if (!reservationData) {
          console.error("예약 데이터가 없습니다:", reservationId);
          setError("해당 예약을 찾을 수 없습니다. 예약 번호를 다시 확인해주세요.");
          setLoading(false);
          return;
        }

        // 2. 고객 정보를 별도로 조회 (필요한 경우에만)
        let customerData = null;
        if (reservationData.customer_id) {
          const { data: userData, error: userError } = await supabase
            .from("customers")
            .select("email, nickname, phone")
            .eq("id", reservationData.customer_id)
            .maybeSingle(); // ✅ .single() → .maybeSingle() 변경
            
          if (userError) {
            console.warn("고객 정보 조회 오류:", JSON.stringify(userError, null, 2));
            // 고객 정보 조회 실패는 치명적이지 않으므로 진행
          } else {
            customerData = userData;
          }
        }

        console.log("조회된 예약 데이터:", JSON.stringify(reservationData, null, 2));

        // 예약 정보와 고객 정보 결합
        const completeReservationData = {
          ...reservationData,
          customer_name: customerData?.nickname || "고객",
          customer_email: customerData?.email,
          customer_phone: customerData?.phone,
          payment_method: "신용카드", // 실제로는 DB에서 가져와야 함
        } as ReservationWithDetails;

        setReservation(completeReservationData);
        setLoading(false);
      } catch (err) {
        console.error("예약 조회 중 오류:", err);
        setError("예약 정보를 불러오는 중 예상치 못한 오류가 발생했습니다.");
        setLoading(false);
      }
    };

    fetchReservation();
  }, [reservationId, supabase]);

  // 날짜 및 시간 포맷 함수
  const formatDateTime = (dateStr: string, timeStr: string) => {
    try {
      // reservationDate 형식이 "YYYY-MM-DD"라고 가정
      const [year, month, day] = dateStr.split("-").map(Number);
      const [hours, minutes] = timeStr.split(":").map(Number);
      
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
        console.error("날짜/시간 형식 오류:", { dateStr, timeStr });
        return `${dateStr} ${timeStr}`;
      }
      
      const date = new Date(year, month - 1, day, hours, minutes);
      return format(date, "yyyy년 MM월 dd일 (EEE) HH:mm", { locale: ko });
    } catch (err) {
      console.error("날짜 포맷 오류:", err);
      return `${dateStr} ${timeStr}`;
    }
  };

  // 공유하기 기능
  const handleShare = async () => {
    if (!reservation) return;
    
    const shareData = {
      title: `${reservation.services?.name} 예약 완료`,
      text: `${formatDateTime(reservation.reservation_date, reservation.start_time)}에 ${reservation.services?.name} 예약이 완료되었습니다.`,
      url: window.location.href,
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // 클립보드에 복사
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "링크 복사 완료",
          description: "예약 정보 링크가 클립보드에 복사되었습니다.",
          variant: "default"
        });
      }
    } catch (err) {
      console.error("공유 오류:", err);
    }
  };

  // 할인 적용 여부 확인
  const hasDiscount = () => {
    if (!reservation) return false;
    return (reservation.used_coupon_ids && reservation.used_coupon_ids.length > 0) || 
           (reservation.used_accumulated_time_minutes && reservation.used_accumulated_time_minutes > 0);
  };

  // 할인 금액 계산
  const getDiscountAmount = () => {
    if (!reservation || !hasDiscount()) return 0;
    const originalPrice = reservation.original_total_price || reservation.total_price;
    const finalPrice = reservation.final_price || reservation.total_price;
    return Math.max(0, originalPrice - finalPrice);
  };

  // 최종 결제 금액 계산
  const getFinalPrice = () => {
    if (!reservation) return 0;
    return reservation.final_price || reservation.total_price;
  };

  // 원래 금액 계산
  const getOriginalPrice = () => {
    if (!reservation) return 0;
    return reservation.original_total_price || reservation.total_price;
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-t-pronto-primary rounded-full animate-spin"></div>
            <p className="mt-4 text-pronto-gray-600">예약 정보를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Link href="/my">
              <Button className="mb-2">
                마이페이지로 이동
              </Button>
            </Link>
            <div className="text-sm text-gray-500 mt-2">
              문제가 지속되면 고객센터로 문의해주세요.
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-green-50 rounded-full p-3">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold mb-2">예약 완료</h1>
              <p className="text-pronto-gray-600">
                예약이 성공적으로 완료되었습니다.
              </p>
            </div>
            
            {reservation && (
              <>
                {/* 서비스 정보 */}
                <div className="bg-pronto-primary/5 rounded-lg p-6 mb-6">
                  <h2 className="font-bold text-lg mb-3">{reservation.services?.name}</h2>
                  <p className="text-sm text-pronto-gray-600 mb-4">
                    {reservation.services?.description || "프론토 서비스를 이용해 주셔서 감사합니다."}
                  </p>
                  
                  <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 text-pronto-gray-500 mr-2" />
                    <span>{reservation.services?.location || "위치 정보 없음"}</span>
                  </div>
                </div>
                
                {/* 예약 정보 */}
                <div className="space-y-5 mb-6">
                  <h2 className="font-bold text-lg">예약 정보</h2>
                  
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-pronto-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {formatDateTime(reservation.reservation_date, reservation.start_time)}
                      </p>
                      <p className="text-sm text-pronto-gray-500">
                        {reservation.start_time} ~ {reservation.end_time} ({reservation.total_hours}시간)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <User className="w-5 h-5 text-pronto-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium">{reservation.customer_name}</p>
                      {reservation.customer_email && (
                        <div className="flex items-center text-sm text-pronto-gray-500">
                          <Mail className="w-3.5 h-3.5 mr-1" />
                          <span>{reservation.customer_email}</span>
                        </div>
                      )}
                      {reservation.customer_phone && (
                        <div className="flex items-center text-sm text-pronto-gray-500">
                          <Phone className="w-3.5 h-3.5 mr-1" />
                          <span>{reservation.customer_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* 결제 정보 */}
                  <div className="space-y-3">
                    <h3 className="font-medium">결제 정보</h3>
                    
                    <div className="flex items-start space-x-3">
                      <CreditCard className="w-5 h-5 text-pronto-gray-500 mt-0.5" />
                      <div>
                        <p className="font-medium">{reservation.payment_method}</p>
                        <p className="text-sm text-pronto-gray-500">
                          결제일시: {format(new Date(reservation.created_at), "yyyy.MM.dd HH:mm")}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded p-4 mt-2">
                      <div className="flex justify-between mb-2">
                        <span className="text-pronto-gray-600">서비스 이용료</span>
                        <span>{(reservation.services?.price_per_hour || 0).toLocaleString()}원 × {reservation.total_hours}시간</span>
                      </div>
                      
                      {/* 할인 적용 여부에 따른 분기 처리 */}
                      {hasDiscount() ? (
                        <>
                          <div className="flex justify-between mb-2">
                            <span className="text-pronto-gray-600">소계</span>
                            <span>{getOriginalPrice().toLocaleString()}원</span>
                          </div>
                          
                          {/* 쿠폰 할인 */}
                          {reservation.used_coupon_ids && reservation.used_coupon_ids.length > 0 && (
                            <div className="flex justify-between mb-2 text-red-600">
                              <span>쿠폰 할인 ({reservation.used_coupon_ids.length}개)</span>
                              <span>-{Math.floor((reservation.used_coupon_ids.length * 30 * (reservation.services?.price_per_hour || 0)) / 60).toLocaleString()}원</span>
                            </div>
                          )}
                          
                          {/* 적립 시간 할인 */}
                          {reservation.used_accumulated_time_minutes && reservation.used_accumulated_time_minutes > 0 && (
                            <div className="flex justify-between mb-2 text-red-600">
                              <span>적립 시간 할인 ({reservation.used_accumulated_time_minutes}분)</span>
                              <span>-{Math.floor((reservation.used_accumulated_time_minutes * (reservation.services?.price_per_hour || 0)) / 60).toLocaleString()}원</span>
                            </div>
                          )}
                          
                          <Separator className="my-2" />
                          
                          <div className="flex justify-between mb-2">
                            <span className="text-pronto-gray-600">총 할인 금액</span>
                            <span className="text-red-600 font-medium">-{getDiscountAmount().toLocaleString()}원</span>
                          </div>
                          
                          <div className="flex justify-between font-bold text-lg">
                            <span>최종 결제 금액</span>
                            <span className="text-pronto-primary">{getFinalPrice().toLocaleString()}원</span>
                          </div>
                          
                          {/* 절약 메시지 */}
                          <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-3 text-center">
                            <p className="text-green-700 text-sm font-medium">
                              🎉 총 {getDiscountAmount().toLocaleString()}원을 절약했어요!
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between font-bold text-lg">
                          <span>총 결제 금액</span>
                          <span>{reservation.total_price.toLocaleString()}원</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 안내사항 */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-blue-700 mb-2">이용 안내</h3>
                  <ul className="text-sm text-blue-600 space-y-1 list-disc pl-5">
                    <li>예약 시간 10분 전에 도착하시면 원활한 이용이 가능합니다.</li>
                    <li>예약 취소는 마이페이지 &gt; 예약 내역에서 가능합니다.</li>
                    <li>취소 및 환불 규정에 따라 수수료가 발생할 수 있습니다.</li>
                    <li>문의사항은 고객센터(1234-5678)로 연락해주세요.</li>
                  </ul>
                </div>
              </>
            )}
            
            <div className="flex flex-col space-y-3">
              <Link href="/my">
                <Button 
                  className="w-full bg-pronto-primary hover:bg-pronto-primary/90"
                >
                  예약 내역 확인하기
                </Button>
              </Link>
              
              <Button 
                onClick={handleShare}
                variant="outline" 
                className="w-full"
              >
                <Share2 className="w-4 h-4 mr-2" />
                공유하기
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentCompletePage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold text-center mb-8">결제 완료</h1>
      
      <Suspense fallback={
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-t-pronto-primary rounded-full animate-spin"></div>
        </div>
      }>
        <PaymentCompleteContent />
      </Suspense>
    </div>
  );
}