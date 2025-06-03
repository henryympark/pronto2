"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, Clock, CheckCircle, XCircle, User, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminPageHeader } from "@/components/admin/common/AdminPageHeader";
import { AdminLoadingState } from "@/components/admin/common/AdminLoadingState";
import { AdminStatsGrid } from "@/components/admin/stats/AdminStatsGrid";
import { AdminStatsCard } from "@/components/admin/stats/AdminStatsCard";
import { AdminTable, AdminTableColumn } from "@/components/admin/tables/AdminTable";
import { useAdminFilters } from "@/hooks/admin/useAdminFilters";
import { useAdminToast } from "@/hooks/admin/useAdminToast";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

// 분리된 타입과 유틸리티 import
import { Reservation } from "./utils/reservationTypes";

// 검색 하이라이트 컴포넌트 import
import { HighlightText } from "./utils/searchHighlight";

// 분리된 모달 컴포넌트들 import
import ReservationDetailModal from "./components/ReservationDetailModal";
import ReservationChangeModal from "./components/ReservationChangeModal";
import ReservationCancelModal from "./components/ReservationCancelModal";

// 필터링 관련 import
import ReservationFilters from "./components/ReservationFilters";
import { useReservationFilters } from "./hooks/useReservationFilters";

// 정렬 관련 import 추가
import { useReservationSort } from "./hooks/useReservationSort";
import SortableTableHeader from "./components/SortableTableHeader";

// 분리된 훅들 import
import { useReservationRealtime } from "./hooks/useReservationRealtime";
import { useReservationData } from "./hooks/useReservationData";
import { useReservationActions } from "./hooks/useReservationActions";
import { parseISO, isToday as dateIsToday, isPast as dateIsPast } from "date-fns";
import { Check } from "lucide-react";

// 데스크톱 디스플레이 클래스를 상수로 정의 - 테스트를 위해 모든 컬럼 표시
const DESKTOP_DISPLAY_CLASS = "";

// 모든 helper 함수들을 직접 정의 (임시 해결책)
function formatDateTime(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, "MM/dd HH:mm", { locale: ko });
}

