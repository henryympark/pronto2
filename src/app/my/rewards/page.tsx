"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Plus, Minus, TrendingUp, RefreshCw, Calendar, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { formatTimeDisplay } from "@/lib/date-utils";
import Link from "next/link";

interface RewardHistory {
  id: string;
  customer_id: string;
  reward_type: 'review_bonus' | 'admin_grant' | 'event_participation' | 'referral_bonus' | 'usage_deduction';
  reward_minutes: number;
  description: string;
  reference_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function RewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rewards, setRewards] = useState<RewardHistory[]>([]);
  const [filteredRewards, setFilteredRewards] = useState<RewardHistory[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'review_bonus' | 'admin_grant' | 'event_participation' | 'referral_bonus' | 'usage_deduction'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'amount_high' | 'amount_low'>('latest');
  const [stats, setStats] = useState({
    totalRewards: 0,
    totalMinutes: 0,
    thisMonthRewards: 0,
    averageReward: 0,
    typeDistribution: {
      review_bonus: 0,
      admin_grant: 0,
      event_participation: 0,
      referral_bonus: 0,
      usage_deduction: 0
    }
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchRewards();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [rewards, typeFilter, sortBy]);

  const fetchRewards = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const { data, error } = await supabase
        .from('reward_history')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('적립시간 조회 오류:', error);
        toast({
          title: "오류",
          description: "적립시간 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } else {
        const rewardList = (data as RewardHistory[]) || [];
        setRewards(rewardList);
        
        // 통계 계산
        const totalRewards = rewardList.length;
        const totalMinutes = rewardList.reduce((sum, r) => sum + r.reward_minutes, 0);
        const averageReward = totalRewards > 0 ? totalMinutes / totalRewards : 0;
        
        const thisMonth = new Date();
        thisMonth.setDate(1);
        const thisMonthRewards = rewardList.filter(r => 
          new Date(r.created_at) >= thisMonth
        ).length;
        
        // 타입별 분포 계산
        const typeDistribution = {
          review_bonus: 0,
          admin_grant: 0,
          event_participation: 0,
          referral_bonus: 0,
          usage_deduction: 0
        };
        
        rewardList.forEach(r => {
          if (typeDistribution.hasOwnProperty(r.reward_type)) {
            typeDistribution[r.reward_type]++;
          }
        });
        
        setStats({
          totalRewards,
          totalMinutes,
          thisMonthRewards,
          averageReward,
          typeDistribution
        });

        if (showRefreshing) {
          toast({
            title: "새로고침 완료",
            description: "적립시간 정보가 업데이트되었습니다.",
          });
        }
      }
      
    } catch (error) {
      console.error('적립시간 데이터 조회 실패:', error);
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
    await fetchRewards(true);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...rewards];
    
    // 타입 필터 적용
    if (typeFilter !== 'all') {
      filtered = filtered.filter(reward => reward.reward_type === typeFilter);
    }
    
    // 정렬 적용
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount_high':
          return b.reward_minutes - a.reward_minutes;
        case 'amount_low':
          return a.reward_minutes - b.reward_minutes;
        default:
          return 0;
      }
    });
    
    setFilteredRewards(filtered);
  };

  const getRewardTypeLabel = (type: string) => {
    const labels = {
      review_bonus: '리뷰 작성',
      admin_grant: '관리자 부여',
      event_participation: '이벤트 참여',
      referral_bonus: '추천인 보상',
      usage_deduction: '사용 차감'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getRewardTypeColor = (type: string) => {
    const colors = {
      review_bonus: 'bg-green-100 text-green-700',
      admin_grant: 'bg-blue-100 text-blue-700',
      event_participation: 'bg-purple-100 text-purple-700',
      referral_bonus: 'bg-orange-100 text-orange-700',
      usage_deduction: 'bg-red-100 text-red-700'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'review_bonus':
        return <Award className="h-4 w-4" />;
      case 'admin_grant':
        return <Plus className="h-4 w-4" />;
      case 'event_participation':
        return <Calendar className="h-4 w-4" />;
      case 'referral_bonus':
        return <TrendingUp className="h-4 w-4" />;
      case 'usage_deduction':
        return <Minus className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const RewardCard = ({ reward }: { reward: RewardHistory }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Badge className={getRewardTypeColor(reward.reward_type)}>
                  <div className="flex items-center space-x-1">
                    {getRewardIcon(reward.reward_type)}
                    <span>{getRewardTypeLabel(reward.reward_type)}</span>
                  </div>
                </Badge>
              </div>
              <div className={`text-2xl font-bold ${reward.reward_minutes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {reward.reward_minutes >= 0 ? '+' : ''}{formatTimeDisplay(Math.abs(reward.reward_minutes))}
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed mb-3">
              {reward.description}
            </p>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {format(parseISO(reward.created_at), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
              </span>
              {reward.reference_id && (
                <span>
                  참조 ID: {reward.reference_id.slice(0, 8)}...
                </span>
              )}
            </div>
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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* 브레드크럼 네비게이션 */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
        <Link href="/my" className="hover:text-blue-600 transition-colors">
          마이페이지
        </Link>
        <span>/</span>
        <span className="text-gray-900">적립시간</span>
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
              <Clock className="h-8 w-8 text-blue-600 mr-3" />
              적립시간 히스토리
            </h1>
            <p className="text-gray-600 mt-1">
              적립시간 사용 내역을 확인하고 관리하세요
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

      {/* 적립시간 통계 카드 */}
      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <TrendingUp className="h-5 w-5 mr-2" />
            적립시간 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-700 mb-2">
                {stats.totalRewards}건
              </div>
              <p className="text-blue-600 text-sm">총 적립 건수</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700 mb-2">
                {formatTimeDisplay(stats.totalMinutes)}
              </div>
              <p className="text-blue-600 text-sm">총 적립시간</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-700 mb-2">
                {stats.thisMonthRewards}건
              </div>
              <p className="text-gray-600 text-sm">이번 달</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-700 mb-2">
                {formatTimeDisplay(Math.round(stats.averageReward))}
              </div>
              <p className="text-gray-600 text-sm">평균 적립</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            {Object.entries(stats.typeDistribution).map(([type, count]) => (
              <div key={type} className="text-center">
                <div className="text-sm font-medium text-gray-800 mb-1">
                  {getRewardTypeLabel(type)}
                </div>
                <div className="text-lg font-semibold text-blue-600">
                  {count}건
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 필터 및 정렬 섹션 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">타입 필터:</span>
                <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="review_bonus">리뷰 작성</SelectItem>
                    <SelectItem value="admin_grant">관리자 부여</SelectItem>
                    <SelectItem value="event_participation">이벤트 참여</SelectItem>
                    <SelectItem value="referral_bonus">추천인 보상</SelectItem>
                    <SelectItem value="usage_deduction">사용 차감</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">정렬:</span>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">최신순</SelectItem>
                    <SelectItem value="oldest">오래된순</SelectItem>
                    <SelectItem value="amount_high">시간 많은순</SelectItem>
                    <SelectItem value="amount_low">시간 적은순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-600">
                총 {filteredRewards.length}건
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 적립시간 목록 */}
      {filteredRewards.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {typeFilter === 'all' ? '적립시간 내역이 없습니다' : `${getRewardTypeLabel(typeFilter)} 내역이 없습니다`}
            </h3>
            <p className="text-gray-500 mb-6">
              서비스를 이용하고 리뷰를 작성해보세요
            </p>
            <Link href="/">
              <Button>서비스 둘러보기</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRewards.map(reward => (
            <RewardCard key={reward.id} reward={reward} />
          ))}
        </div>
      )}

      {/* 도움말 섹션 */}
      <Card className="mt-8 bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">적립시간 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">적립 방법</h4>
              <ul className="space-y-1">
                <li>• 리뷰 작성 시 30분 적립</li>
                <li>• 이벤트 참여 시 추가 적립</li>
                <li>• 추천인 활동 시 보너스</li>
                <li>• 관리자 직접 부여</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">사용 방법</h4>
              <ul className="space-y-1">
                <li>• 예약 시 자동 차감 우선 적용</li>
                <li>• 30분 단위로 사용</li>
                <li>• 만료 기한 없음</li>
                <li>• 타인에게 양도 불가</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 