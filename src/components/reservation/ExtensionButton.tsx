"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus } from 'lucide-react';
import { 
  getRemainingGracePeriodMinutes, 
  createReservationDateTime,
  formatTimeDisplay 
} from '@/lib/date-utils';
import type { Reservation } from '@/types/reservation';

interface ExtensionButtonProps {
  reservation: Reservation;
  onExtensionClick: () => void;
  disabled?: boolean;
}

export function ExtensionButton({ 
  reservation, 
  onExtensionClick, 
  disabled = false 
}: ExtensionButtonProps) {
  const [gracePeriodRemaining, setGracePeriodRemaining] = useState<number>(0);
  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [isInUse, setIsInUse] = useState<boolean>(false);

  useEffect(() => {
    const updateGracePeriod = () => {
      // 예약 시작 및 종료 시간 계산
      const reservationStartDateTime = createReservationDateTime(
        reservation.reservation_date,
        reservation.start_time
      );
      const reservationEndDateTime = createReservationDateTime(
        reservation.reservation_date,
        reservation.end_time
      );

      const now = new Date();
      const remaining = getRemainingGracePeriodMinutes(reservationEndDateTime);
      
      // 이용중 상태 확인: 현재 시간이 예약 시작 시간과 종료 시간 사이에 있는지
      const currentlyInUse = now >= reservationStartDateTime && now <= reservationEndDateTime;
      
      setGracePeriodRemaining(remaining);
      setIsEligible(remaining > 0 && (reservation.status === 'confirmed' || reservation.status === 'modified'));
      setIsInUse(currentlyInUse);
    };

    // 초기 계산
    updateGracePeriod();

    // 매 30초마다 업데이트
    const interval = setInterval(updateGracePeriod, 30000);

    return () => clearInterval(interval);
  }, [reservation.reservation_date, reservation.start_time, reservation.end_time, reservation.status]);

  if (!isEligible) {
    return null; // Grace Period가 끝났거나 예약 상태가 적절하지 않으면 버튼 숨김
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onExtensionClick();
        }}
        disabled={disabled}
        size="sm"
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        예약 연장하기
      </Button>
      
      {/* 이용중 상태일 때만 연장 가능시간 표시 */}
      {isInUse && (
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          연장 가능시간: {gracePeriodRemaining}분 남음
        </Badge>
      )}
    </div>
  );
} 