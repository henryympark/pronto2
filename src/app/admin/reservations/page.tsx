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

// 명시적으로 각 함수를 import
import { 
  formatDateTime, 
  getStatusIcon,
  getEnhancedStatusBadgeClass,
  getStatusText,
  getReservationRowClass,
  getActionButtonClass,
  getTableCellClass,
  getCompactDisplayClass,
  getDesktopDisplayClass
} from "./utils/reservationHelpers";

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">예약 관리</h1>
          <p className="text-gray-600 mt-1">예약 현황을 조회하고 관리할 수 있습니다.</p>
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
                  column="id"
                  onSort={updateSort}
                  sortState={getSortState('id')}
                  className="w-24"
                >
                  ID
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
                  column="service_name"
                  onSort={updateSort}
                  sortState={getSortState('service_name')}
                  className={`${getDesktopDisplayClass()} min-w-32`}
                >
                  서비스
                </SortableTableHeader>
                <SortableTableHeader
                  column="reservation_time"
                  onSort={updateSort}
                  sortState={getSortState('reservation_time')}
                  className={`${getDesktopDisplayClass()} min-w-36`}
                >
                  예약 시간
                </SortableTableHeader>
                <SortableTableHeader
                  column="status"
                  onSort={updateSort}
                  sortState={getSortState('status')}
                  className="w-28"
                >
                  상태
                </SortableTableHeader>
                <SortableTableHeader
                  column="created_at"
                  onSort={updateSort}
                  sortState={getSortState('created_at')}
                  className={`${getDesktopDisplayClass()} w-28`}
                >
                  예약일
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
                    {/* ID */}
                    <td className={getTableCellClass()}>
                      <HighlightText
                        text={reservation.id.substring(0, 8) + '...'}
                        searchQuery={currentSearchQuery}
                        className={isPast ? 'text-gray-500' : 'font-mono text-xs'}
                      />
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
                        <div className="text-gray-600">
                          {reservation.services?.name || '알 수 없음'}
                        </div>
                        <div className="text-gray-500">
                          {reservation.start_time ? formatDateTime(`${reservation.reservation_date} ${reservation.start_time}`) : '알 수 없음'}
                        </div>
                      </div>
                    </td>
                    
                    {/* 서비스 (데스크톱만) */}
                    <td className={`${getTableCellClass()} ${getDesktopDisplayClass()}`}>
                      <HighlightText
                        text={reservation.services?.name || '알 수 없음'}
                        searchQuery={currentSearchQuery}
                        className={isPast ? 'text-gray-500' : ''}
                      />
                    </td>
                    
                    {/* 예약 시간 (데스크톱만) */}
                    <td className={`${getTableCellClass()} ${getDesktopDisplayClass()}`}>
                      <span className={`${isPast ? 'text-gray-500' : ''} font-mono text-sm`}>
                        {reservation.start_time ? formatDateTime(`${reservation.reservation_date} ${reservation.start_time}`) : '알 수 없음'}
                      </span>
                    </td>
                    
                    {/* 상태 */}
                    <td className={getTableCellClass()}>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getEnhancedStatusBadgeClass(reservation.status)}`}>
                        <StatusIcon className="h-3 w-3" />
                        <span>{getStatusText(reservation.status)}</span>
                      </div>
                    </td>
                    
                    {/* 예약일 (데스크톱만) */}
                    <td className={`${getTableCellClass()} ${getDesktopDisplayClass()}`}>
                      <span className={`${isPast ? 'text-gray-500' : ''} text-sm`}>
                        {reservation.created_at ? format(new Date(reservation.created_at), 'yyyy-MM-dd', { locale: ko }) : '알 수 없음'}
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
                        
                        {!isPast && (
                          <>
                            <button 
                              className={getActionButtonClass('edit')}
                              onClick={() => {
                                setSelectedReservation(reservation);
                                openChangeModal();
                              }}
                            >
                              변경
                            </button>
                            
                            {reservation.status !== 'cancelled' && (
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
                          </>
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