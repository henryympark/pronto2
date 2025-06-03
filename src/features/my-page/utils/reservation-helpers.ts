import type { Reservation } from '@/types/reservation';

/**
 * 시간 문자열을 포맷팅하는 함수 (HH:MM 형태로 변환)
 */
export function formatTimeString(timeStr: string): string {
  if (!timeStr) return '';
  return timeStr.substring(0, 5);
}

/**
 * 예약 취소 가능 여부를 확인하는 함수
 */
export function canCancelReservation(reservation: Reservation): boolean {
  if (!reservation) return false;
  if (reservation.status === 'cancelled') return false;
  if (reservation.status === 'completed') return false;
  
  const endDateTime = new Date(`${reservation.reservation_date}T${reservation.end_time}`);
  return endDateTime > new Date();
}

/**
 * 예약의 시간 상태를 계산하는 함수
 */
export function getReservationTimeStatus(reservation: Reservation): 'before_start' | 'in_progress' | 'completed' {
  const now = new Date();
  const startDateTime = new Date(`${reservation.reservation_date}T${reservation.start_time}`);
  const endDateTime = new Date(`${reservation.reservation_date}T${reservation.end_time}`);
  
  if (now < startDateTime) {
    return 'before_start'; // 시작 전
  } else if (now >= startDateTime && now <= endDateTime) {
    return 'in_progress'; // 이용 중
  } else {
    return 'completed'; // 완료 (시간이 지남)
  }
}

/**
 * 예약 연장 가능 여부를 확인하는 함수
 */
export function canExtendReservation(reservation: Reservation): boolean {
  if (!reservation) return false;
  if (reservation.status !== 'confirmed' && reservation.status !== 'modified') return false;
  
  const endDateTime = new Date(`${reservation.reservation_date}T${reservation.end_time}`);
  const now = new Date();
  
  // 예약 종료 시간이 지나지 않았으면 연장 가능
  return endDateTime > now;
}

/**
 * 리뷰 작성 가능 여부를 확인하는 함수
 */
export function canWriteReview(reservation: Reservation): boolean {
  if (!reservation) return false;
  if (reservation.has_review) return false; // 이미 리뷰 작성됨
  
  // 완료된 예약이거나, 시간이 지난 예약에 대해서만 리뷰 작성 가능
  if (reservation.status === 'completed') return true;
  
  if (reservation.status === 'confirmed' || reservation.status === 'modified') {
    const endDateTime = new Date(`${reservation.reservation_date}T${reservation.end_time}`);
    return endDateTime <= new Date();
  }
  
  return false;
} 