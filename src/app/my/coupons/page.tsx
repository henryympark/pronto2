"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ticket, Gift, Clock, CheckCircle, XCircle, Calendar, Plus, RefreshCw, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { formatTimeDisplay } from "@/lib/date-utils";
import Link from "next/link";

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

export default function CouponsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coupons, setCoupons] = useState<CustomerCoupon[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'used' | 'expired'>('available');
  const [stats, setStats] = useState({
    totalCoupons: 0,
    totalMinutes: 0,
    thisMonthCoupons: 0,
    usedCoupons: 0
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchCoupons();
    }
  }, [user, authLoading, router]);

  const fetchCoupons = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const { data, error } = await supabase
        .from('customer_coupons')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('쿠폰 조회 오류:', error);
        toast({
          title: "오류",
          description: "쿠폰 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } else {
        const couponList = (data as CustomerCoupon[]) || [];
        setCoupons(couponList);
        
        // 통계 계산
        const totalCoupons = couponList.length;
        const totalMinutes = couponList
          .filter(c => !c.is_used && !isExpired(c))
          .reduce((sum, c) => sum + c.minutes, 0);
        
        const thisMonth = new Date();
        thisMonth.setDate(1);
        const thisMonthCoupons = couponList.filter(c => 
          new Date(c.created_at) >= thisMonth
        ).length;
        
        const usedCoupons = couponList.filter(c => c.is_used).length;
        
        setStats({
          totalCoupons,
          totalMinutes,
          thisMonthCoupons,
          usedCoupons
        });

        if (showRefreshing) {
          toast({
            title: "새로고침 완료",
            description: "쿠폰 정보가 업데이트되었습니다.",
          });
        }
      }
      
    } catch (error) {
      console.error('쿠폰 데이터 조회 실패:', error);
      toast({
        title: "오류",
        description: "데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await fetchCoupons(true);
  };

  const isExpired = (coupon: CustomerCoupon) => {
    if (!coupon.expires_at) return false;
    return isBefore(new Date(coupon.expires_at), new Date());
  };

  const filterCoupons = (status: 'available' | 'used' | 'expired') => {
    return coupons.filter(coupon => {
      switch (status) {
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
                발급: {format(parseISO(coupon.created_at), 'yyyy.MM.dd', { locale: ko })}
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

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const availableCoupons = filterCoupons('available');
  const usedCoupons = filterCoupons('used');
  const expiredCoupons = filterCoupons('expired');

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* 브레드크럼 네비게이션 */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
        <Link href="/my" className="hover:text-blue-600 transition-colors">
          마이페이지
        </Link>
        <span>/</span>
        <span className="text-gray-900">보유쿠폰</span>
      </nav>

      {/* 헤더 섹션 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>뒤로가기</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Ticket className="h-8 w-8 text-purple-600 mr-3" />
              시간 쿠폰 관리
            </h1>
            <p className="text-gray-600 mt-1">
              보유하고 있는 시간 쿠폰을 확인하고 관리하세요
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>새로고침</span>
        </Button>
      </div>

      {/* 쿠폰 요약 카드 */}
      <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center text-purple-800">
            <TrendingUp className="h-5 w-5 mr-2" />
            시간 쿠폰 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-700 mb-2">
                {availableCoupons.length}장
              </div>
              <p className="text-purple-600 text-sm">사용 가능</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-700 mb-2">
                {formatTimeDisplay(stats.totalMinutes)}
              </div>
              <p className="text-purple-600 text-sm">총 보유 시간</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-700 mb-2">
                {stats.usedCoupons}장
              </div>
              <p className="text-gray-600 text-sm">사용 완료</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-700 mb-2">
                {expiredCoupons.length}장
              </div>
              <p className="text-gray-600 text-sm">만료됨</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="text-center">
            <p className="text-sm text-purple-600">
              예상 절약 금액: <span className="font-semibold text-lg text-purple-700">
                {Math.floor((stats.totalMinutes / 60) * 30000).toLocaleString()}원
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 쿠폰 탭 섹션 */}
      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>사용가능 ({availableCoupons.length})</span>
          </TabsTrigger>
          <TabsTrigger value="used" className="flex items-center space-x-2">
            <Gift className="h-4 w-4" />
            <span>사용완료 ({usedCoupons.length})</span>
          </TabsTrigger>
          <TabsTrigger value="expired" className="flex items-center space-x-2">
            <XCircle className="h-4 w-4" />
            <span>만료됨 ({expiredCoupons.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {availableCoupons.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Ticket className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  사용 가능한 시간 쿠폰이 없습니다
                </h3>
                <p className="text-gray-500 mb-6">
                  서비스 이용 후 리뷰를 작성하면 시간 쿠폰을 받을 수 있습니다
                </p>
                <Link href="/">
                  <Button>서비스 둘러보기</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {availableCoupons.map(coupon => (
                <CouponCard key={coupon.id} coupon={coupon} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="used" className="space-y-4">
          {usedCoupons.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  사용한 시간 쿠폰이 없습니다
                </h3>
                <p className="text-gray-500">
                  예약 시 시간 쿠폰을 사용하여 할인 혜택을 받아보세요
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {usedCoupons.map(coupon => (
                <CouponCard key={coupon.id} coupon={coupon} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          {expiredCoupons.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <XCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  만료된 시간 쿠폰이 없습니다
                </h3>
                <p className="text-gray-500">
                  보유한 쿠폰의 유효기간을 확인하세요
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {expiredCoupons.map(coupon => (
                <CouponCard key={coupon.id} coupon={coupon} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 도움말 섹션 */}
      <Card className="mt-8 bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">시간 쿠폰 사용 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">쿠폰 발급</h4>
              <ul className="space-y-1">
                <li>• 첫 예약 시 환영 쿠폰 (30분)</li>
                <li>• 리뷰 작성 후 감사 쿠폰 (30분)</li>
                <li>• 특별 이벤트 참여 쿠폰</li>
                <li>• 관리자 직접 부여</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">사용 방법</h4>
              <ul className="space-y-1">
                <li>• 예약 결제 시 자동 적용</li>
                <li>• 적립시간보다 우선 사용</li>
                <li>• 30분 단위로 사용 가능</li>
                <li>• 한 번에 여러 쿠폰 사용 가능</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 