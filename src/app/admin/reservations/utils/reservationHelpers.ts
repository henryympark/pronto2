import { format, parseISO, isToday, isPast } from "date-fns";
import { ko } from "date-fns/locale";
import { Check, Clock, XCircle, Calendar } from "lucide-react";

/**
 * 날짜 시간 포맷팅 함수
 */
export function formatDateTime(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, "MM/dd HH:mm", { locale: ko });
}

/**
 * 상태 아이콘 가져오기 함수
 */
export function getStatusIcon(status: string) {
  switch (status) {
    case "confirmed":
      return Check;
    case "pending":
      return Clock;
    case "cancelled":
      return XCircle;
    default:
      return Calendar;
  }
}

/**
 * 기존 상태 배지 클래스 (호환성을 위해 유지)
 */
export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

/**
 * 강화된 상태 배지 스타일링 함수
 */
export function getEnhancedStatusBadgeClass(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm ring-1 ring-emerald-600/20";
    case "pending":
      return "bg-amber-50 text-amber-700 border border-amber-200 shadow-sm ring-1 ring-amber-600/20";
    case "cancelled":
      return "bg-red-50 text-red-700 border border-red-200 shadow-sm ring-1 ring-red-600/20";
    default:
      return "bg-slate-50 text-slate-700 border border-slate-200 shadow-sm ring-1 ring-slate-600/20";
  }
}

/**
 * 상태 텍스트 변환 함수
 */
export function getStatusText(status: string): string {
  switch (status) {
    case "confirmed":
      return "확정";
    case "pending":
      return "대기";
    case "cancelled":
      return "취소";
    default:
      return status;
  }
}

/**
 * 예약 행 스타일링 (날짜 기반) 함수
 */
export function getReservationRowClass(reservationTime: string): string {
  const date = parseISO(reservationTime);
  
  if (isToday(date)) {
    return "border-l-4 border-l-blue-500 bg-blue-50/30";
  }
  
  if (isPast(date)) {
    return "opacity-70 bg-gray-50/50";
  }
  
  return "hover:bg-gray-50/50";
}

/**
 * 액션 버튼 스타일링 함수
 */
export function getActionButtonClass(variant: 'view' | 'edit' | 'cancel' = 'view'): string {
  const baseClass = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  
  switch (variant) {
    case 'view':
      return `${baseClass} border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3`;
    case 'edit':
      return `${baseClass} bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3`;
    case 'cancel':
      return `${baseClass} bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8 px-3`;
    default:
      return `${baseClass} border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3`;
  }
}

/**
 * 우선순위 표시 함수 (VIP 고객 등)
 */
export function getCustomerPriorityIndicator(isVip: boolean): string {
  if (isVip) {
    return "★";
  }
  return "";
}

/**
 * 테이블 셀 스타일링 함수
 */
export function getTableCellClass(isHighlighted: boolean = false): string {
  return `px-4 py-3 text-sm ${isHighlighted ? 'font-medium' : 'text-gray-900'} border-b border-gray-200`;
}

/**
 * 컴팩트 스타일링 함수 (모바일 대응)
 */
export function getCompactDisplayClass(): string {
  return "block md:hidden space-y-1 text-xs";
}

/**
 * 데스크톱 디스플레이 클래스 함수
 */
export function getDesktopDisplayClass(): string {
  return "hidden md:table-cell";
} 