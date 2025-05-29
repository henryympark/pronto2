"use client";

import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import { TimeRangeSelector } from "@/domains/booking";
import { toast } from "@/shared/hooks/useToast";
import { Loader2, Plus, CheckCircle, Play, Edit, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useReservationHistory } from "@/hooks/useReservationHistory";
import ReservationHistoryTimeline from "@/components/ReservationHistoryTimeline";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Reservation = {
  id: string;
  service_id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name: string;
  company_name?: string;
  shooting_purpose?: string;
  vehicle_number?: string;
  admin_memo?: string;
  created_at: string;
  reservation_date?: string;
  total_price?: number;
  final_price?: number;
  privacy_agreed?: boolean;
  // 타임스탬프 조합 필드 (런타임 생성)
  combined_start_time?: string;
  combined_end_time?: string;
  customers: {
    id: string;
    email?: string;
    nickname?: string;
    phone?: string;
  };
  services?: {
    id: string;
    name: string;
    price_per_hour: number;
  };
};

export default function AdminReservationsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  
  // 예약 변경 관련 상태
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

  // 예약 이력 조회 훅
  const { history, loading: historyLoading, error: historyError } = useReservationHistory(
    selectedReservation?.id || null
  );
  
  const supabase = useSupabase();
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    console.log("[어드민 예약 페이지] 초기 데이터 로드 및 Realtime 구독 시작");
    
    // 초기 데이터 로드
    fetchReservations();
    
    // Realtime 구독 설정
    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모든 이벤트
          schema: 'public',
          table: 'reservations'
        },
        (payload) => {
          console.log('[Realtime] 예약 변화 감지:', payload);
          handleRealtimeChange(payload);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] 구독 상태:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          toast({
            title: "실시간 연결됨",
            description: "예약 변경사항이 실시간으로 반영됩니다.",
          });
        } else if (status === 'CHANNEL_ERROR') {
          toast({
            title: "실시간 연결 오류",
            description: "실시간 업데이트에 문제가 발생했습니다.",
            variant: "destructive",
          });
        }
      });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      console.log('[Realtime] 구독 해제');
      supabase.removeChannel(channel);
      setIsRealtimeConnected(false);
    };
  }, [supabase]);
  
  const openReservationDetail = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    try {
      if (timeString) {
        // reservation_date + start_time/end_time 조합으로 정확한 타임스탬프 생성
        const dateTime = `${dateString}T${timeString}`;
        return format(new Date(dateTime), 'yyyy년 M월 d일 HH:mm', { locale: ko });
      } else {
        // 기존 방식 (하위 호환성)
        return format(new Date(dateString), 'yyyy년 M월 d일 HH:mm', { locale: ko });
      }
    } catch (e) {
      return '날짜 형식 오류';
    }
  };

  // 시간 기반 예약 상태 판별 헬퍼 함수 (수정됨)
  const getReservationTimeStatus = (reservation: Reservation) => {
    if (!reservation.reservation_date || !reservation.start_time || !reservation.end_time) {
      return 'unknown';
    }

    const now = new Date();
    // reservation_date + start_time/end_time으로 정확한 타임스탬프 생성
    const startTime = new Date(`${reservation.reservation_date}T${reservation.start_time}`);
    const endTime = new Date(`${reservation.reservation_date}T${reservation.end_time}`);

    if (now < startTime) {
      return 'before_start'; // 시작 전
    } else if (now >= startTime && now <= endTime) {
      return 'in_progress'; // 이용 중
    } else {
      return 'completed'; // 완료 (시간이 지남)
    }
  };

  // 예약 상태별 아이콘을 반환하는 헬퍼 함수
  const getStatusIcon = (reservation: Reservation) => {
    const status = reservation.status || '';
    const timeStatus = getReservationTimeStatus(reservation);
    
    switch (status) {
      case 'confirmed':
        return timeStatus === 'before_start' 
          ? <CheckCircle className="h-3 w-3" />      // 예약 확정 (시작 전)
          : timeStatus === 'in_progress'
          ? <Play className="h-3 w-3" />             // 이용 중
          : <CheckCircle className="h-3 w-3" />;     // 완료
      case 'modified':
        return timeStatus === 'before_start' 
          ? <Edit className="h-3 w-3" />             // 예약 변경 (시작 전)
          : timeStatus === 'in_progress'
          ? <Play className="h-3 w-3" />             // 이용 중
          : <CheckCircle className="h-3 w-3" />;     // 완료
      case 'completed': 
        return <CheckCircle className="h-3 w-3" />;
      case 'cancelled': 
        return <XCircle className="h-3 w-3" />;
      case 'pending':
        return <AlertCircle className="h-3 w-3" />;
      default: 
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getStatusBadgeClass = (reservation: Reservation) => {
    const status = reservation.status || '';
    const timeStatus = getReservationTimeStatus(reservation);
    
    switch (status) {
      case 'confirmed':
        return timeStatus === 'before_start' 
          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'  // 시작 전 - 더 선명한 녹색
          : timeStatus === 'in_progress'
          ? 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse'     // 이용 중 - 애니메이션 추가
          : 'bg-slate-100 text-slate-700 border-slate-200';         // 완료
      case 'modified':
        return timeStatus === 'before_start' 
          ? 'bg-amber-100 text-amber-800 border-amber-200'          // 변경됨 (시작 전) - 더 선명한 노란색
          : timeStatus === 'in_progress'
          ? 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse'        // 이용 중 - 애니메이션 추가
          : 'bg-slate-100 text-slate-700 border-slate-200';         // 완료
      case 'completed': 
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'cancelled': 
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (reservation: Reservation) => {
    const status = reservation.status || '';
    const timeStatus = getReservationTimeStatus(reservation);
    
    switch (status) {
      case 'confirmed':
        return timeStatus === 'before_start' 
          ? '예약 확정 (시작 전)'
          : timeStatus === 'in_progress'
          ? '🔴 현재 이용 중'
          : '이용 완료';
      case 'modified':
        return timeStatus === 'before_start' 
          ? '예약 변경됨 (시작 전)'
          : timeStatus === 'in_progress'
          ? '🔴 현재 이용 중'
          : '이용 완료';
      case 'completed': 
        return '이용 완료';
      case 'cancelled': 
        return '예약 취소';
      case 'pending':
        return '예약 대기중';
      default: 
        return status;
    }
  };

  // 예약 변경 모달 열기
  const openChangeModal = () => {
    if (!selectedReservation) return;
    
    // 예약 날짜 설정
    const reservationDate = selectedReservation.reservation_date 
      ? new Date(selectedReservation.reservation_date)
      : new Date(selectedReservation.start_time.split('T')[0]);
    
    setSelectedDate(reservationDate);
    setIsChangeModalOpen(true);
    setIsModalOpen(false);
  };

  // 예약 취소 모달 열기
  const openCancelModal = () => {
    setIsCancelModalOpen(true);
    setIsModalOpen(false);
  };

  // 시간 범위 변경 핸들러
  const handleTimeRangeChange = useCallback((startTime: string, endTime: string, duration: number, price: number) => {
    setSelectedTimeRange({
      start: startTime,
      end: endTime,
      duration,
      price
    });
  }, []);

  // 예약 변경 처리
  const handleChangeReservation = async () => {
    if (!selectedReservation || !selectedDate || !selectedTimeRange.start || !selectedTimeRange.end) {
      toast({
        title: "입력 오류",
        description: "날짜와 시간을 모두 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const startTimeFormatted = selectedTimeRange.start;
      const endTimeFormatted = selectedTimeRange.end;

      // 예약 정보 업데이트
      const { error } = await supabase
        .from('reservations')
        .update({
          reservation_date: formattedDate,
          start_time: startTimeFormatted,
          end_time: endTimeFormatted,
          total_hours: selectedTimeRange.duration,
          total_price: selectedTimeRange.price,
          status: 'modified',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReservation.id);

      if (error) {
        console.error("예약 변경 오류:", error);
        throw new Error(`예약 변경 실패: ${error.message}`);
      }

      // 웹훅 이벤트 발생 (booking.changed)
      await fetch('/api/webhooks/booking-changed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId: selectedReservation.id,
          customerId: selectedReservation.customer_id,
          serviceId: selectedReservation.service_id,
          oldStartTime: selectedReservation.start_time,
          oldEndTime: selectedReservation.end_time,
          newStartTime: startTimeFormatted,
          newEndTime: endTimeFormatted,
          reservationDate: formattedDate,
          changedBy: 'admin'
        }),
      });

      toast({
        title: "예약 변경 완료",
        description: "예약이 성공적으로 변경되었습니다.",
      });

      // 모달 닫기 및 데이터 새로고침
      setIsChangeModalOpen(false);
      setSelectedReservation(null);
      fetchReservations();

    } catch (error) {
      console.error("예약 변경 중 오류 발생:", error);
      toast({
        title: "예약 변경 실패",
        description: error instanceof Error ? error.message : "예약 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 예약 취소 처리
  const handleCancelReservation = async () => {
    if (!selectedReservation) return;

    try {
      setIsSubmitting(true);

      // 예약 상태를 취소로 변경
      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReservation.id);

      if (error) {
        console.error("예약 취소 오류:", error);
        throw new Error(`예약 취소 실패: ${error.message}`);
      }

      // 웹훅 이벤트 발생 (booking.cancelled)
      await fetch('/api/webhooks/booking-cancelled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId: selectedReservation.id,
          customerId: selectedReservation.customer_id,
          serviceId: selectedReservation.service_id,
          startTime: selectedReservation.start_time,
          endTime: selectedReservation.end_time,
          reservationDate: selectedReservation.reservation_date || selectedReservation.start_time.split('T')[0],
          cancelReason: '운영자 취소',
          cancelledBy: 'admin'
        }),
      });

      toast({
        title: "예약 취소 완료",
        description: "예약이 성공적으로 취소되었습니다.",
      });

      // 모달 닫기 및 데이터 새로고침
      setIsCancelModalOpen(false);
      setSelectedReservation(null);
      fetchReservations();

    } catch (error) {
      console.error("예약 취소 중 오류 발생:", error);
      toast({
        title: "예약 취소 실패",
        description: error instanceof Error ? error.message : "예약 취소 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  async function fetchReservations() {
    try {
      setLoading(true);
      console.log("[어드민 예약 페이지] Supabase 쿼리 시작");
      
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          customers(id, email, nickname, phone),
          services(id, name, price_per_hour)
        `)
        .order('created_at', { ascending: false });
        
      console.log("[어드민 예약 페이지] 쿼리 완료", { 
        hasError: !!error, 
        dataLength: data?.length || 0
      });
        
      if (error) {
        console.error("[어드민 예약 페이지] 데이터 로드 에러:", error);
        
        if (error.code === 'PGRST116' || error.message?.includes('permission denied')) {
          const errorMsg = error.code === 'PGRST116'
            ? '예약 테이블이 아직 존재하지 않습니다.'
            : '예약 테이블에 접근할 권한이 없습니다.';
          
          setError(errorMsg);
        } else {
          throw error;
        }
        return;
      }
      
      // 데이터 후처리: 타임스탬프 조합 생성
      const processedData = (data || []).map(reservation => ({
        ...reservation,
        // 실시간 상태 반영을 위한 타임스탬프 조합 생성
        combined_start_time: reservation.reservation_date && reservation.start_time 
          ? `${reservation.reservation_date}T${reservation.start_time}` 
          : null,
        combined_end_time: reservation.reservation_date && reservation.end_time 
          ? `${reservation.reservation_date}T${reservation.end_time}` 
          : null,
      }));
      
      console.log("[어드민 예약 페이지] 데이터 로드 성공, 처리된 예약 수:", processedData.length);
      setReservations(processedData);
    } catch (err: any) {
      console.error('[어드민 예약 페이지] 예약 정보 로딩 오류:', err);
      setError(err.message || '예약 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }
  
  // Realtime 이벤트 처리 함수
  const handleRealtimeChange = useCallback(async (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    try {
      switch (eventType) {
        case 'INSERT':
          console.log('[Realtime] 새 예약 생성:', newRecord);
          // 새 예약의 관련 데이터(고객, 서비스)를 포함해서 가져오기
          const { data: newReservationData, error: fetchError } = await supabase
            .from('reservations')
            .select(`
              *,
              customers(id, email, nickname, phone),
              services(id, name, price_per_hour)
            `)
            .eq('id', newRecord.id)
            .single();

          if (fetchError) {
            console.error('[Realtime] 새 예약 데이터 조회 실패:', fetchError);
            return;
          }

          // 타임스탬프 조합 필드 추가
          const processedNewReservation = {
            ...newReservationData,
            combined_start_time: newReservationData.reservation_date && newReservationData.start_time 
              ? `${newReservationData.reservation_date}T${newReservationData.start_time}` 
              : null,
            combined_end_time: newReservationData.reservation_date && newReservationData.end_time 
              ? `${newReservationData.reservation_date}T${newReservationData.end_time}` 
              : null,
          };

          setReservations(prev => [processedNewReservation, ...prev]);
          
          toast({
            title: "🎉 새 예약 접수",
            description: `${newReservationData.customer_name || '고객'}님의 예약이 접수되었습니다.`,
          });
          break;

        case 'UPDATE':
          console.log('[Realtime] 예약 업데이트:', newRecord);
          // 업데이트된 예약의 관련 데이터를 포함해서 가져오기
          const { data: updatedReservationData, error: updateFetchError } = await supabase
            .from('reservations')
            .select(`
              *,
              customers(id, email, nickname, phone),
              services(id, name, price_per_hour)
            `)
            .eq('id', newRecord.id)
            .single();

          if (updateFetchError) {
            console.error('[Realtime] 업데이트된 예약 데이터 조회 실패:', updateFetchError);
            return;
          }

          // 타임스탬프 조합 필드 추가
          const processedUpdatedReservation = {
            ...updatedReservationData,
            combined_start_time: updatedReservationData.reservation_date && updatedReservationData.start_time 
              ? `${updatedReservationData.reservation_date}T${updatedReservationData.start_time}` 
              : null,
            combined_end_time: updatedReservationData.reservation_date && updatedReservationData.end_time 
              ? `${updatedReservationData.reservation_date}T${updatedReservationData.end_time}` 
              : null,
          };

          setReservations(prev => 
            prev.map(reservation => 
              reservation.id === newRecord.id 
                ? processedUpdatedReservation 
                : reservation
            )
          );

          // 상태 변경에 따른 알림
          if (oldRecord.status !== newRecord.status) {
            const statusMessages = {
              'confirmed': '예약이 확정되었습니다',
              'cancelled': '예약이 취소되었습니다',
              'modified': '예약이 변경되었습니다',
              'completed': '예약이 완료되었습니다'
            };
            
            toast({
              title: "📝 예약 상태 변경",
              description: statusMessages[newRecord.status as keyof typeof statusMessages] || '예약이 업데이트되었습니다',
            });
          }
          break;

        case 'DELETE':
          console.log('[Realtime] 예약 삭제:', oldRecord);
          setReservations(prev => prev.filter(reservation => reservation.id !== oldRecord.id));
          
          toast({
            title: "🗑️ 예약 삭제",
            description: "예약이 삭제되었습니다.",
          });
          break;

        default:
          console.log('[Realtime] 알 수 없는 이벤트:', eventType);
      }
    } catch (error) {
      console.error('[Realtime] 이벤트 처리 중 오류:', error);
      toast({
        title: "실시간 업데이트 오류",
        description: "데이터 동기화 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    }
  }, [supabase]);

  const formatTimeOnly = (timeString: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const calculateDurationHours = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60) * 10) / 10; // 소수점 1자리까지
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-lg">권한을 확인하는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">접근 권한이 없습니다</p>
          <p>관리자 권한이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">예약 현황</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-sm ${isRealtimeConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isRealtimeConnected ? '실시간 연결됨' : '연결 끊김'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => fetchReservations()}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            수동 새로고침
          </Button>
          <Button 
            onClick={() => router.push('/admin/reservations/create')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            예약등록
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">오류가 발생했습니다</p>
          <p>{error}</p>
          <p className="text-sm mt-2">
            이 오류는 다음 원인으로 발생했을 수 있습니다:
          </p>
          <ul className="list-disc list-inside text-sm mt-1">
            <li>reservations 테이블이 생성되지 않았습니다.</li>
            <li>데이터베이스 연결에 문제가 있습니다.</li>
            <li>필요한 테이블 구조가 변경되었습니다.</li>
          </ul>
          <p className="text-sm mt-2">
            현재는 테이블이 없어도 사용할 수 있도록 페이지를 표시합니다:
          </p>
        </div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">예약 내역이 없습니다</p>
          <p className="text-sm text-gray-400 mt-2">예약이 생성되면 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  서비스
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  예약 시간
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  예약일
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{reservation.id.substring(0, 8)}...</td>
                  <td className="py-3 px-4">
                    {reservation.customers?.nickname || reservation.customers?.email || '알 수 없음'}
                  </td>
                  <td className="py-3 px-4">{reservation.services?.name || '알 수 없음'}</td>
                  <td className="py-3 px-4">
                    {reservation.start_time ? formatDateTime(reservation.reservation_date || '', reservation.start_time) : '알 수 없음'}
                  </td>
                  <td className="py-3 px-4">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${getStatusBadgeClass(reservation)}`}>
                      {getStatusIcon(reservation)}
                      {getStatusText(reservation)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {reservation.created_at ? format(new Date(reservation.created_at), 'yyyy-MM-dd', { locale: ko }) : '알 수 없음'}
                  </td>
                  <td className="py-3 px-4">
                    <button 
                      className="text-blue-600 hover:text-blue-800 mr-2 font-medium"
                      onClick={() => openReservationDetail(reservation)}
                    >
                      상세
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 예약 상세 정보 모달 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>예약 상세 정보</DialogTitle>
          </DialogHeader>
          
          {selectedReservation && (
            <div className="space-y-4">
              {/* 고객 프로필 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {selectedReservation.customer_name?.charAt(0) || '고'}
                      </span>
                    </div>
                    {selectedReservation.customer_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">전화번호</span>
                    <a 
                      href={`tel:${selectedReservation.customers?.phone || ''}`}
                      className="text-sm text-blue-600 underline"
                    >
                      {selectedReservation.customers?.phone || '정보 없음'}
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">이메일</span>
                    <a 
                      href={`mailto:${selectedReservation.customers?.email || ''}`}
                      className="text-sm text-blue-600 underline"
                    >
                      {selectedReservation.customers?.email || '정보 없음'}
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">예약번호</span>
                    <span className="text-sm font-mono">{selectedReservation.id.substring(0, 8)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">예약날짜</span>
                    <span className="text-sm">{formatDateTime(selectedReservation.reservation_date || '', selectedReservation.start_time)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* 예약내역 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">예약내역</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">서비스명</span>
                    <span className="text-sm font-medium">{selectedReservation.services?.name || '알 수 없음'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">이용날짜</span>
                    <span className="text-sm text-green-600 font-medium">
                      {formatDateTime(selectedReservation.reservation_date || '', selectedReservation.start_time)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">이용시간</span>
                    <span className="text-sm">
                      {formatTimeOnly(selectedReservation.start_time)} ~ {formatTimeOnly(selectedReservation.end_time)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">수량</span>
                    <span className="text-sm">{calculateDurationHours(selectedReservation.start_time, selectedReservation.end_time)}시간</span>
                  </div>
                </CardContent>
              </Card>

              {/* 예약자입력정보 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">예약자입력정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-500">업체명</span>
                    <span className="text-sm text-right">{selectedReservation.company_name || '정보 없음'}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-500">촬영목적</span>
                    <span className="text-sm text-right max-w-[200px]">{selectedReservation.shooting_purpose || '정보 없음'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">차량번호</span>
                    <span className="text-sm">{selectedReservation.vehicle_number || '정보 없음'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">개인정보동의</span>
                    <span className={`text-sm ${selectedReservation.privacy_agreed ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedReservation.privacy_agreed ? '동의함' : '동의안함'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 결제정보 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">결제정보</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">결제금액</span>
                    <span className="text-lg font-bold text-blue-600">
                      {(selectedReservation.final_price || selectedReservation.total_price || 0).toLocaleString()}원
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 현재 상태 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">현재 상태</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">예약 상태</span>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${getStatusBadgeClass(selectedReservation)}`}>
                      {getStatusIcon(selectedReservation)}
                      {getStatusText(selectedReservation)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 진행이력 */}
              <Card>
                <CardContent className="pt-4">
                  <ReservationHistoryTimeline 
                    history={history}
                    loading={historyLoading}
                    error={historyError}
                  />
                </CardContent>
              </Card>

              {/* 액션 버튼들 */}
              {selectedReservation.status !== 'cancelled' && (
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline"
                    onClick={openChangeModal}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    예약변경
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1"
                  >
                    노쇼
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={openCancelModal}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    예약취소
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 예약 변경 모달 */}
      <Dialog open={isChangeModalOpen} onOpenChange={setIsChangeModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>예약 변경</DialogTitle>
          </DialogHeader>
          
          {selectedReservation && (
            <div className="mt-4 space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">현재 예약 정보</h3>
                <p className="text-sm text-blue-800">
                  {selectedReservation.services?.name} - {formatDateTime(selectedReservation.reservation_date || '', selectedReservation.start_time)} ~ {formatDateTime(selectedReservation.reservation_date || '', selectedReservation.end_time)}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">새로운 날짜 선택</h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate || undefined}
                    onSelect={(date) => setSelectedDate(date || null)}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>

                {selectedDate && selectedReservation.services && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">새로운 시간 선택</h3>
                    <TimeRangeSelector
                      serviceId={selectedReservation.service_id}
                      selectedDate={selectedDate}
                      onTimeRangeChange={handleTimeRangeChange}
                      pricePerHour={selectedReservation.services.price_per_hour}
                    />
                  </div>
                )}
              </div>

              <div className="border-t pt-4 flex justify-end space-x-3">
                <Button 
                  variant="outline"
                  onClick={() => setIsChangeModalOpen(false)}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button 
                  onClick={handleChangeReservation}
                  disabled={isSubmitting || !selectedTimeRange.start}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      변경 중...
                    </>
                  ) : (
                    '예약 변경'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 예약 취소 확인 모달 */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>예약 취소 확인</DialogTitle>
          </DialogHeader>
          
          {selectedReservation && (
            <div className="mt-4 space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-800">
                  정말로 이 예약을 취소하시겠습니까?
                </p>
                <p className="text-xs text-red-600 mt-2">
                  {selectedReservation.services?.name} - {formatDateTime(selectedReservation.reservation_date || '', selectedReservation.start_time)}
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline"
                  onClick={() => setIsCancelModalOpen(false)}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleCancelReservation}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      취소 중...
                    </>
                  ) : (
                    '예약 취소'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 