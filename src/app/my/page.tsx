"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient$ } from "@/lib/supabase";
import { format, parseISO, addMinutes, isBefore, isAfter } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PriceChangeInfo from "@/components/PriceChangeInfo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTimeWithoutSeconds } from "@/lib/date-utils";
import { ReservationStatus } from "@/types";
import { AppError, ErrorCode } from "@/types";
import { handleError, logError, getUserFriendlyErrorMessage } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// 서비스 타입 정의
interface Service {
  id: string;
  name: string;
}

// 예약 타입 정의
interface Reservation {
  id: string;
  service_id: string;
  customer_id?: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  total_price: number;
  status: string;
  customer_name?: string;
  created_at: string;
  updated_at: string;
  // 가격 변동 관련 필드
  original_total_price?: number;
  recalculated_total_amount?: number;
  pending_payment_amount?: number;
  pending_refund_amount?: number;
  // 환불 관련 필드
  paid_amount?: number;
  refunded?: boolean;
  refunded_at?: string;
  // UI에서 사용하는 파생 필드
  service?: Service;
  company_name?: string;
  purpose?: string;
  car_number?: string;
  memo?: string;
}

// 필터 유형 정의
type FilterType = 'all' | 'upcoming' | 'completed' | 'cancelled';

// 디버깅 정보 타입
interface DebugInfo {
  reservations?: Reservation[];
  count?: number;
  message?: string;
}

