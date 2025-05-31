import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CheckCircle, Play, Edit, XCircle, AlertCircle } from "lucide-react";
import { Reservation, ReservationTimeStatus } from "./reservationTypes";

/**
 * 날짜와 시간을 한국어 형식으로 포맷팅
 */
export const formatDateTime = (dateString: string, timeString?: string): string => {
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

/**
 * 시간 문자열에서 시:분만 추출 (HH:MM)
 */
export const formatTimeOnly = (timeString: string): string => {
  if (!timeString) return '';
  return timeString.substring(0, 5);
};

/**
 * 시작 시간과 종료 시간 사이의 시간 차이를 계산 (시간 단위)
 */
export const calculateDurationHours = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60) * 10) / 10; // 소수점 1자리까지
};

/**
 * 현재 시간을 기준으로 예약의 시간 상태를 판별
 */
export const getReservationTimeStatus = (reservation: Reservation): ReservationTimeStatus => {
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

/**
 * 예약 상태와 시간 상태에 따른 아이콘 반환
 */
export const getStatusIcon = (reservation: Reservation) => {
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

/**
 * 예약 상태와 시간 상태에 따른 배지 CSS 클래스 반환
 */
export const getStatusBadgeClass = (reservation: Reservation): string => {
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

/**
 * 예약 상태와 시간 상태에 따른 텍스트 반환
 */
export const getStatusText = (reservation: Reservation): string => {
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