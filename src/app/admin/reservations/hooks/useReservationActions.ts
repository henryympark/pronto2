"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { useSupabase } from "@/contexts/SupabaseContext";
import { toast } from "@/shared/hooks/useToast";
import { Reservation, TimeRange } from "../utils/reservationTypes";

interface UseReservationActionsProps {
  selectedReservation: Reservation | null;
  onRefreshData: () => Promise<void>;
  onCloseModals: () => void;
}

interface UseReservationActionsReturn {
  isSubmitting: boolean;
  selectedDate: Date | null;
  selectedTimeRange: TimeRange;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | null>>;
  handleTimeRangeChange: (startTime: string, endTime: string, duration: number, price: number) => void;
  handleChangeReservation: () => Promise<void>;
  handleCancelReservation: () => Promise<void>;
  prepareChangeModal: () => void;
}

export function useReservationActions({
  selectedReservation,
  onRefreshData,
  onCloseModals
}: UseReservationActionsProps): UseReservationActionsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({
    start: "",
    end: "",
    duration: 0,
    price: 0
  });

  const supabase = useSupabase();

  // 예약 변경 모달 준비 (날짜 설정)
  const prepareChangeModal = useCallback(() => {
    if (!selectedReservation) return;
    
    // 예약 날짜 설정
    const reservationDate = selectedReservation.reservation_date 
      ? new Date(selectedReservation.reservation_date)
      : new Date(selectedReservation.start_time.split('T')[0]);
    
    setSelectedDate(reservationDate);
  }, [selectedReservation]);

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
  const handleChangeReservation = useCallback(async () => {
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
      onCloseModals();
      await onRefreshData();

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
  }, [selectedReservation, selectedDate, selectedTimeRange, supabase, onCloseModals, onRefreshData]);

  // 예약 취소 처리
  const handleCancelReservation = useCallback(async () => {
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
      onCloseModals();
      await onRefreshData();

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
  }, [selectedReservation, supabase, onCloseModals, onRefreshData]);

  return {
    isSubmitting,
    selectedDate,
    selectedTimeRange,
    setSelectedDate,
    handleTimeRangeChange,
    handleChangeReservation,
    handleCancelReservation,
    prepareChangeModal
  };
} 