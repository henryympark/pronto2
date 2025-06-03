"use client";

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExtensionButton } from "@/components/reservation";
import ReservationHistoryTimeline from "@/components/ReservationHistoryTimeline";
import { useReservationHistory } from "@/hooks/useReservationHistory";
import type { Reservation, ReservationHistory } from '@/types/reservation';
// 유틸리티 함수 import
import { formatTimeString, canCancelReservation } from "@/features/my-page/utils/reservation-helpers";
import { getStatusIcon, getStatusColorClass, getStatusText } from "@/features/my-page/utils/status-helpers";

interface ReservationDetailModalProps {
  reservation: Reservation | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelClick: (reservation: Reservation) => void;
  onExtensionClick: (reservation: Reservation) => void;
  userName?: string;
}

export function ReservationDetailModal({
  reservation,
  isOpen,
  onClose,
  onCancelClick,
  onExtensionClick,
  userName
}: ReservationDetailModalProps) {
  
  // 예약 이력 조회 훅
  const { history, loading: historyLoading, error: historyError } = useReservationHistory(
    reservation?.id || null
  );

  if (!reservation) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>예약 상세 정보</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 기본 예약 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-1">서비스</h4>
              <p>{reservation.service?.name || '알 수 없는 서비스'}</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1">예약 상태</h4>
              <Badge className={`${getStatusColorClass(reservation)} flex items-center gap-1.5 text-sm font-medium px-3 py-1`}>
                {getStatusIcon(reservation)}
                {getStatusText(reservation)}
              </Badge>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1">예약 일시</h4>
              <p>
                {format(parseISO(reservation.reservation_date), 'yyyy년 MM월 dd일', { locale: ko })}
                <br />
                {formatTimeString(reservation.start_time)} ~ {formatTimeString(reservation.end_time)}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1">이용 시간</h4>
              <p>{reservation.total_hours}시간</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1">결제 정보</h4>
              <p>총 금액: {reservation.total_price.toLocaleString()}원</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1">예약자 정보</h4>
              <p>{reservation.customer_name || userName || '미설정'}</p>
            </div>
          </div>

          {/* 추가 정보 */}
          {(reservation.company_name || reservation.purpose || reservation.car_number) && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">추가 정보</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reservation.company_name && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-500">회사명</h5>
                    <p className="mt-1">{reservation.company_name}</p>
                  </div>
                )}
                {reservation.purpose && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-500">촬영 목적</h5>
                    <p className="mt-1">{reservation.purpose}</p>
                  </div>
                )}
                {reservation.car_number && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-500">차량 번호</h5>
                    <p className="mt-1">{reservation.car_number}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 진행이력 */}
          <div className="border-t pt-4">
            <ReservationHistoryTimeline 
              history={history}
              loading={historyLoading}
              error={historyError}
            />
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {/* 예약 연장 버튼 - 상세 모달에서 */}
            {(reservation.status === 'confirmed' || reservation.status === 'modified') && (
              <ExtensionButton
                reservation={reservation}
                onExtensionClick={() => onExtensionClick(reservation)}
                disabled={false}
              />
            )}
            
            {canCancelReservation(reservation) && (
              <Button 
                variant="destructive"
                onClick={() => {
                  onCancelClick(reservation);
                  onClose();
                }}
              >
                예약 취소
              </Button>
            )}
          </div>
          <Button onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 