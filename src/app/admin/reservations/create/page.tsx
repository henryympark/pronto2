"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Search, User, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useAuth } from "@/contexts/AuthContext";
import { TimeRangeSelector } from "@/domains/booking";
import { toast } from "@/shared/hooks/useToast";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type Customer = {
  id: string;
  email?: string;
  nickname?: string;
  phone?: string;
  auth_provider?: string;
  created_at: string;
};

type Service = {
  id: string;
  name: string;
  price_per_hour: number;
};

export default function CreateReservationPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const { isAdmin, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  // 폼 상태
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [shootingPurpose, setShootingPurpose] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [adminMemo, setAdminMemo] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<{
    start: string;
    end: string;
    duration: number;
    price: number;
  }>({
    start: "",
    end: "",
    duration: 0,
    price: 0
  });

  // UI 상태
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // 고객 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await fetchServices();
        
        // URL 파라미터에서 고객 ID 확인
        const urlCustomerId = searchParams.get('customerId');
        if (urlCustomerId) {
          await fetchCustomerById(urlCustomerId);
        }
      } catch (error) {
        console.error('초기화 중 오류:', error);
        toast({
          title: "초기화 오류",
          description: "페이지 초기화 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    };

    initializeData().catch(error => {
      console.error('초기화 실행 중 예상치 못한 오류:', error);
    });
  }, [searchParams]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('서비스 조회 오류:', error);
        toast({
          title: "서비스 조회 오류",
          description: "서비스 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
        return;
      }
      
      setServices(data || []);
      if (data && data.length > 0) {
        setSelectedService(data[0]);
      }
    } catch (error) {
      console.error('서비스 조회 중 예상치 못한 오류:', error);
      toast({
        title: "서비스 조회 오류",
        description: "서비스 정보를 불러오는 중 예상치 못한 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const fetchCustomerById = async (customerId: string) => {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) {
        console.error('고객 정보 조회 오류:', error);
        // URL 파라미터가 잘못된 경우일 수 있으므로 toast는 표시하지 않음
        return;
      }
      
      if (customer) {
        selectCustomer(customer);
      }
    } catch (error) {
      console.error('고객 정보 조회 중 예상치 못한 오류:', error);
      // URL 파라미터가 잘못된 경우일 수 있으므로 toast는 표시하지 않음
    }
  };

  const fetchAllCustomers = async () => {
    try {
      setIsLoadingCustomers(true);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('nickname', { ascending: true, nullsFirst: false })
        .order('email', { ascending: true });

      if (error) {
        console.error('전체 고객 조회 중 오류:', error);
        toast({
          title: "고객 목록 조회 오류",
          description: "고객 목록을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
        return;
      }

      setAllCustomers(data || []);
    } catch (error) {
      console.error('전체 고객 조회 중 예상치 못한 오류:', error);
      toast({
        title: "고객 목록 조회 오류",
        description: "고객 목록을 불러오는 중 예상치 못한 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const searchCustomers = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setIsSearching(true);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`email.ilike.%${searchQuery}%,nickname.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .order('nickname', { ascending: true, nullsFirst: false })
        .order('email', { ascending: true })
        .limit(50);

      if (error) {
        console.error('고객 검색 중 오류:', error);
        toast({
          title: "검색 오류",
          description: "고객 검색 중 오류가 발생했습니다.",
          variant: "destructive",
        });
        setSearchResults([]);
        return;
      }

      setSearchResults(data || []);
    } catch (error) {
      console.error('고객 검색 중 예상치 못한 오류:', error);
      toast({
        title: "검색 오류",
        description: "고객 검색 중 예상치 못한 오류가 발생했습니다.",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, supabase, toast]);

  // 검색어 변경 시 디바운싱된 검색 실행
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchCustomers().catch(error => {
        console.error('검색 실행 중 오류:', error);
        toast({
          title: "검색 오류",
          description: "검색 실행 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchCustomers]);

  // 모달이 열릴 때 전체 고객 목록 로드
  useEffect(() => {
    if (isCustomerSearchOpen && allCustomers.length === 0) {
      fetchAllCustomers().catch(error => {
        console.error('전체 고객 목록 로드 중 오류:', error);
      });
    }
  }, [isCustomerSearchOpen, allCustomers.length]);

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.nickname || customer.email || "");
    setIsCustomerSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleTimeRangeChange = useCallback((startTime: string, endTime: string, duration: number, price: number) => {
    try {
      setSelectedTimeRange({
        start: startTime,
        end: endTime,
        duration,
        price
      });
    } catch (error) {
      console.error('시간 범위 변경 오류:', error);
      toast({
        title: "시간 선택 오류",
        description: "시간 선택 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleSubmit = async () => {
    if (!selectedCustomer || !selectedService || !selectedDate || !selectedTimeRange.start || !selectedTimeRange.end) {
      toast({
        title: "필수 정보 누락",
        description: "모든 필수 정보를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // 예약 생성
      const { data: reservation, error } = await supabase
        .from('reservations')
        .insert({
          service_id: selectedService.id,
          customer_id: selectedCustomer.id,
          customer_name: customerName,
          company_name: companyName || null,
          shooting_purpose: shootingPurpose || null,
          vehicle_number: vehicleNumber || null,
          admin_memo: adminMemo || null,
          reservation_date: formattedDate,
          start_time: selectedTimeRange.start,
          end_time: selectedTimeRange.end,
          total_hours: selectedTimeRange.duration,
          total_price: selectedTimeRange.price,
          status: 'pending_payment',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("예약 생성 오류:", error);
        
        // PostgreSQL UNIQUE 제약 조건 위반 (23505) - 동시성 에러
        if (error.code === '23505') {
          toast({
            title: "동시 예약 충돌",
            description: "죄송합니다. 같은 시간에 다른 고객이 먼저 예약을 완료했습니다. 다른 시간을 선택해주세요.",
            variant: "destructive",
          });
          return;
        }

        // PostgreSQL 커스텀 에러 (P0001) - 비즈니스 로직 제약 위반
        if (error.code === 'P0001') {
          toast({
            title: "예약 충돌",
            description: error.message || "선택하신 시간에 이미 다른 예약이 있습니다. 다른 시간을 선택해주세요.",
            variant: "destructive",
          });
          return;
        }

        // 기타 DB 제약 조건 위반
        if (error.code && error.code.startsWith('23')) {
          toast({
            title: "데이터 오류",
            description: "예약 생성 중 데이터 제약 조건에 위반되었습니다. 입력 정보를 확인해주세요.",
            variant: "destructive",
          });
          return;
        }

        // 일반적인 에러 처리
        toast({
          title: "예약 등록 실패",
          description: error.message || "예약 생성 중 오류가 발생했습니다.",
          variant: "destructive",
        });
        return;
      }

      // 웹훅 이벤트 발생 (payment.request.created)
      try {
        const webhookResponse = await fetch('/api/webhooks/payment-request-created', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reservationId: reservation.id,
            customerId: selectedCustomer.id,
            customerName: customerName,
            serviceId: selectedService.id,
            serviceName: selectedService.name,
            startTime: selectedTimeRange.start,
            endTime: selectedTimeRange.end,
            totalPrice: selectedTimeRange.price,
            adminMemo: adminMemo
          }),
        });

        if (!webhookResponse.ok) {
          console.warn('웹훅 응답 오류:', webhookResponse.status, webhookResponse.statusText);
        }
      } catch (webhookError) {
        console.error('웹훅 발생 오류:', webhookError);
        // 웹훅 실패는 예약 생성을 막지 않음
      }

      toast({
        title: "예약 등록 성공",
        description: "예약이 성공적으로 등록되었습니다.",
      });

      router.push('/admin/reservations');
    } catch (error) {
      console.error('예약 등록 중 예상치 못한 오류:', error);
      toast({
        title: "예약 등록 실패",
        description: "예약 등록 중 예상치 못한 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-t-blue-600 rounded-full animate-spin"></div>
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

  // 표시할 고객 목록 결정
  const displayCustomers = searchQuery.trim() ? searchResults : allCustomers;

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </Button>
        <h1 className="text-2xl font-bold">예약 등록</h1>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* 고객 정보 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>고객 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCustomerSearchOpen(true)}
                className="flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                고객 조회
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/admin/customers/create?returnUrl=/admin/reservations/create')}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                신규 고객 등록
              </Button>
            </div>

            {selectedCustomer && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">선택된 고객</span>
                </div>
                <p className="text-sm text-blue-800">
                  {selectedCustomer.nickname || selectedCustomer.email} 
                  {selectedCustomer.phone && ` (${selectedCustomer.phone})`}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">고객 이름 *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="고객 이름을 입력하세요"
                />
              </div>
              <div>
                <Label htmlFor="companyName">업체명</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="업체명을 입력하세요"
                />
              </div>
              <div>
                <Label htmlFor="shootingPurpose">촬영 목적</Label>
                <Input
                  id="shootingPurpose"
                  value={shootingPurpose}
                  onChange={(e) => setShootingPurpose(e.target.value)}
                  placeholder="촬영 목적을 입력하세요"
                />
              </div>
              <div>
                <Label htmlFor="vehicleNumber">차량번호</Label>
                <Input
                  id="vehicleNumber"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="차량번호를 입력하세요"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 예약 정보 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>예약 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>서비스 선택</Label>
              <div className="mt-2 space-y-2">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedService?.id === service.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedService(service)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{service.name}</span>
                      <span className="text-sm text-gray-600">
                        {service.price_per_hour.toLocaleString()}원/시간
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>예약 날짜 선택</Label>
              <div className="mt-2">
                <Calendar
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={(date) => setSelectedDate(date || null)}
                  disabled={(date) => date < new Date()}
                  className="rounded-md"
                />
              </div>
            </div>

            {selectedDate && selectedService && (
              <div>
                <Label>예약 시간 선택</Label>
                <div className="mt-2">
                  <TimeRangeSelector
                    serviceId={selectedService.id}
                    selectedDate={selectedDate}
                    pricePerHour={selectedService.price_per_hour}
                    onTimeRangeChange={handleTimeRangeChange}
                  />
                </div>
              </div>
            )}

            {selectedTimeRange.start && selectedTimeRange.end && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">선택된 예약 정보</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <p>날짜: {selectedDate && format(selectedDate, 'yyyy년 M월 d일', { locale: ko })}</p>
                  <p>시간: {selectedTimeRange.start} ~ {selectedTimeRange.end}</p>
                  <p>이용 시간: {selectedTimeRange.duration}시간</p>
                  <p>총 금액: {selectedTimeRange.price.toLocaleString()}원</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 관리자 메모 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>관리자 메모</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={adminMemo}
              onChange={(e) => setAdminMemo(e.target.value)}
              placeholder="관리자 메모를 입력하세요 (선택사항)"
              rows={4}
            />
          </CardContent>
        </Card>

        {/* 등록 버튼 */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedCustomer || !customerName.trim() || !selectedDate || !selectedTimeRange.start}
          >
            {isSubmitting ? "등록 중..." : "예약 등록"}
          </Button>
        </div>
      </div>

      {/* 고객 검색 모달 */}
      <Dialog open={isCustomerSearchOpen} onOpenChange={setIsCustomerSearchOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>고객 조회</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름, 이메일, 전화번호로 검색"
              />
              <Button onClick={searchCustomers} disabled={isSearching}>
                {isSearching ? "검색 중..." : "검색"}
              </Button>
            </div>

            {!searchQuery.trim() && (
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <p>💡 전체 고객 목록이 가나다 순으로 표시됩니다.</p>
                <p>특정 고객을 찾으려면 위 검색창을 이용하세요.</p>
              </div>
            )}

            {isLoadingCustomers ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {displayCustomers.length === 0 && searchQuery && !isSearching && (
                  <p className="text-center text-gray-500 py-4">검색 결과가 없습니다.</p>
                )}
                
                {displayCustomers.length === 0 && !searchQuery && !isLoadingCustomers && (
                  <p className="text-center text-gray-500 py-4">등록된 고객이 없습니다.</p>
                )}
                
                {displayCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => selectCustomer(customer)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {customer.nickname || customer.email}
                        </p>
                        {customer.phone && (
                          <p className="text-sm text-gray-600">{customer.phone}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          가입: {format(new Date(customer.created_at), 'yyyy-MM-dd')}
                          {customer.auth_provider && ` (${customer.auth_provider})`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 