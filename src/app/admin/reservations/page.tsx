"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useReservationHistory } from "@/hooks/useReservationHistory";
import { useRouter } from "next/navigation";

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
import { Check, Clock, XCircle, Calendar } from "lucide-react";

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
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // 예약 이력 조회 훅
  const { history, loading: historyLoading, error: historyError } = useReservationHistory(
    selectedReservation?.id || null
  );
  
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // 데이터 페칭 훅 사용
  const { 
    loading, 
    error, 
    reservations, 
    setReservations, 
    refreshData 
  } = useReservationData({
    isAdmin,
    authLoading
  });

  // 필터링 훅
  const {
    filters,
    filteredReservations,
    updateDateRange,
    updateCustomDateRange,
    updateStatus,
    updateServiceId,
    updateSearchQuery,
    resetFilters,
    totalCount,
    filteredCount,
    isSearching,
    getCurrentSearchQuery,
  } = useReservationFilters(reservations);

  // 정렬 훅 추가 (필터링된 데이터에 적용)
  const {
    sortedReservations,
    updateSort,
    resetSort,
    getSortState,
    isSorted,
  } = useReservationSort(filteredReservations);
  
  // Realtime 훅 사용
  const { isRealtimeConnected } = useReservationRealtime({
    isAdmin,
    authLoading,
    onReservationsUpdate: setReservations
  });

  // 현재 검색어 가져오기
  const currentSearchQuery = getCurrentSearchQuery();

  // 모달 닫기 핸들러
  const handleCloseModals = () => {
    setIsChangeModalOpen(false);
    setIsCancelModalOpen(false);
    setSelectedReservation(null);
  };

  // 예약 액션 훅 사용
  const {
    isSubmitting,
    selectedDate,
    selectedTimeRange,
    setSelectedDate,
    handleTimeRangeChange,
    handleChangeReservation,
    handleCancelReservation,
    prepareChangeModal
  } = useReservationActions({
    selectedReservation,
    onRefreshData: refreshData,
    onCloseModals: handleCloseModals
  });
  
  const openReservationDetail = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };

  // 예약 변경 모달 열기
  const openChangeModal = () => {
    prepareChangeModal();
    setIsChangeModalOpen(true);
    setIsModalOpen(false);
  };

  // 예약 취소 모달 열기
  const openCancelModal = () => {
    setIsCancelModalOpen(true);
    setIsModalOpen(false);
  };

  // 필터와 정렬 초기화
  const handleResetAll = () => {
    resetFilters();
    resetSort();
  };

  // 오늘 날짜인지 확인하는 함수
  const isToday = (dateString: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return dateString === today;
  };

  // 지난 예약인지 확인하는 함수  
  const isPastReservation = (reservation: Reservation) => {
    if (!reservation.reservation_date || !reservation.end_time) return false;
    const endDateTime = new Date(`${reservation.reservation_date}T${reservation.end_time}`);
    return endDateTime < new Date();
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-lg">권한을 확인하는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">접근 권한이 없습니다</p>
          <p>관리자 권한이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">예약 관리</h1>
            {/* 실시간 연결 상태 인디케이터 */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-xs font-medium ${isRealtimeConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isRealtimeConnected ? '실시간 연결됨' : '연결 끊어짐'}
              </span>
            </div>
          </div>
          <p className="text-gray-600 mt-1">
            예약 현황을 조회하고 관리할 수 있습니다. 
            {isRealtimeConnected && (
              <span className="text-green-600 font-medium"> 실시간 업데이트 활성화</span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshData()}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </Button>
          
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>새 예약</span>
          </Button>
        </div>
      </div>

      {/* 필터 영역 */}
      <ReservationFilters
        filters={filters}
        onUpdateDateRange={updateDateRange}
        onUpdateCustomDateRange={updateCustomDateRange}
        onUpdateStatus={updateStatus}
        onUpdateServiceId={updateServiceId}
        onUpdateSearchQuery={updateSearchQuery}
        onResetFilters={resetFilters}
        totalCount={totalCount}
        filteredCount={filteredCount}
        isSearching={isSearching}
      />
      
      {loading ? (
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">오류가 발생했습니다</p>
          <p>{error}</p>
          <p className="text-sm mt-2">
            이 오류는 다음 원인으로 발생했을 수 있습니다:
          </p>
          <ul className="list-disc list-inside text-sm mt-1">
            <li>reservations 테이블이 생성되지 않았습니다.</li>
            <li>데이터베이스 연결에 문제가 있습니다.</li>
            <li>필요한 테이블 구조가 변경되었습니다.</li>
          </ul>
          <p className="text-sm mt-2">
            현재는 테이블이 없어도 사용할 수 있도록 페이지를 표시합니다:
          </p>
        </div>
      ) : sortedReservations.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          {filters.isFiltered ? (
            <>
              <p className="text-gray-500">필터 조건에 맞는 예약이 없습니다</p>
              <p className="text-sm text-gray-400 mt-2">다른 조건으로 검색해보세요</p>
              <Button 
                variant="outline" 
                onClick={handleResetAll}
                className="mt-4"
              >
                전체 보기
              </Button>
            </>
          ) : (
            <>
              <p className="text-gray-500">예약 내역이 없습니다</p>
              <p className="text-sm text-gray-400 mt-2">예약이 생성되면 여기에 표시됩니다</p>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full table-auto">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <SortableTableHeader
                  column="status"
                  onSort={updateSort}
                  sortState={getSortState('status')}
                  className="w-28"
                >
                  상태
                </SortableTableHeader>
                <SortableTableHeader
                  column="customer_name"
                  onSort={updateSort}
                  sortState={getSortState('customer_name')}
                  className="min-w-40"
                >
                  고객
                </SortableTableHeader>
                <SortableTableHeader
                  column="reservation_time"
                  onSort={updateSort}
                  sortState={getSortState('reservation_time')}
                  className={`${DESKTOP_DISPLAY_CLASS} min-w-36`}
                >
                  예약 시간
                </SortableTableHeader>
                <SortableTableHeader
                  column="created_at"
                  onSort={updateSort}
                  sortState={getSortState('created_at')}
                  className={`${DESKTOP_DISPLAY_CLASS} w-28`}
                >
                  생성일
                </SortableTableHeader>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedReservations.map((reservation) => {
                const isReservationToday = reservation.reservation_date && isToday(reservation.reservation_date);
                const isPast = isPastReservation(reservation);
                const StatusIcon = getStatusIcon(reservation.status);
                
                return (
                  <tr 
                    key={reservation.id} 
                    className={`${getReservationRowClass(reservation.reservation_date || reservation.created_at || '')} transition-colors`}
                  >
                    {/* 상태 */}
                    <td className={getTableCellClass()}>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getEnhancedStatusBadgeClass(reservation.status)}`}>
                        <StatusIcon className="h-3 w-3" />
                        <span>{getStatusText(reservation.status)}</span>
                      </div>
                    </td>
                    
                    {/* 고객명 */}
                    <td className={getTableCellClass(true)}>
                      <div className="flex items-center space-x-2">
                        <HighlightText
                          text={reservation.customers?.nickname || reservation.customers?.email || '알 수 없음'}
                          searchQuery={currentSearchQuery}
                          className={isPast ? 'text-gray-500' : 'font-medium'}
                        />
                        {/* VIP 고객 표시 (향후 확장용) - 타입 오류로 주석 처리 */}
                        {/* {reservation.customers?.is_vip && (
                          <span className="text-yellow-500 text-xs">★</span>
                        )} */}
                      </div>
                      
                      {/* 모바일 전용 컴팩트 정보 */}
                      <div className={getCompactDisplayClass()}>
                        <div className="text-gray-500">
                          {reservation.reservation_date && reservation.start_time 
                            ? formatDateTime(`${reservation.reservation_date}T${reservation.start_time}`) 
                            : '예약 시간 없음'}
                        </div>
                      </div>
                    </td>
                    
                    {/* 예약 시간 (데스크톱만) */}
                    <td className={`${getTableCellClass()} ${DESKTOP_DISPLAY_CLASS}`}>
                      <div className={`${isPast ? 'text-gray-500' : ''} font-mono text-sm`}>
                        {reservation.reservation_date && reservation.start_time ? (
                          <div>
                            <div className="font-medium">
                              {formatDateTime(`${reservation.reservation_date}T${reservation.start_time}`)}
                            </div>
                            {reservation.end_time && (
                              <div className="text-xs text-gray-500">
                                ~ {reservation.end_time}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-red-500 text-xs">예약 시간 없음</span>
                        )}
                      </div>
                    </td>
                    
                    {/* 생성일 (데스크톱만) */}
                    <td className={`${getTableCellClass()} ${DESKTOP_DISPLAY_CLASS}`}>
                      <span className={`${isPast ? 'text-gray-500' : ''} text-sm`}>
                        {reservation.created_at 
                          ? format(new Date(reservation.created_at), 'yyyy-MM-dd HH:mm', { locale: ko }) 
                          : '생성일 없음'}
                      </span>
                    </td>
                    
                    {/* 관리 액션 */}
                    <td className={getTableCellClass()}>
                      <div className="flex items-center space-x-1">
                        <button 
                          className={getActionButtonClass('view')}
                          onClick={() => openReservationDetail(reservation)}
                        >
                          상세
                        </button>
                        
                        {/* 취소 버튼은 과거 예약이 아니고 이미 취소되지 않은 경우에만 표시 */}
                        {!isPast && reservation.status !== 'cancelled' && (
                          <button 
                            className={getActionButtonClass('cancel')}
                            onClick={() => {
                              setSelectedReservation(reservation);
                              openCancelModal();
                            }}
                          >
                            취소
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 예약 상세 정보 모달 */}
      <ReservationDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        reservation={selectedReservation}
        history={history}
        historyLoading={historyLoading}
        historyError={historyError}
        isSubmitting={isSubmitting}
        onOpenChangeModal={openChangeModal}
        onOpenCancelModal={openCancelModal}
      />

      {/* 예약 변경 모달 */}
      <ReservationChangeModal
        isOpen={isChangeModalOpen}
        onClose={() => setIsChangeModalOpen(false)}
        reservation={selectedReservation}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        selectedTimeRange={selectedTimeRange}
        onTimeRangeChange={handleTimeRangeChange}
        onSubmit={handleChangeReservation}
        isSubmitting={isSubmitting}
      />

      {/* 예약 취소 확인 모달 */}
      <ReservationCancelModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        reservation={selectedReservation}
        onSubmit={handleCancelReservation}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}