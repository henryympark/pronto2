"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, MapPin, Calendar, CreditCard, User, Mail, Phone, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// 테스트용 더미 데이터 타입
interface DummyReservation {
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
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  payment_method: string;
  services: {
    name: string;
    price_per_hour: number;
    location: string;
    image_url: string | null;
    description: string;
  };
}

export default function PaymentCompleteDemoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // 더미 예약 데이터
  const [reservation, setReservation] = useState<DummyReservation | null>(null);
  
  useEffect(() => {
    // 1.5초 후 로딩 완료 (실제 API 호출 느낌 구현)
    const timer = setTimeout(() => {
      // 테스트용 더미 데이터 생성
      const dummyReservation: DummyReservation = {
        id: "demo-reservation-" + Math.floor(Math.random() * 1000),
        service_id: "service-001",
        customer_id: "customer-001",
        reservation_date: format(new Date(), "yyyy-MM-dd"),
        start_time: "14:00",
        end_time: "16:00",
        total_hours: 2,
        total_price: 50000,
        status: "confirmed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer_name: "홍길동",
        customer_email: "honggildong@example.com",
        customer_phone: "010-1234-5678",
        payment_method: "신용카드",
        services: {
          name: "프론토 A 프리미엄 서비스",
          price_per_hour: 25000,
          location: "서울시 강남구 테헤란로 123 프론토타워 5층",
          image_url: null,
          description: "프론토의 대표 서비스로, 최고의 품질과 서비스를 제공합니다."
        }
      };
      
      setReservation(dummyReservation);
      setLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  // 날짜 및 시간 포맷 함수
  const formatDateTime = (dateStr: string, timeStr: string) => {
    // reservationDate 형식이 "YYYY-MM-DD"라고 가정
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);
    
    const date = new Date(year, month - 1, day, hours, minutes);
    return format(date, "yyyy년 MM월 dd일 (EEE) HH:mm", { locale: ko });
  };

  // 공유하기 기능
  const handleShare = async () => {
    if (!reservation) return;
    
    const shareData = {
      title: `${reservation.services.name} 예약 완료`,
      text: `${formatDateTime(reservation.reservation_date, reservation.start_time)}에 ${reservation.services.name} 예약이 완료되었습니다.`,
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
        });
      }
    } catch (err) {
      console.error("공유 오류:", err);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-t-pronto-primary rounded-full animate-spin"></div>
            <p className="mt-4 text-pronto-gray-600">예약 정보를 불러오는 중...</p>
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
              <div className="mt-2 bg-yellow-50 text-yellow-700 text-sm py-1 px-2 rounded inline-block">
                데모 페이지입니다
              </div>
            </div>
            
            {reservation && (
              <>
                {/* 서비스 정보 */}
                <div className="bg-pronto-primary/5 rounded-lg p-6 mb-6">
                  <h2 className="font-bold text-lg mb-3">{reservation.services.name}</h2>
                  <p className="text-sm text-pronto-gray-600 mb-4">
                    {reservation.services.description}
                  </p>
                  
                  <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 text-pronto-gray-500 mr-2" />
                    <span>{reservation.services.location}</span>
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
                      <div className="flex items-center text-sm text-pronto-gray-500">
                        <Mail className="w-3.5 h-3.5 mr-1" />
                        <span>{reservation.customer_email}</span>
                      </div>
                      <div className="flex items-center text-sm text-pronto-gray-500">
                        <Phone className="w-3.5 h-3.5 mr-1" />
                        <span>{reservation.customer_phone}</span>
                      </div>
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
                        <span>{reservation.services.price_per_hour.toLocaleString()}원 × {reservation.total_hours}시간</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>총 결제 금액</span>
                        <span>{reservation.total_price.toLocaleString()}원</span>
                      </div>
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
              <Button 
                onClick={() => router.push("/my")} 
                className="w-full bg-pronto-primary hover:bg-pronto-primary/90"
              >
                예약 내역 확인하기
              </Button>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => router.push("/service/pronto-a")} 
                  className="flex-1"
                >
                  홈으로 돌아가기
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleShare}
                  className="px-4"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 