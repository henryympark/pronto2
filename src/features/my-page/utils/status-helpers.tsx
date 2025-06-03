import { CheckCircle, XCircle, Edit, Play, AlertCircle } from "lucide-react";
import type { Reservation } from '@/types/reservation';
import { getReservationTimeStatus } from './reservation-helpers';

/**
 * 예약 상태별 아이콘을 반환하는 함수
 */
export function getStatusIcon(reservation: Reservation) {
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
    default: 
      return <AlertCircle className="h-3 w-3" />;
  }
}

/**
 * 예약 상태별 CSS 클래스를 반환하는 함수
 */
export function getStatusColorClass(reservation: Reservation): string {
  const status = reservation.status || '';
  const timeStatus = getReservationTimeStatus(reservation);
  
  switch (status) {
    case 'confirmed':
      return timeStatus === 'before_start' 
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'  // 시작 전 - 더 선명한 녹색
        : timeStatus === 'in_progress'
        ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 animate-pulse'     // 이용 중 - 애니메이션 추가
        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';         // 완료
    case 'modified':
      return timeStatus === 'before_start' 
        ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'          // 변경됨 (시작 전) - 더 선명한 노란색
        : timeStatus === 'in_progress'
        ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 animate-pulse'        // 이용 중 - 애니메이션 추가
        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';         // 완료
    case 'completed': 
      return 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
    case 'cancelled': 
      return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
    default: 
      return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
  }
}

/**
 * 예약 상태별 텍스트를 반환하는 함수
 */
export function getStatusText(reservation: Reservation): string {
  const status = reservation.status || '';
  const timeStatus = getReservationTimeStatus(reservation);
  
  switch (status) {
    case 'confirmed':
      return timeStatus === 'before_start' 
        ? '예약 확정 (시작 전)' 
        : timeStatus === 'in_progress'
        ? '현재 이용 중'
        : '이용 완료';
    case 'modified':
      return timeStatus === 'before_start' 
        ? '예약 변경됨 (시작 전)' 
        : timeStatus === 'in_progress'
        ? '현재 이용 중'
        : '이용 완료';
    case 'completed': 
      return '이용 완료';
    case 'cancelled': 
      return '예약 취소';
    default: 
      return '알 수 없음';
  }
}

/**
 * 예약 상태에 따른 우선순위를 반환하는 함수 (정렬용)
 */
export function getStatusPriority(reservation: Reservation): number {
  const status = reservation.status || '';
  const timeStatus = getReservationTimeStatus(reservation);
  
  // 우선순위: 이용 중 > 시작 전 > 완료 > 취소
  switch (status) {
    case 'confirmed':
    case 'modified':
      if (timeStatus === 'in_progress') return 1;
      if (timeStatus === 'before_start') return 2;
      return 3; // completed
    case 'completed':
      return 3;
    case 'cancelled':
      return 4;
    default:
      return 5;
  }
} 