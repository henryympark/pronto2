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
import { Loader2, Gift, AlertCircle, CheckCircle2, UserPlus, Plus, Crown, UserCheck, Edit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import axios from "axios";
import CustomerStatsDashboard from "./components/CustomerStatsDashboard";
import CustomerFilters from "./components/CustomerFilters";
import { useCustomerFilters } from "./hooks/useCustomerFilters";
import { HighlightText } from "../reservations/utils/searchHighlight";
import { Badge } from "@/components/ui/badge";

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomerData, setNewCustomerData] = useState({
    email: "",
    nickname: "",
    phone: "",
    password: ""
  });

  // 태그 시스템 상태
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const [customerTags, setCustomerTags] = useState<Array<{ customer_id: string; tag_id: string }>>([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  // 편집 모드 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nickname: "",
    phone: "",
    company_name: "",
  });

  // 필터링 시스템
  const {
    filters,
    filteredCustomers,
    updateActivity,
    updateFrequency,
    updateCustomerType,
    updateStatus,
    updateSelectedTagIds,
    updateSearchQuery,
    resetFilters,
    totalCount,
    filteredCount,
    isSearching,
  } = useCustomerFilters(allCustomers);

  // 새로운 쿠폰/적립시간 부여 관련 상태
  const [grantType, setGrantType] = useState<'coupon' | 'time'>('coupon');
  const [couponMinutes, setCouponMinutes] = useState(30);
  const [timeMinutes, setTimeMinutes] = useState(10);
  const [grantLoading, setGrantLoading] = useState(false);
  
  const supabase = useSupabase();
  const { user } = useAuth();
  
  // 태그 데이터 로드
  const fetchTags = async () => {
    try {
      setTagsLoading(true);
      
      // 태그 목록 로드
      const { data: tagsData, error: tagsError } = await supabase
        .from('customer_tags')
        .select('*')
        .order('name');

      if (tagsError) throw tagsError;

      // 고객-태그 매핑 로드
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('customer_tag_mappings')
        .select('*');

      if (mappingsError) throw mappingsError;

      setAvailableTags(tagsData || []);
      setCustomerTags(mappingsData || []);
    } catch (error: any) {
      console.error('태그 데이터 로드 실패:', error);
    } finally {
      setTagsLoading(false);
    }
  };

  // 고객에게 태그 추가
  const addTagToCustomer = async (customerId: string, tagId: string) => {
    try {
      const { error } = await supabase
        .from('customer_tag_mappings')
        .insert({ customer_id: customerId, tag_id: tagId });

      if (error) throw error;

      toast({
        title: "성공",
        description: "태그가 추가되었습니다.",
      });

      fetchTags(); // 태그 목록 새로고침
    } catch (error: any) {
      toast({
        title: "오류",
        description: "태그 추가에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 고객에서 태그 제거
  const removeTagFromCustomer = async (customerId: string, tagId: string) => {
    try {
      const { error } = await supabase
        .from('customer_tag_mappings')
        .delete()
        .eq('customer_id', customerId)
        .eq('tag_id', tagId);

      if (error) throw error;

      toast({
        title: "성공",
        description: "태그가 제거되었습니다.",
      });

      fetchTags(); // 태그 목록 새로고침
    } catch (error: any) {
      toast({
        title: "오류",
        description: "태그 제거에 실패했습니다.",
        variant: "destructive",
      });
    }
  };
  
  // 고객 목록 조회 함수 (전체 고객을 한 번에 로드)
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setAllCustomers(data || []);
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

  // 고객 상세 보기
  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerDetailOpen(true);
  };

  // 고객 편집
  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setSelectedCustomer(customer);
    setIsEditing(true);
    setEditFormData({
      nickname: customer.nickname || "",
      phone: customer.phone || "",
      company_name: customer.company_name || "",
    });
    setCustomerDetailOpen(true);
  };

  // 편집 취소
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingCustomer(null);
    setEditFormData({
      nickname: "",
      phone: "",
      company_name: "",
    });
  };

  // 편집 저장
  const handleSaveEdit = async () => {
    if (!selectedCustomer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          nickname: editFormData.nickname || undefined,
          phone: editFormData.phone || undefined,
          company_name: editFormData.company_name || undefined,
        })
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      toast({
        title: "성공",
        description: "고객 정보가 업데이트되었습니다.",
      });

      // 상태 초기화 및 데이터 새로고침
      setIsEditing(false);
      setEditingCustomer(null);
      fetchCustomers();
      
      // 선택된 고객 정보도 업데이트
      setSelectedCustomer({
        ...selectedCustomer,
        nickname: editFormData.nickname || undefined,
        phone: editFormData.phone || undefined,
        company_name: editFormData.company_name || undefined,
      });
    } catch (error: any) {
      toast({
        title: "오류",
        description: "고객 정보 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // VIP 상태 토글
  const handleToggleVip = async (customer: Customer) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ is_vip: !customer.is_vip })
        .eq('id', customer.id);

      if (error) throw error;

      toast({
        title: "성공",
        description: `${customer.nickname || customer.email}님의 VIP 상태가 ${!customer.is_vip ? '설정' : '해제'}되었습니다.`,
      });

      fetchCustomers();
    } catch (error: any) {
      toast({
        title: "오류",
        description: "VIP 상태 변경에 실패했습니다.",
        variant: "destructive",
      });
    }
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
    fetchTags();
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
      
      {/* 통계 대시보드 */}
      {!loading && !error && allCustomers.length > 0 && (
        <CustomerStatsDashboard customers={allCustomers} />
      )}
      
      {/* 필터링 시스템 */}
      {!loading && !error && allCustomers.length > 0 && (
        <CustomerFilters
          filters={filters}
          onUpdateActivity={updateActivity}
          onUpdateFrequency={updateFrequency}
          onUpdateCustomerType={updateCustomerType}
          onUpdateStatus={updateStatus}
          onUpdateSelectedTagIds={updateSelectedTagIds}
          onUpdateSearchQuery={updateSearchQuery}
          onResetFilters={resetFilters}
          totalCount={totalCount}
          filteredCount={filteredCount}
          isSearching={isSearching}
        />
      )}
      
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
      ) : allCustomers.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">등록된 고객이 없습니다.</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            {filters.isFiltered 
              ? "검색 조건에 맞는 고객이 없습니다." 
              : "등록된 고객이 없습니다."
            }
          </p>
          {filters.isFiltered && (
            <Button
              variant="outline"
              onClick={resetFilters}
              className="mt-2"
            >
              필터 초기화
            </Button>
          )}
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
                  <th className="py-3 px-4 text-left">회사명</th>
                  <th className="py-3 px-4 text-left">VIP</th>
                  <th className="py-3 px-4 text-left">마지막 방문</th>
                  <th className="py-3 px-4 text-left">가입일</th>
                  <th className="py-3 px-4 text-left">상태</th>
                  <th className="py-3 px-4 text-left">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <HighlightText 
                          text={customer.nickname || '이름 없음'} 
                          searchQuery={filters.searchQuery} 
                        />
                        {customer.is_vip && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <HighlightText 
                        text={customer.email || '이메일 없음'} 
                        searchQuery={filters.searchQuery} 
                      />
                    </td>
                    <td className="py-3 px-4">
                      <HighlightText 
                        text={customer.phone || '전화번호 없음'} 
                        searchQuery={filters.searchQuery} 
                      />
                    </td>
                    <td className="py-3 px-4">
                      <HighlightText 
                        text={customer.company_name || '-'} 
                        searchQuery={filters.searchQuery} 
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        variant={customer.is_vip ? "default" : "outline"}
                        onClick={() => handleToggleVip(customer)}
                        className="text-xs"
                      >
                        {customer.is_vip ? "VIP" : "일반"}
                      </Button>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {customer.last_visit_date 
                        ? format(new Date(customer.last_visit_date), 'MM-dd', { locale: ko })
                        : '미방문'
                      }
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {customer.created_at ? format(new Date(customer.created_at), 'yyyy-MM-dd', { locale: ko }) : '알 수 없음'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        customer.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {customer.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewCustomer(customer)}
                          className="h-8 w-8 p-0"
                          title="상세보기"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditCustomer(customer)}
                          className="h-8 w-8 p-0"
                          title="편집"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleGrantRewards(customer)}
                          className="h-8 w-8 p-0"
                          title="쿠폰/적립시간 부여"
                        >
                          <Gift className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
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

          {/* 고객 상세/편집 다이얼로그 */}
          <Dialog open={customerDetailOpen} onOpenChange={(open) => {
            setCustomerDetailOpen(open);
            if (!open) {
              setEditingCustomer(null);
              setSelectedCustomer(null);
              setIsEditing(false);
              setEditFormData({
                nickname: "",
                phone: "",
                company_name: "",
              });
            }
          }}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? '고객 정보 편집' : '고객 상세 정보'}
                </DialogTitle>
              </DialogHeader>
              
              {selectedCustomer && (
                <div className="space-y-6 py-4">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="basic">기본 정보</TabsTrigger>
                      <TabsTrigger value="activity">활동 현황</TabsTrigger>
                      <TabsTrigger value="tags">태그 관리</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4 mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              고객 기본 정보
                              {selectedCustomer.is_vip && (
                                <Badge variant="default" className="text-xs">VIP</Badge>
                              )}
                            </div>
                            {!isEditing && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditCustomer(selectedCustomer)}
                              >
                                편집
                              </Button>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {isEditing ? (
                            // 편집 모드
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">이름/닉네임</Label>
                                  <Input
                                    value={editFormData.nickname}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, nickname: e.target.value }))}
                                    placeholder="이름 또는 닉네임"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">이메일 (수정 불가)</Label>
                                  <Input value={selectedCustomer.email} disabled />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">전화번호</Label>
                                  <Input
                                    value={editFormData.phone}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="010-0000-0000"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">회사명</Label>
                                  <Input
                                    value={editFormData.company_name}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, company_name: e.target.value }))}
                                    placeholder="회사명"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium text-gray-600">가입 방식 (수정 불가)</Label>
                                <p className="text-sm mt-1">{getAuthProviderText(selectedCustomer.auth_provider)}</p>
                              </div>

                              <div>
                                <Label className="text-sm font-medium text-gray-600">현재 적립 시간</Label>
                                <p className="text-sm mt-1 font-medium text-blue-600">
                                  {formatTimeDisplay(selectedCustomer.accumulated_time_minutes)}
                                </p>
                              </div>

                              <div className="flex gap-2 pt-4">
                                <Button onClick={handleSaveEdit}>저장</Button>
                                <Button variant="outline" onClick={handleCancelEdit}>취소</Button>
                              </div>
                            </div>
                          ) : (
                            // 조회 모드
                            <>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">이름/닉네임</Label>
                                  <p className="text-sm mt-1">{selectedCustomer.nickname || '설정되지 않음'}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">이메일</Label>
                                  <p className="text-sm mt-1">{selectedCustomer.email}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">전화번호</Label>
                                  <p className="text-sm mt-1">{selectedCustomer.phone || '설정되지 않음'}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">회사명</Label>
                                  <p className="text-sm mt-1">{selectedCustomer.company_name || '설정되지 않음'}</p>
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium text-gray-600">가입 방식</Label>
                                <p className="text-sm mt-1">{getAuthProviderText(selectedCustomer.auth_provider)}</p>
                              </div>

                              <div>
                                <Label className="text-sm font-medium text-gray-600">현재 적립 시간</Label>
                                <p className="text-sm mt-1 font-medium text-blue-600">
                                  {formatTimeDisplay(selectedCustomer.accumulated_time_minutes)}
                                </p>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="activity" className="space-y-4 mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">활동 현황</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-600">총 방문 횟수</Label>
                              <p className="text-lg font-semibold text-green-600">
                                {selectedCustomer.total_visit_count || 0}회
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-600">마지막 방문</Label>
                              <p className="text-sm mt-1">
                                {selectedCustomer.last_visit_date 
                                  ? format(new Date(selectedCustomer.last_visit_date), 'yyyy년 MM월 dd일', { locale: ko })
                                  : '방문 기록 없음'
                                }
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-600">가입일</Label>
                              <p className="text-sm mt-1">
                                {format(new Date(selectedCustomer.created_at), 'yyyy년 MM월 dd일', { locale: ko })}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-600">상태</Label>
                              <Badge variant={selectedCustomer.is_active ? "default" : "destructive"}>
                                {selectedCustomer.is_active ? '활성' : '비활성'}
                              </Badge>
                            </div>
                          </div>

                          <div className="pt-4 border-t">
                            <Label className="text-sm font-medium text-gray-600">고객 등급</Label>
                            <div className="mt-2">
                              {(selectedCustomer.total_visit_count || 0) === 0 ? (
                                <Badge variant="outline">신규 고객</Badge>
                              ) : (selectedCustomer.total_visit_count || 0) <= 5 ? (
                                <Badge variant="secondary">재방문 고객</Badge>
                              ) : (
                                <Badge variant="default">단골 고객</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="tags" className="space-y-4 mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">태그 관리</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {tagsLoading ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* 현재 태그 목록 */}
                              <div>
                                <Label className="text-sm font-medium text-gray-600">현재 태그</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {customerTags
                                    .filter(mapping => mapping.customer_id === selectedCustomer.id)
                                    .map(mapping => {
                                      const tag = availableTags.find(t => t.id === mapping.tag_id);
                                      if (!tag) return null;
                                      return (
                                        <Badge 
                                          key={mapping.tag_id} 
                                          variant="default"
                                          className="cursor-pointer hover:bg-red-500"
                                          onClick={() => removeTagFromCustomer(selectedCustomer.id, mapping.tag_id)}
                                          style={{ backgroundColor: tag.color }}
                                        >
                                          {tag.name} ×
                                        </Badge>
                                      );
                                    })}
                                  {customerTags.filter(mapping => mapping.customer_id === selectedCustomer.id).length === 0 && (
                                    <p className="text-sm text-gray-500">설정된 태그가 없습니다</p>
                                  )}
                                </div>
                              </div>

                              {/* 사용 가능한 태그 목록 */}
                              <div>
                                <Label className="text-sm font-medium text-gray-600">태그 추가</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {availableTags
                                    .filter(tag => !customerTags.some(mapping => 
                                      mapping.customer_id === selectedCustomer.id && mapping.tag_id === tag.id
                                    ))
                                    .map(tag => (
                                      <Badge 
                                        key={tag.id}
                                        variant="outline"
                                        className="cursor-pointer hover:bg-blue-50"
                                        onClick={() => addTagToCustomer(selectedCustomer.id, tag.id)}
                                        style={{ borderColor: tag.color, color: tag.color }}
                                      >
                                        {tag.name} +
                                      </Badge>
                                    ))}
                                  {availableTags.length === 0 && (
                                    <p className="text-sm text-gray-500">사용 가능한 태그가 없습니다</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCustomerDetailOpen(false)}
                >
                  닫기
                </Button>
                {selectedCustomer && (
                  <Button
                    variant={selectedCustomer.is_vip ? "outline" : "default"}
                    onClick={() => handleToggleVip(selectedCustomer)}
                  >
                    {selectedCustomer.is_vip ? 'VIP 해제' : 'VIP 설정'}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
} 