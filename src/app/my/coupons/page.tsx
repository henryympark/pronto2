"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ticket, Gift, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { ko } from "date-fns/locale";
import { formatTimeDisplay } from "@/lib/date-utils";

interface CustomerCoupon {
  id: string;
  customer_id: string;
  minutes: number;
  is_used: boolean;
  used_at: string | null;
  used_reservation_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  granted_by: string | null;
}

const ITEMS_PER_PAGE = 10;

export default function CouponsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<CustomerCoupon[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'used' | 'expired'>('available');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchCoupons();
    }
  }, [user, authLoading, router, activeTab, currentPage]);

  const fetchCoupons = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // 탭별 필터링
      const filteredCoupons = await getFilteredCoupons();
      
      // 전체 개수 계산
      const totalCount = filteredCoupons.length;
      const calculatedTotalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
      setTotalPages(calculatedTotalPages);

      // 페이지별 데이터 추출
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedCoupons = filteredCoupons.slice(startIndex, endIndex);
      
      setCoupons(paginatedCoupons);
      
    } catch (error) {
      console.error('쿠폰 데이터 조회 실패:', error);
      toast({
        title: "오류",
        description: "데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCoupons = async () => {
    if (!user?.id) return [];
    
    const { data, error } = await supabase
      .from('customer_coupons')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const allCoupons = (data as CustomerCoupon[]) || [];
    
    return allCoupons.filter(coupon => {
      switch (activeTab) {
        case 'available':
          return !coupon.is_used && !isExpired(coupon);
        case 'used':
          return coupon.is_used;
        case 'expired':
          return !coupon.is_used && isExpired(coupon);
        default:
          return true;
      }
    });
  };

  const isExpired = (coupon: CustomerCoupon) => {
    if (!coupon.expires_at) return false;
    return isBefore(new Date(coupon.expires_at), new Date());
  };

  const handleTabChange = (value: string) => {
    const tab = value as 'available' | 'used' | 'expired';
    setActiveTab(tab);
    setCurrentPage(1); // 탭 변경 시 첫 페이지로
  };

  const getStatusBadge = (coupon: CustomerCoupon) => {
    if (coupon.is_used) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">사용완료</Badge>;
    } else if (isExpired(coupon)) {
      return <Badge variant="destructive">만료됨</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-100 text-green-700">사용가능</Badge>;
    }
  };

  const CouponCard = ({ coupon }: { coupon: CustomerCoupon }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg text-gray-900 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-purple-600" />
                시간 쿠폰
              </h3>
              {getStatusBadge(coupon)}
            </div>
            <p className="text-gray-600 text-sm mb-3">
              예약 시 할인 시간으로 사용할 수 있는 쿠폰입니다
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                발급: {coupon.created_at ? format(parseISO(coupon.created_at), 'yyyy.MM.dd', { locale: ko }) : '날짜 없음'}
              </span>
              {coupon.expires_at && (
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  만료: {format(parseISO(coupon.expires_at), 'yyyy.MM.dd', { locale: ko })}
                </span>
              )}
            </div>
            {coupon.is_used && coupon.used_at && (
              <p className="text-xs text-gray-500">
                사용일: {format(parseISO(coupon.used_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
              </p>
            )}
          </div>
          <div className="text-right ml-6">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {formatTimeDisplay(coupon.minutes)}
            </div>
            <p className="text-xs text-gray-500">
              할인 시간
            </p>
            <p className="text-xs text-gray-600 mt-1">
              ≈ {Math.floor((coupon.minutes / 60) * 30000).toLocaleString()}원 상당
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center items-center space-x-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          이전
        </Button>
        
        <div className="flex space-x-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className="w-8 h-8"
            >
              {page}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          다음
        </Button>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* 헤더 섹션 - 간소화 */}
      <div className="flex items-center mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">시간 쿠폰</h1>
      </div>

      {/* 쿠폰 탭 섹션 */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>사용가능</span>
          </TabsTrigger>
          <TabsTrigger value="used" className="flex items-center space-x-2">
            <Gift className="h-4 w-4" />
            <span>사용완료</span>
          </TabsTrigger>
          <TabsTrigger value="expired" className="flex items-center space-x-2">
            <XCircle className="h-4 w-4" />
            <span>만료됨</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {coupons.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Ticket className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {activeTab === 'available' && '사용 가능한 시간 쿠폰이 없습니다'}
                  {activeTab === 'used' && '사용한 시간 쿠폰이 없습니다'}
                  {activeTab === 'expired' && '만료된 시간 쿠폰이 없습니다'}
                </h3>
                <p className="text-gray-500">
                  {activeTab === 'available' && '서비스 이용 후 리뷰를 작성하면 시간 쿠폰을 받을 수 있습니다'}
                  {activeTab === 'used' && '예약 시 시간 쿠폰을 사용하여 할인 혜택을 받아보세요'}
                  {activeTab === 'expired' && '보유한 쿠폰의 유효기간을 확인하세요'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {coupons.map(coupon => (
                  <CouponCard key={coupon.id} coupon={coupon} />
                ))}
              </div>
              <Pagination />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 