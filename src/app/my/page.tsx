"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ExtensionModal } from "@/components/reservation";
import type { Reservation } from '@/types/reservation';
// 커스텀 훅들
import { useReservations } from "@/features/my-page/hooks/useReservations";
import { useUserStats } from "@/features/my-page/hooks/useUserStats";
import { useReservationActions } from "@/features/my-page/hooks/useReservationActions";
import { useRealtimeSubscriptions } from "@/features/my-page/hooks/useRealtimeSubscriptions";
// 컴포넌트들
import { StatsSection } from "./components/StatsSection";
import { ReservationList } from "./components/ReservationList";
import { ReservationDetailModal } from "@/features/my-page/components/ReservationDetailModal";
import { MyPageLayout } from "./components/MyPageLayout";
import { CancelConfirmModal } from "./components/CancelConfirmModal";

export default function MyPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  
  // 훅들 사용 (필요한 것만)
  const {
    reservations,
    filteredReservations,
    activeFilter,
    isLoading: reservationsLoading,
    hasError,
    errorMessage,
    handleFilterChange,
    refreshReservations,
  } = useReservations(user?.id);
  
  const {
    accumulatedTime,
    couponsCount,
    reviewsCount,
    isLoading: statsLoading,
    refreshStats,
  } = useUserStats(user?.id);
  
  const {
    cancelState,
    extensionState,
    actions,
  } = useReservationActions(refreshReservations);
  
  useRealtimeSubscriptions({
    userId: user?.id,
    onReservationCreated: refreshReservations,
    onCouponUpdated: refreshStats,
    isReservationsLoading: reservationsLoading,
  });
  
  // 모달 상태
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 선택된 예약 실시간 업데이트
  useEffect(() => {
    if (selectedReservation && reservations.length > 0) {
      const updated = reservations.find(r => r.id === selectedReservation.id);
      if (updated) setSelectedReservation(updated);
    }
  }, [reservations, selectedReservation]);

  // 핸들러들
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      toast({
        title: "로그아웃 실패",
        description: "로그아웃 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    if (!reservationsLoading) {
      Promise.allSettled([refreshReservations(), refreshStats()]);
    }
  };

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };

  const handleExtensionSuccess = (updated: Reservation) => {
    if (selectedReservation?.id === updated.id) {
      setSelectedReservation(updated);
    }
    actions.handleExtensionSuccess(updated);
  };

  // 인증 체크
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <MyPageLayout
      isLoading={reservationsLoading}
      hasError={hasError}
      errorMessage={errorMessage}
      onRefresh={handleRefresh}
      onSignOut={handleSignOut}
    >
      <StatsSection
        accumulatedTime={accumulatedTime}
        couponsCount={couponsCount}
        reviewsCount={reviewsCount}
        onStatsCardClick={(path) => router.push(path)}
        isLoading={statsLoading}
      />

      <ReservationList
        reservations={filteredReservations}
        isLoading={reservationsLoading}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        onReservationClick={handleReservationClick}
        onExtensionClick={actions.openExtensionModal}
        hasError={hasError}
        errorMessage={errorMessage}
      />

      <ReservationDetailModal
        reservation={selectedReservation}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCancelClick={(reservation) => {
          actions.openCancelModal(reservation);
          setIsModalOpen(false);
        }}
        onExtensionClick={actions.openExtensionModal}
        userName={user?.user_metadata?.name}
      />

      <CancelConfirmModal
        isOpen={cancelState.isCancelModalOpen}
        isCancelling={cancelState.isCancelling}
        onClose={actions.closeCancelModal}
        onConfirm={actions.confirmCancel}
      />

      {extensionState.extendingReservation && (
        <ExtensionModal
          reservation={extensionState.extendingReservation}
          open={extensionState.isExtensionModalOpen}
          onOpenChange={(open) => !open && actions.closeExtensionModal()}
          onSuccess={handleExtensionSuccess}
        />
      )}
    </MyPageLayout>
  );
}
