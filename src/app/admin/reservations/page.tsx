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
import { 
  formatDateTime, 
  getStatusIcon,
  getStatusBadgeClass,
  getStatusText
} from "./utils/reservationHelpers";

// 분리된 모달 컴포넌트들 import
import ReservationDetailModal from "./components/ReservationDetailModal";
import ReservationChangeModal from "./components/ReservationChangeModal";
import ReservationCancelModal from "./components/ReservationCancelModal";

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
  
  // Realtime 훅 사용
  const { isRealtimeConnected } = useReservationRealtime({
    isAdmin,
    authLoading,
    onReservationsUpdate: setReservations
  });

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
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">예약 현황</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-sm ${isRealtimeConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isRealtimeConnected ? '실시간 연결됨' : '실시간 연결 끊김'}
            </span>
            {!isRealtimeConnected && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.reload()}
                className="text-xs px-2 py-1 h-6"
              >
                재연결
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => refreshData()}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            수동 새로고침
          </Button>
          <Button 
            onClick={() => router.push('/admin/reservations/create')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            예약등록
          </Button>
        </div>
      </div>
      
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
      ) : reservations.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">예약 내역이 없습니다</p>
          <p className="text-sm text-gray-400 mt-2">예약이 생성되면 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  서비스
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  예약 시간
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  예약일
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{reservation.id.substring(0, 8)}...</td>
                  <td className="py-3 px-4">
                    {reservation.customers?.nickname || reservation.customers?.email || '알 수 없음'}
                  </td>
                  <td className="py-3 px-4">{reservation.services?.name || '알 수 없음'}</td>
                  <td className="py-3 px-4">
                    {reservation.start_time ? formatDateTime(reservation.reservation_date || '', reservation.start_time) : '알 수 없음'}
                  </td>
                  <td className="py-3 px-4">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${getStatusBadgeClass(reservation)}`}>
                      {getStatusIcon(reservation)}
                      {getStatusText(reservation)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {reservation.created_at ? format(new Date(reservation.created_at), 'yyyy-MM-dd', { locale: ko }) : '알 수 없음'}
                  </td>
                  <td className="py-3 px-4">
                    <button 
                      className="text-blue-600 hover:text-blue-800 mr-2 font-medium"
                      onClick={() => openReservationDetail(reservation)}
                    >
                      상세
                    </button>
                  </td>
                </tr>
              ))}
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