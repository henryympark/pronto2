"use client";

import { useState, useCallback } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { toast } from '@/hooks/use-toast';
import type { Reservation } from '@/types/reservation';

interface UseReservationActionsReturn {
  // 취소 관련 상태
  cancelState: {
    isCancelModalOpen: boolean;
    cancelingReservation: Reservation | null;
    isCancelling: boolean;
  };
  
  // 연장 관련 상태
  extensionState: {
    isExtensionModalOpen: boolean;
    extendingReservation: Reservation | null;
  };
  
  // 액션 함수들
  actions: {
    openCancelModal: (reservation: Reservation) => void;
    closeCancelModal: () => void;
    confirmCancel: () => Promise<void>;
    openExtensionModal: (reservation: Reservation) => void;
    closeExtensionModal: () => void;
    handleExtensionSuccess: (updatedReservation: Reservation, onSuccess?: () => void) => void;
  };
}

export function useReservationActions(onReservationUpdate?: () => void): UseReservationActionsReturn {
  const supabase = useSupabase();
  
  // 예약 취소 관련 상태
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelingReservation, setCancelingReservation] = useState<Reservation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // 예약 연장 관련 상태
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [extendingReservation, setExtendingReservation] = useState<Reservation | null>(null);

  // 취소 모달 열기
  const openCancelModal = useCallback((reservation: Reservation) => {
    setCancelingReservation(reservation);
    setIsCancelModalOpen(true);
  }, []);

  // 취소 모달 닫기
  const closeCancelModal = useCallback(() => {
    setIsCancelModalOpen(false);
    setCancelingReservation(null);
  }, []);

  // 예약 취소 확인
  const confirmCancel = useCallback(async () => {
    if (!cancelingReservation) return;
    
    setIsCancelling(true);
    
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', cancelingReservation.id);
        
      if (error) throw error;
      
      // 모달 닫기
      closeCancelModal();
      
      // 예약 목록 새로고침
      if (onReservationUpdate) {
        onReservationUpdate();
      }
      
      toast({
        title: "예약 취소 완료",
        description: "예약이 성공적으로 취소되었습니다.",
      });
    } catch (error) {
      console.error('[useReservationActions] 예약 취소 실패:', error);
      toast({
        title: "예약 취소 실패", 
        description: "예약 취소 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  }, [cancelingReservation, supabase, closeCancelModal, onReservationUpdate]);

  // 연장 모달 열기
  const openExtensionModal = useCallback((reservation: Reservation) => {
    setExtendingReservation(reservation);
    setIsExtensionModalOpen(true);
  }, []);

  // 연장 모달 닫기
  const closeExtensionModal = useCallback(() => {
    setIsExtensionModalOpen(false);
    setExtendingReservation(null);
  }, []);

  // 연장 성공 핸들러
  const handleExtensionSuccess = useCallback((updatedReservation: Reservation, onSuccess?: () => void) => {
    // 연장 모달 닫기
    closeExtensionModal();
    
    // 예약 목록 새로고침
    if (onReservationUpdate) {
      onReservationUpdate();
    }
    
    // 추가 성공 콜백 실행
    if (onSuccess) {
      onSuccess();
    }
    
    toast({
      title: "예약 연장 완료",
      description: "예약이 성공적으로 연장되었습니다.",
    });
  }, [closeExtensionModal, onReservationUpdate]);

  return {
    // 취소 관련 상태
    cancelState: {
      isCancelModalOpen,
      cancelingReservation,
      isCancelling,
    },
    
    // 연장 관련 상태
    extensionState: {
      isExtensionModalOpen,
      extendingReservation,
    },
    
    // 액션 함수들
    actions: {
      openCancelModal,
      closeCancelModal,
      confirmCancel,
      openExtensionModal,
      closeExtensionModal,
      handleExtensionSuccess,
    },
  };
} 