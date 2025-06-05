"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LogOut, User, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ExtensionModal } from "@/components/reservation";
import type { Reservation } from '@/types/reservation';
import { ContentContainer } from '@/components/layout/ContentContainer';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
// 커스텀 훅들
import { useReservations } from "@/features/my-page/hooks/useReservations";
import { useUserStats } from "@/features/my-page/hooks/useUserStats";
import { useReservationActions } from "@/features/my-page/hooks/useReservationActions";
import { useRealtimeSubscriptions } from "@/features/my-page/hooks/useRealtimeSubscriptions";
// 컴포넌트들
import { StatsSection } from "./components/StatsSection";
import { ReservationList } from "./components/ReservationList";
import { ReservationDetailModal } from "@/features/my-page/components/ReservationDetailModal";
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

  // 로딩 상태 처리
  if (loading) {
    return (
      <ContentContainer className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-lg">로딩 중...</p>
        </div>
      </ContentContainer>
    );
  }

  if (!user) return null;

  return (
    <ContentContainer className="pt-0">
      <div className="space-y-6">
        {/* 헤더 섹션 */}
        <div className="flex justify-between items-center py-6">
          <h1 className="text-2xl font-bold">마이페이지</h1>
        </div>

        {/* 데이터 로딩 상태 섹션 */}
        {reservationsLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">데이터를 불러오는 중입니다...</span>
          </div>
        )}

        {/* 오류 메시지 섹션 */}
        {hasError && !reservationsLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>예약 정보 조회 실패</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
            <div className="mt-4">
              <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
                새로고침
              </Button>
            </div>
          </Alert>
        )}

        {/* 통계 섹션 */}
        <StatsSection
          accumulatedTime={accumulatedTime}
          couponsCount={couponsCount}
          reviewsCount={reviewsCount}
          onStatsCardClick={(path) => router.push(path)}
          isLoading={statsLoading}
        />

        {/* 예약 목록 섹션 */}
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

        {/* 사용자 액션 섹션 - 예약 목록 아래로 이동 */}
        <div className="flex flex-col space-y-4 justify-start py-4">
          <Link href="/my/profile">
            <Button variant="outline" className="flex items-center justify-center w-40">
              <User className="mr-2 h-4 w-4" />
              내 정보
            </Button>
          </Link>
          <Button variant="outline" onClick={handleSignOut} className="flex items-center justify-center w-40">
            <LogOut className="h-4 w-4 mr-2" />
            <span>로그아웃</span>
          </Button>
        </div>
      </div>

      {/* 모달들 */}
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
    </ContentContainer>
  );
}
