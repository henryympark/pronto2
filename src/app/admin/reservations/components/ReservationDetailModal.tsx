"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ReservationHistoryTimeline from "@/components/ReservationHistoryTimeline";
import { Reservation } from "../utils/reservationTypes";
import { 
  formatDateTime,
  getStatusIcon,
  getStatusBadgeClass,
  getStatusText
} from "../utils/reservationHelpers";

interface ReservationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  history: any;
  historyLoading: boolean;
  historyError: string | null;
  isSubmitting: boolean;
  onOpenChangeModal: () => void;
  onOpenCancelModal: () => void;
}

export default function ReservationDetailModal({
  isOpen,
  onClose,
  reservation,
  history,
  historyLoading,
  historyError,
  isSubmitting,
  onOpenChangeModal,
  onOpenCancelModal
}: ReservationDetailModalProps) {
  if (!reservation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>예약 상세 정보</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 고객 프로필 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-sm">
                    {reservation.customer_name?.charAt(0) || '고'}
                  </span>
                </div>
                {reservation.customer_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">전화번호</span>
                <a 
                  href={`tel:${reservation.customers?.phone || ''}`}
                  className="text-sm text-blue-600 underline"
                >
                  {reservation.customers?.phone || '정보 없음'}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">이메일</span>
                <a 
                  href={`mailto:${reservation.customers?.email || ''}`}
                  className="text-sm text-blue-600 underline"
                >
                  {reservation.customers?.email || '정보 없음'}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">예약번호</span>
                <span className="text-sm font-mono">{reservation.id.substring(0, 8)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">예약날짜</span>
                <span className="text-sm">{formatDateTime(`${reservation.reservation_date}T${reservation.start_time}`)}</span>
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
                <span className="text-sm font-medium">{reservation.services?.name || '알 수 없음'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">이용날짜</span>
                <span className="text-sm text-green-600 font-medium">
                  {formatDateTime(`${reservation.reservation_date}T${reservation.start_time}`)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">이용시간</span>
                <span className="text-sm">
                  {reservation.start_time?.substring(0, 5)} ~ {reservation.end_time?.substring(0, 5)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">수량</span>
                <span className="text-sm">
                  {reservation.start_time && reservation.end_time ? 
                    Math.round((new Date(`2000-01-01T${reservation.end_time}`).getTime() - new Date(`2000-01-01T${reservation.start_time}`).getTime()) / (1000 * 60 * 60) * 10) / 10 : 0}시간
                  </span>
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
                <span className="text-sm text-right">{reservation.company_name || '정보 없음'}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-500">촬영목적</span>
                <span className="text-sm text-right max-w-[200px]">{reservation.shooting_purpose || '정보 없음'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">차량번호</span>
                <span className="text-sm">{reservation.vehicle_number || '정보 없음'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">개인정보동의</span>
                <span className={`text-sm ${reservation.privacy_agreed ? 'text-green-600' : 'text-red-600'}`}>
                  {reservation.privacy_agreed ? '동의함' : '동의안함'}
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
                  {(reservation.final_price || reservation.total_price || 0).toLocaleString()}원
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
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${getStatusBadgeClass(reservation)}`}>
                  <span className="flex items-center">{getStatusIcon(reservation)}</span>
                  {getStatusText(reservation)}
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
          {reservation.status !== 'cancelled' && (
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline"
                onClick={onOpenChangeModal}
                disabled={isSubmitting}
                className="flex-1"
              >
                예약변경
              </Button>
              <Button 
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                노쇼
              </Button>
              <Button 
                variant="outline"
                onClick={onOpenCancelModal}
                disabled={isSubmitting}
                className="flex-1"
              >
                예약취소
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 