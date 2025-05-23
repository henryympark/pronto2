"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useSupabase } from "@/contexts/SupabaseContext";

type Reservation = {
  id: string;
  service_id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name: string;
  company_name?: string;
  shooting_purpose?: string;
  vehicle_number?: string;
  admin_memo?: string;
  created_at: string;
  customers: {
    id: string;
    email?: string;
    nickname?: string;
    phone?: string;
  };
  services?: {
    id: string;
    name: string;
    price_per_hour: number;
  };
};

export default function AdminReservationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = useSupabase();
  
  useEffect(() => {
    console.log("[어드민 예약 페이지] 데이터 로드 시작");
    
    async function fetchReservations() {
      try {
        console.log("[어드민 예약 페이지] Supabase 쿼리 시작");
        
        const { data, error } = await supabase
          .from('reservations')
          .select(`
            *,
            customers(id, email, nickname, phone),
            services(id, name, price_per_hour)
          `)
          .order('created_at', { ascending: false });
          
        console.log("[어드민 예약 페이지] 쿼리 완료", { 
          hasError: !!error, 
          dataLength: data?.length || 0
        });
          
        if (error) {
          console.error("[어드민 예약 페이지] 데이터 로드 에러:", error);
          
          if (error.code === 'PGRST116' || error.message?.includes('permission denied')) {
            const errorMsg = error.code === 'PGRST116'
              ? '예약 테이블이 아직 존재하지 않습니다.'
              : '예약 테이블에 접근할 권한이 없습니다.';
            
            setError(errorMsg);
          } else {
            throw error;
          }
        }
        
        console.log("[어드민 예약 페이지] 데이터 로드 성공");
        setReservations(data || []);
      } catch (err: any) {
        console.error('[어드민 예약 페이지] 예약 정보 로딩 오류:', err);
        setError(err.message || '예약 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchReservations();
  }, [supabase]);
  
  const openReservationDetail = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 M월 d일 HH:mm', { locale: ko });
    } catch (e) {
      return '날짜 형식 오류';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'modified':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '확정';
      case 'cancelled':
        return '취소됨';
      case 'modified':
        return '변경됨';
      case 'pending':
        return '대기중';
      default:
        return status;
    }
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">예약 현황</h1>
      
      {loading ? (
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-t-pronto-primary rounded-full animate-spin"></div>
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
                    {reservation.start_time ? formatDateTime(reservation.start_time) : '알 수 없음'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(reservation.status)}`}>
                      {getStatusText(reservation.status)}
                    </span>
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
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>예약 상세 정보</DialogTitle>
          </DialogHeader>
          
          {selectedReservation && (
            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">예약 ID</h3>
                  <p className="mt-1">{selectedReservation.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">상태</h3>
                  <p className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(selectedReservation.status)}`}>
                      {getStatusText(selectedReservation.status)}
                    </span>
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">서비스</h3>
                  <p className="mt-1">{selectedReservation.services?.name || '알 수 없음'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">가격</h3>
                  <p className="mt-1">{selectedReservation.services?.price_per_hour?.toLocaleString() || '0'}원/시간</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">예약 시간</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs text-gray-500">시작 시간</h4>
                    <p className="mt-1">{formatDateTime(selectedReservation.start_time)}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-500">종료 시간</h4>
                    <p className="mt-1">{formatDateTime(selectedReservation.end_time)}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">고객 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs text-gray-500">이름</h4>
                    <p className="mt-1">{selectedReservation.customer_name}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-500">이메일</h4>
                    <p className="mt-1">{selectedReservation.customers?.email || '정보 없음'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-500">전화번호</h4>
                    <p className="mt-1">{selectedReservation.customers?.phone || '정보 없음'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-500">업체명</h4>
                    <p className="mt-1">{selectedReservation.company_name || '정보 없음'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">추가 정보</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <h4 className="text-xs text-gray-500">촬영 목적</h4>
                    <p className="mt-1">{selectedReservation.shooting_purpose || '정보 없음'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-500">차량번호</h4>
                    <p className="mt-1">{selectedReservation.vehicle_number || '정보 없음'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-500">관리자 메모</h4>
                    <p className="mt-1">{selectedReservation.admin_memo || '메모 없음'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 flex justify-end space-x-3">
                <button 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  onClick={() => alert('예약 변경 기능은 아직 구현되지 않았습니다.')}
                >
                  예약 변경
                </button>
                <button 
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  onClick={() => alert('예약 취소 기능은 아직 구현되지 않았습니다.')}
                >
                  예약 취소
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 