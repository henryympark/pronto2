"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Plus, Minus, Calendar, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { formatTimeDisplay } from "@/lib/date-utils";

interface RewardHistory {
  id: string;
  customer_id: string;
  reward_type: 'review_bonus' | 'admin_grant' | 'event_participation' | 'referral_bonus' | 'usage_deduction';
  reward_minutes: number;
  description: string;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
  created_by: string | null;
}

const ITEMS_PER_PAGE = 10;

export default function RewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<RewardHistory[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchRewards();
    }
  }, [user, authLoading, router, currentPage]);

  const fetchRewards = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      console.log('🔍 Fetching rewards for user:', user.id);
      
      // 전체 개수 조회
      const { count, error: countError } = await supabase
        .from('reward_history')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', user.id);

      console.log('📊 Total count result:', { count, countError });

      if (countError) throw countError;

      const totalCount = count || 0;
      const calculatedTotalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
      setTotalPages(calculatedTotalPages);

      // 페이지별 데이터 조회
      const { data, error } = await supabase
        .from('reward_history')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      console.log('📄 Data query result:', { data, error, dataLength: data?.length });

      if (error) {
        console.error('적립시간 조회 오류:', error);
        toast({
          title: "오류",
          description: "적립시간 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } else {
        const rewardList = (data as RewardHistory[]) || [];
        console.log('✅ Setting rewards:', rewardList);
        setRewards(rewardList);
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
    }
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
        return <Award className="h-4 w-4" />;
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
                {reward.created_at ? format(parseISO(reward.created_at), 'yyyy년 MM월 dd일 HH:mm', { locale: ko }) : '날짜 없음'}
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
        <h1 className="text-2xl font-bold text-gray-900">적립시간</h1>
      </div>

      {/* 적립시간 목록 */}
      {rewards.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              적립시간 내역이 없습니다
            </h3>
            <p className="text-gray-500 mb-6">
              서비스를 이용하고 리뷰를 작성해보세요
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {rewards.map(reward => (
              <RewardCard key={reward.id} reward={reward} />
            ))}
          </div>
          <Pagination />
        </>
      )}
    </div>
  );
} 