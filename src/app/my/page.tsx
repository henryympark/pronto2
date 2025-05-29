"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, LogOut, User, Star, Clock, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTimeDisplay } from "@/lib/date-utils";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Link from "next/link";
import { useReservationHistory } from "@/hooks/useReservationHistory";
import ReservationHistoryTimeline from "@/components/ReservationHistoryTimeline";
// 예약 연장 관련 컴포넌트 import
import { ExtensionButton, ExtensionModal } from "@/components/reservation";
import type { Reservation, ReservationHistory } from '@/types/reservation';

type FilterType = 'upcoming' | 'completed' | 'cancelled';

export default function MyPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  
  // 상태 변수들
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('upcoming');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [accumulatedTime, setAccumulatedTime] = useState(0);
  const [couponsCount, setCouponsCount] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);

  // 예약 취소 관련 상태
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelingReservation, setCancelingReservation] = useState<Reservation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // 예약 연장 관련 상태
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [extendingReservation, setExtendingReservation] = useState<Reservation | null>(null);

  // 예약 이력 조회 훅
  const { history, loading: historyLoading, error: historyError } = useReservationHistory(
    selectedReservation?.id || null
  );

  // 기본 핸들러들
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      toast.error("로그아웃 중 오류가 발생했습니다.");
    }
  };

  const handleRefresh = () => {
    if (isLoading) return;
    setIsLoading(true);
    Promise.allSettled([fetchReservations(), fetchSimplifiedData()]).finally(() => {
      setIsLoading(false);
    });
  };

  const fetchReservations = async () => {
    if (!user?.id) return;
    
    try {
      console.log('[MyPage] 예약 조회 시작 - 사용자 ID:', user.id);
      
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          service:services(id, name)
        `)
        .eq('customer_id', user.id)
        .order('reservation_date', { ascending: false });

      console.log('[MyPage] 예약 조회 결과:', { data, error });

      if (error) throw error;
      
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        service: item.service || { id: item.service_id, name: '알 수 없는 서비스' },
        company_name: item.company_name || '',
        purpose: item.shooting_purpose || '',
        car_number: item.vehicle_number || '',
        has_review: item.has_review === true
      }));
      
      console.log('[MyPage] 포맷된 예약 데이터:', formattedData);
      
      setReservations(formattedData);
      applyFilter(formattedData, activeFilter);
      setHasError(false);
    } catch (error) {
      console.error('예약 정보 조회 실패:', error);
      toast.error("예약 정보를 불러오는 중 오류가 발생했습니다.");
      setHasError(true);
      setReservations([]);
      setFilteredReservations([]);
    }
  };

  const fetchSimplifiedData = async () => {
    if (!user?.id) return;
    
    try {
      const { data: dashboardData, error: dashboardError } = await supabase
        .rpc('get_user_dashboard_data', { user_id: user.id });
        
      if (dashboardError) {
        console.warn('대시보드 데이터 오류:', dashboardError.message);
        setAccumulatedTime(0);
        setCouponsCount(0);
        setReviewsCount(0);
      } else if (dashboardData) {
        setAccumulatedTime(dashboardData.accumulated_time_minutes || 0);
        setCouponsCount(dashboardData.active_coupons_count || 0);
        setReviewsCount(dashboardData.reviews_count || 0);
      }
    } catch (error) {
      console.error('간소화된 데이터 로드 실패:', error);
      setAccumulatedTime(0);
      setCouponsCount(0);
      setReviewsCount(0);
    }
  };

  // 필터 함수들
  const applyFilter = (allReservations: Reservation[], filterType: FilterType) => {
    if (!allReservations || allReservations.length === 0) {
      setFilteredReservations([]);
      return [];
    }
    
    let filtered: Reservation[] = [];
    const now = new Date();
    
    switch (filterType) {
      case 'upcoming':
        filtered = allReservations.filter(res => {
          const endDateTime = new Date(`${res.reservation_date}T${res.end_time}`);
          return (res.status === 'confirmed' || res.status === 'modified') && endDateTime > now;
        });
        break;
      case 'completed':
        filtered = allReservations.filter(res => {
          const endDateTime = new Date(`${res.reservation_date}T${res.end_time}`);
          return res.status === 'completed' || 
                 ((res.status === 'confirmed' || res.status === 'modified') && endDateTime <= now);
        });
        break;
      case 'cancelled':
        filtered = allReservations.filter(res => res.status === 'cancelled');
        break;
      default:
        filtered = allReservations;
    }
    
    setFilteredReservations(filtered);
    return filtered;
  };

  const handleFilterChange = (filterType: FilterType) => {
    setActiveFilter(filterType);
    applyFilter(reservations, filterType);
  };

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };

  // 유틸리티 함수들
  const formatTimeString = (timeStr: string) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const getStatusColorClass = (reservation: Reservation) => {
    const status = reservation.status || '';
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'modified': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getStatusText = (reservation: Reservation) => {
    const status = reservation.status || '';
    switch (status) {
      case 'confirmed': return '예약 확정';
      case 'completed': return '이용 완료';
      case 'cancelled': return '예약 취소';
      case 'modified': return '예약 변경됨';
      default: return '알 수 없음';
    }
  };

  const canCancelReservation = (reservation: Reservation) => {
    if (!reservation) return false;
    if (reservation.status === 'cancelled') return false;
    if (reservation.status === 'completed') return false;
    
    const endDateTime = new Date(`${reservation.reservation_date}T${reservation.end_time}`);
    return endDateTime > new Date();
  };

  const handleCancelReservation = async () => {
    if (!cancelingReservation) return;
    
    setIsCancelling(true);
    
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', cancelingReservation.id);
        
      if (error) throw error;
      
      setIsCancelModalOpen(false);
      setCancelingReservation(null);
      fetchReservations();
      toast({
        title: "예약 취소 완료",
        description: "예약이 성공적으로 취소되었습니다.",
      });
    } catch (error) {
      console.error('예약 취소 실패:', error);
      toast({
        title: "예약 취소 실패", 
        description: "예약 취소 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // 예약 연장 관련 핸들러들
  const handleExtensionClick = (reservation: Reservation) => {
    setExtendingReservation(reservation);
    setIsExtensionModalOpen(true);
  };

  const handleExtensionSuccess = (updatedReservation: Reservation) => {
    // 예약 목록에서 해당 예약 업데이트
    setReservations(prevReservations => 
      prevReservations.map(res => 
        res.id === updatedReservation.id ? updatedReservation : res
      )
    );
    
    // 필터링된 예약 목록도 업데이트
    setFilteredReservations(prevFiltered => 
      prevFiltered.map(res => 
        res.id === updatedReservation.id ? updatedReservation : res
      )
    );

    // 상세 모달이 열려있다면 업데이트
    if (selectedReservation?.id === updatedReservation.id) {
      setSelectedReservation(updatedReservation);
    }

    // 연장 모달 닫기
    setIsExtensionModalOpen(false);
    setExtendingReservation(null);

    // 간단한 데이터도 새로고침 (적립 시간 등이 변경될 수 있음)
    fetchSimplifiedData();
  };

  // 초기 로드
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!initialDataLoaded) {
      setIsLoading(true);
      Promise.allSettled([fetchReservations(), fetchSimplifiedData()]).finally(() => {
        setIsLoading(false);
        setInitialDataLoaded(true);
      });
    }
  }, [user, loading, initialDataLoaded, router]);

  // 실시간 쿠폰 업데이트 구독
  useEffect(() => {
    if (!user?.id || !supabase) return;

    console.log('[MyPage] 실시간 쿠폰 업데이트 구독 시작:', user.id);

    // customer_coupons 테이블의 변경사항을 실시간으로 감지
    const channel = supabase
      .channel('customer_coupons_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모든 이벤트
          schema: 'public',
          table: 'customer_coupons',
          filter: `customer_id=eq.${user.id}` // 현재 사용자의 쿠폰만 감지
        },
        (payload) => {
          console.log('[MyPage] 쿠폰 변경 감지:', payload);
          
          // 쿠폰 데이터가 변경되면 대시보드 데이터 새로고침
          fetchSimplifiedData();
          
          // 변경 유형에 따른 토스트 메시지
          if (payload.eventType === 'INSERT') {
            toast({
              title: "🎉 새로운 쿠폰이 지급되었습니다!",
              description: "보유 쿠폰이 업데이트되었습니다.",
            });
          } else if (payload.eventType === 'UPDATE' && payload.new?.is_used === true) {
            toast({
              title: "쿠폰이 사용되었습니다",
              description: "보유 쿠폰이 업데이트되었습니다.",
            });
          }
        }
      )
      .subscribe();

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      console.log('[MyPage] 실시간 쿠폰 업데이트 구독 해제');
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase]);

  // 로딩 화면
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg">인증 상태 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col">
        <div className="container py-2 md:py-8">
          {/* 헤더 영역 */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">마이페이지</h1>
            <Button variant="ghost" onClick={handleSignOut} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              <span>로그아웃</span>
            </Button>
          </div>
          
          {/* 로딩 중 표시 */}
          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg">데이터를 불러오는 중입니다...</span>
            </div>
          )}

          {/* 오류 메시지 */}
          {hasError && !isLoading && (
            <Alert variant="destructive" className="mb-6">
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

          {/* 통계 카드 섹션 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* 적립 시간 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-pronto-primary" />
                  적립 시간
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatTimeDisplay(accumulatedTime)}</p>
                <p className="text-sm text-gray-500">
                  {accumulatedTime > 0 
                    ? `리뷰 작성으로 적립된 시간입니다` 
                    : '리뷰 작성으로 적립 시간을 모아보세요!'}
                </p>
              </CardContent>
            </Card>

            {/* 보유 쿠폰 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ticket className="h-5 w-5 mr-2 text-pronto-primary" />
                  보유 쿠폰
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{couponsCount}장</p>
                <p className="text-sm text-gray-500">
                  {couponsCount > 0 
                    ? `사용 가능한 쿠폰이 ${couponsCount}장 있습니다` 
                    : '사용 가능한 쿠폰이 없습니다'}
                </p>
              </CardContent>
            </Card>

            {/* 리뷰 작성 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2 text-pronto-primary" />
                  리뷰 작성
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{reviewsCount}건</p>
                <p className="text-sm text-gray-500">
                  {reviewsCount > 0 
                    ? `작성한 리뷰가 ${reviewsCount}건 있습니다` 
                    : '서비스 이용 후 리뷰를 작성해보세요!'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 예약 내역 섹션 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-6">예약 내역</h2>
            
            {/* 필터링 탭 */}
            <Tabs defaultValue="upcoming" className="mb-6" onValueChange={(value) => handleFilterChange(value as FilterType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upcoming">이용 예정</TabsTrigger>
                <TabsTrigger value="completed">이용 완료</TabsTrigger>
                <TabsTrigger value="cancelled">취소 내역</TabsTrigger>
              </TabsList>
            </Tabs>

            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500">예약 내역이 없습니다.</p>
                <Link href="/" className="mt-4 inline-block">
                  <Button>서비스 둘러보기</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReservations.map((reservation) => (
                  <Card 
                    key={reservation.id} 
                    className="overflow-hidden hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleReservationClick(reservation)}
                  >
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold mb-1">
                              {reservation.service?.name || '알 수 없는 서비스'}
                            </h3>
                            <Badge className={getStatusColorClass(reservation)}>
                              {getStatusText(reservation)}
                            </Badge>
                            
                            {reservation.status === 'cancelled' && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-600">취소 처리 완료</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-gray-500 mb-1">
                              {format(parseISO(reservation.reservation_date), 'yyyy년 MM월 dd일', { locale: ko })}
                              <br />
                              {formatTimeString(reservation.start_time)} ~ {formatTimeString(reservation.end_time)}
                            </p>
                            <p className="font-medium">
                              {reservation.total_price?.toLocaleString() || 0}원
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-600">
                              {reservation.company_name && (
                                <span className="mr-2">회사명: {reservation.company_name}</span>
                              )}
                              {reservation.purpose && (
                                <span>촬영 목적: {reservation.purpose}</span>
                              )}
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            {/* 예약 연장 버튼 - 이용 예정 탭의 active 예약에만 표시 */}
                            {activeFilter === 'upcoming' && 
                              (reservation.status === 'confirmed' || reservation.status === 'modified') && (
                              <ExtensionButton
                                reservation={reservation}
                                onExtensionClick={() => handleExtensionClick(reservation)}
                                disabled={false}
                              />
                            )}
                            
                            {activeFilter === 'completed' && 
                              (reservation.status === 'completed' || 
                              ((reservation.status === 'confirmed' || reservation.status === 'modified') && 
                                new Date(`${reservation.reservation_date}T${reservation.end_time}`) <= new Date())) && 
                              !reservation.has_review && (
                              <Link 
                                href={`/my/reviews/write/${reservation.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button variant="outline" size="sm">리뷰 작성</Button>
                              </Link>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReservationClick(reservation);
                              }}
                            >
                              상세보기
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* 내 정보 및 로그아웃 버튼 */}
          <div className="flex flex-col space-y-4 justify-start mb-8">
            <Link href="/my/profile">
              <Button variant="outline" className="flex items-center justify-center w-40">
                <User className="mr-2 h-4 w-4" />
                내 정보
              </Button>
            </Link>
          </div>

          {/* 예약 상세 정보 모달 */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>예약 상세 정보</DialogTitle>
              </DialogHeader>
              
              {selectedReservation && (
                <div className="space-y-6">
                  {/* 기본 예약 정보 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-1">서비스</h4>
                      <p>{selectedReservation.service?.name || '알 수 없는 서비스'}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-1">예약 상태</h4>
                      <Badge className={getStatusColorClass(selectedReservation)}>
                        {getStatusText(selectedReservation)}
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-1">예약 일시</h4>
                      <p>
                        {format(parseISO(selectedReservation.reservation_date), 'yyyy년 MM월 dd일', { locale: ko })}
                        <br />
                        {formatTimeString(selectedReservation.start_time)} ~ {formatTimeString(selectedReservation.end_time)}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-1">이용 시간</h4>
                      <p>{selectedReservation.total_hours}시간</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-1">결제 정보</h4>
                      <p>총 금액: {selectedReservation.total_price.toLocaleString()}원</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-1">예약자 정보</h4>
                      <p>{selectedReservation.customer_name || user?.user_metadata?.name || '미설정'}</p>
                    </div>
                  </div>

                  {/* 추가 정보 */}
                  {(selectedReservation.company_name || selectedReservation.purpose || selectedReservation.car_number) && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">추가 정보</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedReservation.company_name && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-500">회사명</h5>
                            <p className="mt-1">{selectedReservation.company_name}</p>
                          </div>
                        )}
                        {selectedReservation.purpose && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-500">촬영 목적</h5>
                            <p className="mt-1">{selectedReservation.purpose}</p>
                          </div>
                        )}
                        {selectedReservation.car_number && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-500">차량 번호</h5>
                            <p className="mt-1">{selectedReservation.car_number}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 진행이력 */}
                  <div className="border-t pt-4">
                    <ReservationHistoryTimeline 
                      history={history}
                      loading={historyLoading}
                      error={historyError}
                    />
                  </div>
                </div>
              )}
              
              <DialogFooter className="flex justify-between">
                <div className="flex gap-2">
                  {/* 예약 연장 버튼 - 상세 모달에서 */}
                  {selectedReservation && 
                    (selectedReservation.status === 'confirmed' || selectedReservation.status === 'modified') && (
                    <ExtensionButton
                      reservation={selectedReservation}
                      onExtensionClick={() => handleExtensionClick(selectedReservation)}
                      disabled={false}
                    />
                  )}
                  
                  {selectedReservation && canCancelReservation(selectedReservation) && (
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        setCancelingReservation(selectedReservation);
                        setIsModalOpen(false);
                        setIsCancelModalOpen(true);
                      }}
                    >
                      예약 취소
                    </Button>
                  )}
                </div>
                <Button onClick={() => setIsModalOpen(false)}>닫기</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 예약 취소 확인 모달 */}
          <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>예약 취소</DialogTitle>
                <DialogDescription>
                  정말로 예약을 취소하시겠습니까? 취소 정책에 따라 환불 금액이 달라질 수 있습니다.
                </DialogDescription>
              </DialogHeader>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCancelModalOpen(false)} disabled={isCancelling}>
                  아니오
                </Button>
                <Button variant="destructive" onClick={handleCancelReservation} disabled={isCancelling}>
                  {isCancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      취소 중...
                    </>
                  ) : (
                    '예약 취소'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 예약 연장 모달 */}
          {extendingReservation && (
            <ExtensionModal
              reservation={extendingReservation}
              open={isExtensionModalOpen}
              onOpenChange={(open) => {
                setIsExtensionModalOpen(open);
                if (!open) {
                  setExtendingReservation(null);
                }
              }}
              onSuccess={handleExtensionSuccess}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
