"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/contexts/SupabaseContext";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { formatTimeDisplay } from "@/lib/date-utils";
import { PostgrestError } from "@supabase/supabase-js";
import { Customer, CustomerCoupon } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/shared/hooks";
import { Loader2, Gift, AlertCircle, CheckCircle2, UserPlus, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "axios";

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    email: "",
    nickname: "",
    phone: "",
    password: ""
  });

  // 새로운 쿠폰/적립시간 부여 관련 상태
  const [grantType, setGrantType] = useState<'coupon' | 'time'>('coupon');
  const [couponMinutes, setCouponMinutes] = useState(30);
  const [timeMinutes, setTimeMinutes] = useState(10);
  const [grantLoading, setGrantLoading] = useState(false);
  
  const supabase = useSupabase();
  const { user } = useAuth();
  const customersPerPage = 10;
  
  // 고객 목록 조회 함수
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      // 전체 고객 수 조회
      const { count, error: countError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        throw countError;
      }
      
      const total = count || 0;
      setTotalPages(Math.ceil(total / customersPerPage));
      
      // 페이지네이션 적용하여 고객 목록 조회
      const from = (currentPage - 1) * customersPerPage;
      const to = from + customersPerPage - 1;
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
        
      if (error) {
        throw error;
      }
      
      setCustomers(data || []);
    } catch (err: unknown) {
      console.error('고객 정보 로딩 오류:', err);
      
      // PostgrestError 타입인지 확인
      if (typeof err === 'object' && err !== null) {
        const postgrestError = err as PostgrestError;
        setError(postgrestError.message || '고객 정보를 불러오는데 실패했습니다.');
      } else {
        setError('고객 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // 쿠폰/적립시간 부여 다이얼로그 열기
  const handleGrantRewards = (customer: Customer) => {
    setSelectedCustomer(customer);
    setGrantType('coupon');
    setCouponMinutes(30);
    setTimeMinutes(10);
    setRewardDialogOpen(true);
  };

  // 신규 고객 등록 다이얼로그 열기
  const handleAddCustomer = () => {
    setNewCustomerData({
      email: "",
      nickname: "",
      phone: "",
      password: ""
    });
    setAddCustomerDialogOpen(true);
  };

  // 신규 고객 등록 처리
  const handleCreateCustomer = async () => {
    try {
      if (!newCustomerData.email || !newCustomerData.password) {
        toast({
          title: "오류",
          description: "이메일과 비밀번호는 필수입니다.",
          variant: "destructive",
        });
        return;
      }

      // Supabase Auth를 통한 사용자 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newCustomerData.email,
        password: newCustomerData.password,
        options: {
          data: {
            nickname: newCustomerData.nickname,
            phone: newCustomerData.phone,
            role: 'customer'
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // customers 테이블에 추가 정보 저장
        const { error: customerError } = await supabase
          .from('customers')
          .insert({
            id: authData.user.id,
            email: newCustomerData.email,
            nickname: newCustomerData.nickname,
            phone: newCustomerData.phone,
            role: 'customer',
            auth_provider: 'email',
            accumulated_time_minutes: 0,
            is_active: true
          });

        if (customerError) {
          throw customerError;
        }

        toast({
          title: "성공",
          description: "신규 고객이 등록되었습니다.",
        });

        setAddCustomerDialogOpen(false);
        fetchCustomers(); // 목록 새로고침
      }
    } catch (error: any) {
      console.error('고객 등록 오류:', error);
      toast({
        title: "오류",
        description: error.message || "고객 등록에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 새로운 쿠폰/적립시간 부여 처리 함수
  const handleConfirmGrantRewards = async () => {
    if (!selectedCustomer || !user) return;

    try {
      setGrantLoading(true);

      // Edge Function 호출
      const { data, error } = await supabase.functions.invoke('admin-grant-rewards', {
        body: {
          target_customer_id: selectedCustomer.id,
          grant_type: grantType,
          coupon_minutes: grantType === 'coupon' ? couponMinutes : undefined,
          time_minutes: grantType === 'time' ? timeMinutes : undefined,
          reason: `관리자에 의한 ${grantType === 'coupon' ? '쿠폰' : '적립시간'} 부여`
        }
      });

      if (error) {
        console.error('Edge Function 오류:', error);
        throw new Error(error.message || '부여 처리 중 오류가 발생했습니다.');
      }

      if (!data?.success) {
        throw new Error(data?.error || '부여 처리에 실패했습니다.');
      }

      // 성공 메시지 생성
      let successMessage = '';
      if (grantType === 'coupon') {
        successMessage = `${selectedCustomer.nickname || selectedCustomer.email}님에게 ${couponMinutes}분 쿠폰이 부여되었습니다.`;
      } else if (grantType === 'time') {
        successMessage = `${selectedCustomer.nickname || selectedCustomer.email}님에게 ${timeMinutes}분 적립시간이 부여되었습니다.`;
      }

      toast({
        title: "성공",
        description: successMessage,
      });

      setRewardDialogOpen(false);
      setSelectedCustomer(null);
      
      // 고객 목록 새로고침
      fetchCustomers();
    } catch (error: any) {
      console.error('쿠폰/적립시간 부여 오류:', error);
      toast({
        title: "오류",
        description: error.message || "부여 처리에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setGrantLoading(false);
    }
  };

  // 시간 표시 포맷팅
  const formatTimeDisplay = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}시간 ${remainingMinutes}분`;
    } else {
      return `${remainingMinutes}분`;
    }
  };

  // 페이지 변경 시 데이터 새로고침
  useEffect(() => {
    fetchCustomers();
  }, [currentPage]);

  // 컴포넌트 마운트 시 즉시 데이터 로딩
  useEffect(() => {
    fetchCustomers();
  }, []);

  const getAuthProviderText = (provider: string) => {
    switch (provider) {
      case 'email':
        return '이메일';
      case 'kakao':
        return '카카오';
      case 'naver':
        return '네이버';
      default:
        return provider;
    }
  };
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">고객 관리</h1>
        <Button onClick={handleAddCustomer} className="flex items-center">
          <UserPlus className="mr-2 h-4 w-4" />
          신규 고객 등록
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <p className="text-sm mt-2">
            customers 테이블이 아직 생성되지 않았을 수 있습니다.
          </p>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">등록된 고객이 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden shadow">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left">이름/닉네임</th>
                  <th className="py-3 px-4 text-left">이메일</th>
                  <th className="py-3 px-4 text-left">전화번호</th>
                  <th className="py-3 px-4 text-left">가입 방식</th>
                  <th className="py-3 px-4 text-left">적립 시간</th>
                  <th className="py-3 px-4 text-left">가입일</th>
                  <th className="py-3 px-4 text-left">상태</th>
                  <th className="py-3 px-4 text-left">쿠폰/적립시간 부여</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{customer.nickname || '이름 없음'}</td>
                    <td className="py-3 px-4">{customer.email || '이메일 없음'}</td>
                    <td className="py-3 px-4">{customer.phone || '전화번호 없음'}</td>
                    <td className="py-3 px-4">{getAuthProviderText(customer.auth_provider)}</td>
                    <td className="py-3 px-4">{formatTimeDisplay(customer.accumulated_time_minutes)}</td>
                    <td className="py-3 px-4">
                      {customer.created_at ? format(new Date(customer.created_at), 'yyyy-MM-dd', { locale: ko }) : '알 수 없음'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full`}
                        >
                          활성
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGrantRewards(customer)}
                        className="flex items-center"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  이전
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-md ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  다음
                </button>
              </nav>
            </div>
          )}
          
          {/* 쿠폰/적립시간 부여 다이얼로그 */}
          <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>쿠폰/적립시간 부여</DialogTitle>
              </DialogHeader>
              
              {selectedCustomer && (
                <div className="space-y-6 py-4">
                  {/* 고객 정보 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">고객 정보</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="font-medium">
                          {selectedCustomer.nickname || selectedCustomer.email || '이름 없음'}
                        </p>
                        <p className="text-sm text-gray-500">
                          현재 적립시간: {formatTimeDisplay(selectedCustomer.accumulated_time_minutes)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 부여 유형 선택 */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">부여 유형</Label>
                    <Tabs value={grantType} onValueChange={(value) => setGrantType(value as 'coupon' | 'time')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="coupon">쿠폰</TabsTrigger>
                        <TabsTrigger value="time">적립시간</TabsTrigger>
                      </TabsList>

                      <div className="mt-4">
                        <TabsContent value="coupon" className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="coupon-minutes">쿠폰 시간 (분)</Label>
                            <Select
                              value={couponMinutes.toString()}
                              onValueChange={(value) => setCouponMinutes(parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30">30분</SelectItem>
                                <SelectItem value="60">60분</SelectItem>
                                <SelectItem value="90">90분</SelectItem>
                                <SelectItem value="120">120분</SelectItem>
                                <SelectItem value="180">180분</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TabsContent>

                        <TabsContent value="time" className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="time-minutes">적립시간 (분)</Label>
                            <Select
                              value={timeMinutes.toString()}
                              onValueChange={(value) => setTimeMinutes(parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10분</SelectItem>
                                <SelectItem value="20">20분</SelectItem>
                                <SelectItem value="30">30분</SelectItem>
                                <SelectItem value="60">60분</SelectItem>
                                <SelectItem value="120">120분</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setRewardDialogOpen(false)}
                  disabled={grantLoading}
                >
                  취소
                </Button>
                <Button
                  onClick={handleConfirmGrantRewards}
                  disabled={grantLoading}
                >
                  {grantLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    '부여하기'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 고객 등록 다이얼로그 */}
          <Dialog open={addCustomerDialogOpen} onOpenChange={setAddCustomerDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>신규 고객 등록</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 (필수)</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={newCustomerData.email}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="이메일 주소"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호 (필수)</Label>
                  <Input
                    id="password"
                    name="password"
                    type="text"
                    value={newCustomerData.password}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="6자 이상 입력"
                    required
                  />
                  <p className="text-xs text-gray-500">6자 이상의 비밀번호를 입력해주세요.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="nickname">이름/닉네임</Label>
                  <Input
                    id="nickname"
                    name="nickname"
                    value={newCustomerData.nickname}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, nickname: e.target.value }))}
                    placeholder="이름 또는 닉네임"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddCustomerDialogOpen(false)}
                >
                  취소
                </Button>
                <Button
                  onClick={handleCreateCustomer}
                >
                  고객 등록
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
} 