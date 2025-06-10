"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { TimeRangeSelector } from "@/domains/booking";
import { Loader2 } from "lucide-react";
import { Reservation, TimeRange } from "../utils/reservationTypes";
import { formatDateTime } from "../utils/reservationHelpers";

interface ReservationChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
  selectedTimeRange: TimeRange;
  onTimeRangeChange: (startTime: string, endTime: string, duration: number, price: number) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export default function ReservationChangeModal({
  isOpen,
  onClose,
  reservation,
  selectedDate,
  onDateSelect,
  selectedTimeRange,
  onTimeRangeChange,
  isSubmitting,
  onSubmit
}: ReservationChangeModalProps) {
  if (!reservation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>예약 변경</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">현재 예약 정보</h3>
            <p className="text-sm text-blue-800">
              {reservation.services?.name} - {formatDateTime(`${reservation.reservation_date}T${reservation.start_time}`)} ~ {formatDateTime(`${reservation.reservation_date}T${reservation.end_time}`)}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">새로운 날짜 선택</h3>
              <Calendar
                mode="single"
                selected={selectedDate || undefined}
                onSelect={(date) => onDateSelect(date || null)}
                disabled={(date) => date < new Date()}
                className="rounded-md"
              />
            </div>

            {selectedDate && reservation.services && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">새로운 시간 선택</h3>
                <TimeRangeSelector
                  serviceId={reservation.service_id}
                  selectedDate={selectedDate}
                  onTimeRangeChange={onTimeRangeChange}
                  pricePerHour={reservation.services.price_per_hour}
                />
              </div>
            )}
          </div>

          <div className="border-t pt-4 flex justify-end space-x-3">
            <Button 
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button 
              onClick={onSubmit}
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
      </DialogContent>
    </Dialog>
  );
} 