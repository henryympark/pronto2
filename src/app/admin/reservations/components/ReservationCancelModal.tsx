"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Reservation } from "../utils/reservationTypes";
import { formatDateTime } from "../utils/reservationHelpers";

interface ReservationCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export default function ReservationCancelModal({
  isOpen,
  onClose,
  reservation,
  isSubmitting,
  onSubmit
}: ReservationCancelModalProps) {
  if (!reservation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>예약 취소 확인</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-800">
              정말로 이 예약을 취소하시겠습니까?
            </p>
            <p className="text-xs text-red-600 mt-2">
              {reservation.services?.name} - {formatDateTime(reservation.reservation_date || '', reservation.start_time)}
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button 
              variant="destructive"
              onClick={onSubmit}
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
      </DialogContent>
    </Dialog>
  );
} 