export default function MyPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  
  // 회원 탈퇴 관련 상태
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // 예약 변경/취소 관련 상태
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelingReservation, setCancelingReservation] = useState<Reservation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // 디버깅 상태
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  // 로그아웃 처리 함수
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("로그아웃 에러:", error);
      toast({
        title: "로그아웃 실패",
        description: "로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  // 디버깅 함수
  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('/api/debug/reservations');
      const data = await response.json() as DebugInfo;
      console.log('디버깅 정보:', data);
      setDebugInfo(data);
    } catch (error) {
      console.error('디버깅 정보 조회 실패:', error);
    }
  };

  // 테스트 서비스 생성 함수
  const createTestService = async () => {
    try {
      const response = await fetch('/api/debug/create-test-service');
      const data = await response.json() as { success: boolean; error?: string };
      console.log('테스트 서비스 생성 결과:', data);
      toast({
        title: "테스트 서비스 생성",
        description: data.success 
          ? "테스트 서비스가 성공적으로 생성되었습니다." 
          : data.error || "오류가 발생했습니다.",
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error('테스트 서비스 생성 실패:', error);
      toast({
        title: "테스트 서비스 생성 실패",
        description: "API 호출 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 테스트 예약 생성 함수
  const createTestReservations = async () => {
    try {
      const response = await fetch('/api/debug/create-test-reservation');
      const data = await response.json() as { success: boolean; count?: number; error?: string };
      console.log('테스트 예약 생성 결과:', data);
      toast({
        title: "테스트 예약 생성",
        description: data.success 
          ? `${data.count}개의 테스트 예약이 성공적으로 생성되었습니다.` 
          : data.error || "오류가 발생했습니다.",
        variant: data.success ? "default" : "destructive",
      });
      
      // 예약 목록 새로고침
      if (data.success) {
        fetchReservations();
      }
    } catch (error) {
      console.error('테스트 예약 생성 실패:', error);
      toast({
        title: "테스트 예약 생성 실패",
        description: "API 호출 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 예약 데이터를 가져오는 함수를 컴포넌트 외부로 분리
  const fetchReservations = async () => {
    if (!user || !user.id) return; // 사용자 정보가 없거나 ID가 없으면 조기 종료
    
    try {
      setIsLoading(true);
      const supabase = createClient$();
      
      // DB 응답 타입 정의
      interface ReservationDBResponse {
        id: string;
        service_id: string;
        customer_id: string | null;
        reservation_date: string;
        start_time: string;
        end_time: string;
        total_hours: number;
        total_price: number;
        status: string;
        customer_name: string | null;
        created_at: string;
        updated_at: string;
        service: Service | Service[] | null;
        company_name: string | null;
        shooting_purpose: string | null;
        vehicle_number: string | null;
        paid_amount?: number;
        refunded?: boolean;
        refunded_at?: string | null;
      }
      
      // 실제 DB 스키마에 맞게 쿼리 수정 - 환불 관련 필드 제외
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          service_id,
          customer_id,
          reservation_date,
          start_time,
          end_time,
          total_hours,
          total_price,
          status,
          customer_name,
          created_at,
          updated_at,
          service:services(id, name),
          company_name,
          shooting_purpose,
          vehicle_number
        `)
        .eq('customer_id', user.id)
        .order('reservation_date', { ascending: false });

      if (error) {
        throw handleError(
          error, 
          ErrorCode.DATABASE_ERROR,
          '예약 정보 조회 실패',
          '예약 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
        );
      }
      
      console.log('조회된 예약 정보:', data);
      
      // 안전하게 데이터 변환
      if (data && data.length > 0) {
        const formattedData: Reservation[] = data.map((item: ReservationDBResponse) => {
          // service가 null일 경우 기본값 제공
          const serviceData = item.service 
            ? (Array.isArray(item.service) && item.service.length > 0
              ? item.service[0]
              : item.service)
            : { id: item.service_id, name: '알 수 없는 서비스' };
          
          return {
            ...item,
            service: serviceData as Service,
            // DB에서 가져온 필드 값 활용
            company_name: item.company_name || '',
            purpose: item.shooting_purpose || '',
            car_number: item.vehicle_number || '',
            memo: '', // 빈 문자열로 설정
            // 환불 관련 필드 기본값 설정
            paid_amount: item.paid_amount || 0,
            refunded: item.refunded || false,
            refunded_at: item.refunded_at || null
          };
        });
        
        // 가격 변동 정보 추가 시도 (필드가 없을 수 있음)
        try {
          // 예약 ID 목록 추출
          const reservationIds = formattedData.map(res => res.id);
          
          // 가격 변동 정보 타입 정의
          interface PriceChangeData {
            id: string;
            original_total_price: number | null;
            recalculated_total_amount: number | null;
            pending_payment_amount: number | null;
            pending_refund_amount: number | null;
          }
          
          // 가격 변동 정보 조회 (필드가 있는 경우에만 성공)
          const { data: priceChangeData, error: priceChangeError } = await supabase
            .from('reservations')
            .select(`
              id,
              original_total_price,
              recalculated_total_amount,
              pending_payment_amount,
              pending_refund_amount
            `)
            .in('id', reservationIds);
          
          if (priceChangeError) {
            // 가격 변동 정보 조회 실패는 치명적인 오류가 아니므로 로깅만 하고 계속 진행
            logError(priceChangeError, { 
              context: '가격 변동 정보 조회', 
              reservationIds 
            });
          } else if (priceChangeData && priceChangeData.length > 0) {
            // 가격 변동 정보를 예약 데이터에 병합
            const priceChangeMap = new Map(
              (priceChangeData as PriceChangeData[]).map(item => [item.id, {
                original_total_price: item.original_total_price,
                recalculated_total_amount: item.recalculated_total_amount,
                pending_payment_amount: item.pending_payment_amount,
                pending_refund_amount: item.pending_refund_amount
              }])
            );
            
            formattedData.forEach(reservation => {
              const priceChangeInfo = priceChangeMap.get(reservation.id);
              if (priceChangeInfo) {
                Object.assign(reservation, priceChangeInfo);
              }
            });
          }
        } catch (priceChangeError) {
          // 가격 변동 정보 조회 실패는 치명적인 오류가 아니므로 로깅만 하고 계속 진행
          logError(priceChangeError, { 
            context: '가격 변동 정보 조회 예외',
            message: '필드가 없을 수 있음'
          });
        }
        
        console.log('포맷된 예약 정보:', formattedData);
        setReservations(formattedData);
        applyFilter(formattedData, activeFilter);
      } else {
        // 데이터가 없는 경우 빈 배열로 설정
        console.log('조회된 예약 정보가 없습니다.');
        setReservations([]);
        setFilteredReservations([]);
      }
    } catch (error) {
      const appError = handleError(
        error,
        ErrorCode.UNKNOWN_ERROR,
        '예약 정보 조회 중 오류 발생',
        '예약 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
      );
      
      logError(appError, { context: 'fetchReservations', userId: user?.id });
      
      toast({
        title: "예약 정보 조회 실패",
        description: getUserFriendlyErrorMessage(appError),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 비로그인 상태이고 로딩이 끝난 경우 로그인 페이지로 리다이렉트
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    // 로딩이 완료되고 사용자가 있을 때만 예약 정보 조회
    if (!loading && user) {
      fetchReservations();
    }
  }, [user, loading]);

  // 필터 적용 함수 수정
  const applyFilter = (data: Reservation[], filter: FilterType) => {
    console.log('필터 적용 시작:', { filter, dataLength: data.length });
    
    if (!data || data.length === 0) {
      console.log('필터링할 데이터가 없습니다.');
      setFilteredReservations([]);
      return;
    }
    
    const now = new Date();
    
    try {
      let filtered: Reservation[] = [];
      
      switch (filter) {
        case 'upcoming':
          // 이용 예정: status가 confirmed 또는 modified이고, 현재 시간 이후에 예약된 것
          filtered = data.filter(res => {
            try {
              if (!res.reservation_date || !res.end_time) return false;
              
              // 예약 날짜와 종료 시간을 Date 객체로 변환
              const [year, month, day] = res.reservation_date.split('-').map(Number);
              const [hours, minutes] = res.end_time.split(':').map(Number);
              const endDateTime = new Date(year, month - 1, day, hours, minutes);
              
              // 상태 확인 및 시간 비교
              const isUpcoming = (res.status === 'confirmed' || res.status === 'modified') && 
                                endDateTime > now;
              
              console.log(`예약 ID ${res.id} 이용예정 필터링:`, { 
                status: res.status, 
                endDateTime: endDateTime.toISOString(), 
                now: now.toISOString(), 
                isUpcoming
              });
              
              return isUpcoming;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
              console.error('이용예정 필터링 오류:', errorMessage, res);
              return false;
            }
          });
          break;
        case 'completed':
          // 이용 완료: status가 completed이거나, (confirmed/modified이면서 end_time이 현재 시간 이전)
          filtered = data.filter(res => {
            try {
              if (!res.reservation_date || !res.end_time) return false;
              
              // 예약 날짜와 종료 시간을 Date 객체로 변환
              const [year, month, day] = res.reservation_date.split('-').map(Number);
              const [hours, minutes] = res.end_time.split(':').map(Number);
              const endDateTime = new Date(year, month - 1, day, hours, minutes);
              
              // 상태 확인 및 시간 비교
              const isCompleted = res.status === 'completed' || 
                    ((res.status === 'confirmed' || res.status === 'modified') && endDateTime <= now);
              
              console.log(`예약 ID ${res.id} 이용완료 필터링:`, { 
                status: res.status, 
                endDateTime: endDateTime.toISOString(), 
                now: now.toISOString(), 
                isCompleted
              });
              
              return isCompleted;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
              console.error('이용완료 필터링 오류:', errorMessage, res);
              return false;
            }
          });
          break;
        case 'cancelled':
          // 취소 내역: status가 cancelled인 예약
          filtered = data.filter(res => {
            const isCancelled = res.status === 'cancelled';
            console.log(`예약 ID ${res.id} 취소내역 필터링:`, { status: res.status, isCancelled });
            return isCancelled;
          });
          break;
        case 'all':
        default:
          // 전체: 모든 예약
          filtered = [...data];
          break;
      }
      
      console.log(`필터 '${filter}' 적용 결과:`, { 원본: data.length, 필터링: filtered.length });
      setFilteredReservations(filtered);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error('필터 적용 중 오류 발생:', errorMessage);
      // 오류 발생 시 모든 데이터 표시
      setFilteredReservations(data);
    }
  };

  // 필터 변경 핸들러 수정
  const handleFilterChange = (filter: FilterType) => {
    console.log('필터 변경:', { 이전: activeFilter, 새로운: filter });
    setActiveFilter(filter);
    applyFilter(reservations, filter);
  };

  // 예약 상세 정보 모달 열기
  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };
  
  // 예약 변경 페이지로 이동
  const handleChangeReservation = (reservationId: string) => {
    router.push(`/my/reservations/${reservationId}/change`);
  };
  
  // 예약 상태에 따른 색상 클래스 반환 함수 수정
  const getStatusColorClass = (reservation: Reservation) => {
    // 취소된 예약인 경우 환불 상태에 따라 다른 색상 적용
    if (reservation.status === 'cancelled') {
      // 결제 금액이 0인 경우
      if (!reservation.paid_amount || reservation.paid_amount === 0) {
        return 'bg-gray-100 text-gray-700';
      }
      
      // 환불 완료된 경우
      if (reservation.refunded === true && reservation.refunded_at) {
        return 'bg-blue-100 text-blue-700';
      }
      
      // 환불 처리 중인 경우
      return 'bg-yellow-100 text-yellow-700';
    }
    
    // 현재 시간과 예약 시간 비교
    const now = new Date();
    
    try {
      if (reservation.reservation_date && reservation.end_time) {
        const [year, month, day] = reservation.reservation_date.split('-').map(Number);
        const [hours, minutes] = reservation.end_time.split(':').map(Number);
        const endDateTime = new Date(year, month - 1, day, hours, minutes);
        
        // 예약 시간이 지난 경우
        if (endDateTime <= now) {
          return 'bg-green-100 text-green-700';
        }
      }
    } catch (error) {
      console.error('예약 상태 색상 확인 중 오류:', error);
    }
    
    // 기본 상태 색상
    switch (reservation.status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'modified':
        return 'bg-purple-100 text-purple-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // 예약 상태에 따른 배지 스타일 결정
  const getStatusText = (reservation: Reservation): string => {
    // 취소된 예약인 경우 환불 상태에 따라 다르게 표시
    if (reservation.status === 'cancelled') {
      // 결제 금액이 0인 경우
      if (!reservation.paid_amount || reservation.paid_amount === 0) {
        return '취소됨';
      }
      
      // 환불 완료된 경우
      if (reservation.refunded === true && reservation.refunded_at) {
        return '환불 완료';
      }
      
      // 환불 처리 중인 경우
      return '환불 처리 중';
    }
    
    // 현재 시간과 예약 시간 비교
    const now = new Date();
    
    try {
      if (reservation.reservation_date && reservation.end_time) {
        const [year, month, day] = reservation.reservation_date.split('-').map(Number);
        const [hours, minutes] = reservation.end_time.split(':').map(Number);
        const endDateTime = new Date(year, month - 1, day, hours, minutes);
        
        // 예약 시간이 지난 경우
        if (endDateTime <= now) {
          return '이용 완료';
        }
      }
    } catch (error) {
      console.error('예약 상태 확인 중 오류:', error);
    }
    
    // 기본 상태 표시
    switch (reservation.status) {
      case 'confirmed':
        return '예약 확정';
      case 'pending':
        return '예약 대기';
      case 'modified':
        return '예약 변경됨';
      case 'completed':
        return '이용 완료';
      default:
        return reservation.status || '알 수 없음';
    }
  };

  const formatTimeString = (timeStr: string) => {
    // 시간 문자열 포맷팅 (HH:MM:SS -> HH:MM)
    const match = timeStr.match(/^(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    return timeStr;
  };

  // 예약 변경/취소 가능 여부 확인
  const canChangeReservation = (reservation: Reservation) => {
    if (reservation.status !== 'confirmed' && reservation.status !== 'modified') {
      console.log('예약 변경 불가: 상태가 confirmed 또는 modified가 아님', reservation.status);
      return false;
    }
    
    // 예약 날짜와 시간을 합쳐서 Date 객체 생성
    const getReservationDateTime = (dateStr: string, timeStr: string) => {
      console.log('날짜/시간 변환 입력값:', { dateStr, timeStr });
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      const reservationDate = new Date(year, month - 1, day, hours, minutes, 0);
      console.log('변환된 예약 날짜/시간:', reservationDate.toISOString());
      return reservationDate;
    };
    
    const reservationDateTime = getReservationDateTime(reservation.reservation_date, reservation.start_time);
    const oneMinuteBeforeStart = addMinutes(new Date(), 1);
    
    console.log('예약 변경 시간 비교:', {
      reservation_id: reservation.id,
      reservation_date: reservation.reservation_date,
      start_time: reservation.start_time,
      reservationDateTime: reservationDateTime.toISOString(),
      currentTime: new Date().toISOString(),
      oneMinuteBeforeStart: oneMinuteBeforeStart.toISOString(),
      canChange: isBefore(oneMinuteBeforeStart, reservationDateTime)
    });
    
    return isBefore(oneMinuteBeforeStart, reservationDateTime);
  };
  
  const canCancelReservation = (reservation: Reservation) => {
    if (reservation.status !== 'confirmed' && reservation.status !== 'modified') {
      console.log('예약 취소 불가: 상태가 confirmed 또는 modified가 아님', reservation.status);
      return false;
    }
    
    // 예약 날짜와 시간을 합쳐서 Date 객체 생성
    const getReservationDateTime = (dateStr: string, timeStr: string) => {
      console.log('날짜/시간 변환 입력값:', { dateStr, timeStr });
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      const reservationDate = new Date(year, month - 1, day, hours, minutes, 0);
      console.log('변환된 예약 날짜/시간:', reservationDate.toISOString());
      return reservationDate;
    };
    
    const reservationDateTime = getReservationDateTime(reservation.reservation_date, reservation.start_time);
    const thirtyOneMinutesBeforeStart = addMinutes(new Date(), 31);
    
    console.log('예약 취소 시간 비교:', {
      reservation_id: reservation.id,
      reservation_date: reservation.reservation_date,
      start_time: reservation.start_time,
      reservationDateTime: reservationDateTime.toISOString(),
      currentTime: new Date().toISOString(),
      thirtyOneMinutesBeforeStart: thirtyOneMinutesBeforeStart.toISOString(),
      canCancel: isBefore(thirtyOneMinutesBeforeStart, reservationDateTime)
    });
    
    return isBefore(thirtyOneMinutesBeforeStart, reservationDateTime);
  };
  
  // 예약 취소 처리
  const handleCancelReservation = async () => {
    if (!cancelingReservation || !user) return;
    
    try {
      setIsCancelling(true);
      
      const supabase = createClient$();
      
      // 예약 상태 변경
      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', cancelingReservation.id)
        .eq('customer_id', user.id);
      
      if (error) {
        throw handleError(
          error,
          ErrorCode.DATABASE_ERROR,
          `예약 취소 실패: ${error.message}`,
          '예약 취소 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
        );
      }
      
      // 웹훅 이벤트 발생 (booking.cancelled)
      try {
        await fetch('/api/webhooks/booking-cancelled', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reservationId: cancelingReservation.id,
            customerId: user.id,
            serviceId: cancelingReservation.service_id,
            startTime: cancelingReservation.start_time,
            endTime: cancelingReservation.end_time,
            reservationDate: cancelingReservation.reservation_date,
          }),
        });
      } catch (webhookError) {
        // 웹훅 호출 실패는 사용자 경험에 영향을 주지 않도록 로깅만 수행
        logError(webhookError, {
          context: '예약 취소 웹훅 호출',
          reservationId: cancelingReservation.id
        });
      }
      
      toast({
        title: "예약 취소 완료",
        description: "예약이 성공적으로 취소되었습니다.",
      });
      
      // 예약 목록 새로고침
      await fetchReservations();
      
      // 모달 닫기
      setIsCancelModalOpen(false);
      setCancelingReservation(null);
    } catch (error) {
      const appError = handleError(
        error,
        ErrorCode.UNKNOWN_ERROR,
        '예약 취소 처리 중 오류 발생',
        '예약 취소 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
      );
      
      logError(appError, { 
        context: 'handleCancelReservation', 
        reservationId: cancelingReservation.id,
        userId: user.id
      });
      
      toast({
        title: "예약 취소 실패",
        description: getUserFriendlyErrorMessage(appError),
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // 회원 탈퇴 처리 함수
  const handleDeleteAccount = async () => {
    if (!user || !password) return;

    try {
      setIsDeleting(true);
      setDeleteError("");

      // 비밀번호 검증
      const supabase = createClient$();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email as string,
        password: password,
      });

      if (signInError) {
        setDeleteError("비밀번호가 일치하지 않습니다.");
        return;
      }

      // Supabase Edge Function 호출하여 계정 비활성화
      const { error: functionError } = await supabase.functions.invoke("deactivate-account", {
        body: { user_id: user.id },
      });

      if (functionError) {
        throw functionError;
      }

      // 회원 탈퇴 성공 시 로그아웃 처리
      await signOut();
      router.push("/auth/login?message=account_deactivated");
    } catch (error) {
      console.error("회원 탈퇴 처리 중 오류 발생:", error);
      setDeleteError("회원 탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">마이페이지</h1>
          <div className="flex gap-2">
            {process.env.NODE_ENV === 'development' && (
              <>
                <Button variant="outline" size="sm" onClick={fetchDebugInfo}>
                  디버깅 정보
                </Button>
                <Button variant="outline" size="sm" onClick={createTestService}>
                  테스트 서비스 생성
                </Button>
                <Button variant="outline" size="sm" onClick={createTestReservations}>
                  테스트 예약 생성
                </Button>
                <Button variant="outline" size="sm" onClick={fetchReservations}>
                  예약 새로고침
                </Button>
              </>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </div>

        {debugInfo && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>디버깅 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto max-h-40">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* 사용자 정보 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>내 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">이메일:</span> {user?.email}
                </p>
                <p>
                  <span className="font-semibold">이름:</span> {user?.user_metadata?.name || '미설정'}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="mt-4"
                >
                  회원 탈퇴
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 적립 시간 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>적립 시간</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0분</p>
              <p className="text-sm text-gray-500">리뷰 작성으로 적립 시간을 모아보세요!</p>
            </CardContent>
          </Card>

          {/* 보유 쿠폰 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>보유 쿠폰</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0장</p>
              <p className="text-sm text-gray-500">사용 가능한 쿠폰이 없습니다.</p>
            </CardContent>
          </Card>
        </div>

        {/* 예약 내역 섹션 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>예약 내역</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 필터링 탭 추가 */}
            <Tabs defaultValue="all" className="mb-6" onValueChange={(value) => handleFilterChange(value as FilterType)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">전체</TabsTrigger>
                <TabsTrigger value="upcoming">이용 예정</TabsTrigger>
                <TabsTrigger value="completed">이용 완료</TabsTrigger>
                <TabsTrigger value="cancelled">취소 내역</TabsTrigger>
              </TabsList>
            </Tabs>

            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500">예약 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReservations.map((reservation) => (
                  <Card 
                    key={reservation.id} 
                    className="overflow-hidden hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleReservationClick(reservation)}
                  >
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold mb-1">
                              {reservation.service?.name || '알 수 없는 서비스'}
                            </h3>
                            <Badge className={getStatusColorClass(reservation)}>
                              {getStatusText(reservation)}
                            </Badge>
                            
                            {/* 환불 정보 추가 표시 */}
                            {reservation.status === 'cancelled' && reservation.paid_amount > 0 && (
                              <div className="mt-2 text-sm">
                                {reservation.refunded && reservation.refunded_at ? (
                                  <span className="text-blue-600">
                                    환불 완료일: {format(new Date(reservation.refunded_at), 'yyyy-MM-dd')}
                                  </span>
                                ) : (
                                  <span className="text-yellow-600">
                                    환불 예정 금액: {reservation.paid_amount.toLocaleString()}원
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-gray-500 mb-1">
                              {format(parseISO(reservation.reservation_date), 'yyyy년 MM월 dd일', { locale: ko })}
                              <br />
                              {formatTimeString(reservation.start_time)} ~ {formatTimeString(reservation.end_time)}
                            </p>
                            <p className="font-medium">
                              {reservation.total_price?.toLocaleString() || 0}원
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-600">
                              {reservation.company_name && (
                                <span className="mr-2">회사명: {reservation.company_name}</span>
                              )}
                              {reservation.purpose && (
                                <span>촬영 목적: {reservation.purpose}</span>
                              )}
                            </p>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReservationClick(reservation);
                            }}
                          >
                            상세보기
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 예약 상세 정보 모달 */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>예약 상세 정보</DialogTitle>
            </DialogHeader>
            
            {selectedReservation && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-1">서비스</h4>
                  <p>{selectedReservation.service?.name || '알 수 없는 서비스'}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-1">예약 상태</h4>
                  <Badge className={getStatusColorClass(selectedReservation)}>
                    {getStatusText(selectedReservation)}
                  </Badge>
                  
                  {/* 환불 정보 추가 표시 */}
                  {selectedReservation.status === 'cancelled' && selectedReservation.paid_amount > 0 && (
                    <div className="mt-2">
                      {selectedReservation.refunded && selectedReservation.refunded_at ? (
                        <div className="flex items-center text-blue-600">
                          <span className="mr-1">환불 완료일:</span>
                          <span>{format(new Date(selectedReservation.refunded_at), 'yyyy년 MM월 dd일')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-yellow-600">
                          <span className="mr-1">환불 예정 금액:</span>
                          <span>{selectedReservation.paid_amount.toLocaleString()}원</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="font-semibold mb-1">예약 일시</h4>
                  <p>
                    {format(parseISO(selectedReservation.reservation_date), 'yyyy년 MM월 dd일', { locale: ko })}
                    <br />
                    {formatTimeString(selectedReservation.start_time)} ~ {formatTimeString(selectedReservation.end_time)}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-1">이용 시간</h4>
                  <p>{selectedReservation.total_hours}시간</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-1">결제 정보</h4>
                  <p>총 금액: {selectedReservation.total_price.toLocaleString()}원</p>
                  {selectedReservation.paid_amount > 0 && (
                    <p>결제 금액: {selectedReservation.paid_amount.toLocaleString()}원</p>
                  )}
                </div>
                
                <div>
                  <h4 className="font-semibold mb-1">예약자 정보</h4>
                  <p>{selectedReservation.customer_name || user?.user_metadata?.name || '미설정'}</p>
                </div>
                
                {(selectedReservation.company_name || selectedReservation.purpose || selectedReservation.car_number) && (
                  <div>
                    <h4 className="font-semibold mb-1">추가 정보</h4>
                    {selectedReservation.company_name && (
                      <p>회사명: {selectedReservation.company_name}</p>
                    )}
                    {selectedReservation.purpose && (
                      <p>촬영 목적: {selectedReservation.purpose}</p>
                    )}
                    {selectedReservation.car_number && (
                      <p>차량 번호: {selectedReservation.car_number}</p>
                    )}
                  </div>
                )}
                
                {selectedReservation.memo && (
                  <div>
                    <h4 className="font-semibold mb-1">메모</h4>
                    <p>{selectedReservation.memo}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-semibold mb-1">예약 일시</h4>
                  <p>{format(parseISO(selectedReservation.created_at), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}</p>
                </div>
              </div>
            )}
            
            <DialogFooter className="flex justify-between">
              <div className="flex gap-2">
                {selectedReservation && canChangeReservation(selectedReservation) && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false);
                      handleChangeReservation(selectedReservation.id);
                    }}
                  >
                    예약 변경
                  </Button>
                )}
                {selectedReservation && canCancelReservation(selectedReservation) && (
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      setCancelingReservation(selectedReservation);
                      setIsModalOpen(false);
                      setIsCancelModalOpen(true);
                    }}
                  >
                    예약 취소
                  </Button>
                )}
              </div>
              <Button onClick={() => setIsModalOpen(false)}>닫기</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 회원 탈퇴 확인 모달 */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>회원 탈퇴</DialogTitle>
              <DialogDescription>
                회원 탈퇴 시 모든 정보가 삭제되며, 적립된 시간과 쿠폰도 모두 소멸됩니다.
                정말로 탈퇴하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            {deleteError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>오류</AlertTitle>
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-4">
              <div className="form-group">
                <Label htmlFor="password">비밀번호 확인</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="현재 비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
                취소
              </Button>
              <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  '탈퇴하기'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 예약 취소 확인 모달 */}
        <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>예약 취소</DialogTitle>
              <DialogDescription>
                정말로 예약을 취소하시겠습니까? 취소 정책에 따라 환불 금액이 달라질 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCancelModalOpen(false)} disabled={isCancelling}>
                아니오
              </Button>
              <Button variant="destructive" onClick={handleCancelReservation} disabled={isCancelling}>
                {isCancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    취소 중...
                  </>
                ) : (
                  '예약 취소'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
} 