function getStatusIcon(status: string) {
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

function getEnhancedStatusBadgeClass(status: string): string {
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

function getStatusText(status: string): string {
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

function getReservationRowClass(reservationTime: string): string {
  // 빈 문자열이나 null/undefined 처리
  if (!reservationTime || reservationTime.trim() === '') {
    return "hover:bg-gray-50/50";
  }
  
  try {
    // 안전한 날짜 파싱
    const date = parseISO(reservationTime);
    
    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
      return "hover:bg-gray-50/50";
    }
    
    // 오늘 날짜 확인
    if (dateIsToday(date)) {
      return "border-l-4 border-l-blue-500 bg-blue-50/30";
    }
    
    // 과거 날짜 확인
    if (dateIsPast(date)) {
      return "opacity-70 bg-gray-50/50";
    }
    
    return "hover:bg-gray-50/50";
  } catch (error) {
    // 에러 발생 시 기본 스타일 반환
    console.warn('getReservationRowClass: Invalid date format:', reservationTime);
    return "hover:bg-gray-50/50";
  }
}

function getActionButtonClass(variant: 'view' | 'edit' | 'cancel' = 'view'): string {
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

function getTableCellClass(isHighlighted: boolean = false): string {
  return `px-4 py-3 text-sm ${isHighlighted ? 'font-medium' : 'text-gray-900'} border-b border-gray-200`;
}

function getCompactDisplayClass(): string {
  return "block lg:hidden space-y-1 text-xs";
}

export default function AdminReservationsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const { showSuccess, showError } = useAdminToast();

  // 데이터 페칭 훅 사용
  const { 
    loading: dataLoading, 
    error, 
    reservations: hookReservations, 
    refreshData 
  } = useReservationData({ isAdmin, authLoading });

  // 액션 훅 사용
  const {
    isSubmitting,
    handleCancelReservation: cancelReservation,
  } = useReservationActions({
    selectedReservation,
    onRefreshData: refreshData,
    onCloseModals: () => {}
  });

  // 실시간 업데이트 훅
  useReservationRealtime({
    isAdmin,
    authLoading,
    onReservationsUpdate: setReservations
  });

  // 필터링 설정
  const filterState = useAdminFilters({
    data: reservations,
    searchFields: ['customer_name'],
    filterFunctions: {
      status: (reservation, status) => {
        if (status === 'all') return true;
        return reservation.status === status;
      }
    }
  });

  // 데이터 초기화
  useEffect(() => {
    if (hookReservations) {
      setReservations(hookReservations);
    }
  }, [hookReservations]);

  // 액션 핸들러들
  const handleViewDetails = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowDetailModal(true);
  };

  const handleChangeReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowChangeModal(true);
  };

  const handleCancelReservation = async (reservation: Reservation) => {
    try {
      await cancelReservation();
      showSuccess("예약이 취소되었습니다.");
      setShowCancelModal(false);
      refreshData();
    } catch {
      showError("예약 취소에 실패했습니다.");
    }
  };

  // 통계 계산
  const totalReservations = reservations.length;
  const confirmedReservations = reservations.filter(r => r.status === 'confirmed').length;
  const pendingReservations = reservations.filter(r => r.status === 'pending').length;
  const cancelledReservations = reservations.filter(r => r.status === 'cancelled').length;

  // 테이블 컬럼 정의
  const columns: AdminTableColumn<Reservation>[] = [
    {
      key: 'status',
      title: '상태',
      render: (_, reservation) => {
        const statusConfig = {
          confirmed: { icon: CheckCircle, text: '확정', class: 'bg-green-100 text-green-800' },
          pending: { icon: Clock, text: '대기', class: 'bg-yellow-100 text-yellow-800' },
          cancelled: { icon: XCircle, text: '취소', class: 'bg-red-100 text-red-800' },
        };
        const config = statusConfig[reservation.status as keyof typeof statusConfig] || 
                      { icon: Calendar, text: reservation.status, class: 'bg-gray-100 text-gray-800' };
        const Icon = config.icon;
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.text}
          </span>
        );
      }
    },
    {
      key: 'customer',
      title: '고객',
      render: (_, reservation) => (
        <div>
          <div className="font-medium">
            {reservation.customers?.nickname || reservation.customers?.email || '알 수 없음'}
          </div>
          <div className="text-sm text-gray-500">
            {reservation.customers?.email}
          </div>
        </div>
      )
    },
    {
      key: 'reservation_time',
      title: '예약 시간',
      render: (_, reservation) => (
        <div>
          {reservation.reservation_date && reservation.start_time ? (
            <>
              <div className="font-medium">
                {format(new Date(`${reservation.reservation_date}T${reservation.start_time}`), "MM/dd HH:mm", { locale: ko })}
              </div>
              {reservation.end_time && (
                <div className="text-sm text-gray-500">
                  ~ {reservation.end_time}
                </div>
              )}
            </>
          ) : (
            <span className="text-red-500 text-sm">시간 미정</span>
          )}
        </div>
      )
    },
    {
      key: 'created_at',
      title: '생성일',
      render: (_, reservation) => reservation.created_at 
        ? format(new Date(reservation.created_at), "yyyy.MM.dd HH:mm", { locale: ko })
        : '-'
    },
    {
      key: 'actions',
      title: '관리',
      render: (_, reservation) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewDetails(reservation)}>
              <User className="mr-2 h-4 w-4" />
              상세보기
            </DropdownMenuItem>
            {reservation.status !== 'cancelled' && (
              <>
                <DropdownMenuItem onClick={() => handleChangeReservation(reservation)}>
                  <Calendar className="mr-2 h-4 w-4" />
                  시간변경
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    setSelectedReservation(reservation);
                    setShowCancelModal(true);
                  }}
                  className="text-red-600"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  예약취소
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  if (authLoading || dataLoading) {
    return <AdminLoadingState type="table" message="예약 목록을 불러오는 중..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="예약 관리"
        description="고객 예약을 관리하고 모니터링할 수 있습니다."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        }
      />

      <AdminStatsGrid columns={4}>
        <AdminStatsCard
          title="전체 예약"
          value={totalReservations}
          icon={<Calendar className="h-5 w-5" />}
          description="총 예약 건수"
        />
        <AdminStatsCard
          title="확정"
          value={confirmedReservations}
          icon={<CheckCircle className="h-5 w-5" />}
          description="확정된 예약"
          change={{ value: 12.5 }}
        />
        <AdminStatsCard
          title="대기"
          value={pendingReservations}
          icon={<Clock className="h-5 w-5" />}
          description="승인 대기 중"
          change={{ value: -5.2 }}
        />
        <AdminStatsCard
          title="취소"
          value={cancelledReservations}
          icon={<XCircle className="h-5 w-5" />}
          description="취소된 예약"
        />
      </AdminStatsGrid>

      <AdminTable
        columns={columns}
        data={filterState.data}
        empty={{
          title: "조건에 맞는 예약이 없습니다",
          description: "다른 검색 조건을 시도해보세요"
        }}
      />

      {/* 기존 모달들 유지 */}
      {selectedReservation && (
        <ReservationDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          reservation={selectedReservation}
          history={[]}
          historyLoading={false}
          historyError={null}
          isSubmitting={isSubmitting}
          onOpenChangeModal={() => setShowChangeModal(true)}
          onOpenCancelModal={() => setShowCancelModal(true)}
        />
      )}

      {selectedReservation && (
        <ReservationChangeModal
          isOpen={showChangeModal}
          onClose={() => setShowChangeModal(false)}
          reservation={selectedReservation}
          selectedDate={new Date()}
          onDateSelect={() => {}}
          selectedTimeRange={{ start: '09:00', end: '18:00', duration: 0, price: 0 }}
          onTimeRangeChange={() => {}}
          onSubmit={async () => {}}
          isSubmitting={isSubmitting}
        />
      )}

      {selectedReservation && (
        <ReservationCancelModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          reservation={selectedReservation}
          onSubmit={() => handleCancelReservation(selectedReservation)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}