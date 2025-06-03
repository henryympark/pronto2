"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, MessageSquare, Calendar, TrendingUp, Edit, MapPin, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";

interface ReviewHistory {
  id: string;
  customer_id: string;
  service_id: string;
  reservation_id: string;
  rating: number;
  content: string;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  service_name: string;
  service_location: string;
}

export default function ReviewHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<ReviewHistory[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<ReviewHistory[]>([]);
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'rating_high' | 'rating_low'>('latest');
  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    thisMonthReviews: 0,
    ratingDistribution: [0, 0, 0, 0, 0] // 1~5점 분포
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchReviews();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [reviews, sortBy, ratingFilter]);

  const fetchReviews = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          customer_id,
          service_id,
          reservation_id,
          rating,
          content,
          is_hidden,
          created_at,
          updated_at,
          services:service_id (
            name,
            location
          )
        `)
        .eq('customer_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('리뷰 조회 오류:', error);
        toast({
          title: "오류",
          description: "리뷰 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } else {
        // 데이터 변환
        const reviewList = (data as any[])?.map(item => ({
          ...item,
          service_name: item.services?.name || '서비스 정보 없음',
          service_location: item.services?.location || '위치 정보 없음'
        })) as ReviewHistory[] || [];
        
        setReviews(reviewList);
        
        // 통계 계산
        const totalReviews = reviewList.length;
        const averageRating = totalReviews > 0 
          ? reviewList.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
          : 0;
        
        const thisMonth = new Date();
        thisMonth.setDate(1);
        const thisMonthReviews = reviewList.filter(r => 
          new Date(r.created_at) >= thisMonth
        ).length;
        
        // 별점 분포 계산
        const ratingDistribution = [0, 0, 0, 0, 0];
        reviewList.forEach(r => {
          if (r.rating >= 1 && r.rating <= 5) {
            ratingDistribution[r.rating - 1]++;
          }
        });
        
        setStats({
          totalReviews,
          averageRating,
          thisMonthReviews,
          ratingDistribution
        });

        if (showRefreshing) {
          toast({
            title: "새로고침 완료",
            description: "리뷰 정보가 업데이트되었습니다.",
          });
        }
      }
      
    } catch (error) {
      console.error('리뷰 데이터 조회 실패:', error);
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
    await fetchReviews(true);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...reviews];
    
    // 별점 필터 적용
    if (ratingFilter !== 'all') {
      const targetRating = parseInt(ratingFilter);
      filtered = filtered.filter(review => review.rating === targetRating);
    }
    
    // 정렬 적용
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'rating_high':
          return b.rating - a.rating;
        case 'rating_low':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });
    
    setFilteredReviews(filtered);
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getRatingBadgeColor = (rating: number) => {
    if (rating >= 5) return "bg-green-100 text-green-700";
    if (rating >= 4) return "bg-blue-100 text-blue-700";
    if (rating >= 3) return "bg-yellow-100 text-yellow-700";
    if (rating >= 2) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  };

  const ReviewCard = ({ review }: { review: ReviewHistory }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg text-gray-900 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
                {review.service_name}
              </h3>
              <Badge className={getRatingBadgeColor(review.rating)}>
                {review.rating}점
              </Badge>
            </div>
            <div className="flex items-center mb-2">
              <MapPin className="h-4 w-4 mr-1 text-gray-500" />
              <p className="text-sm text-gray-600">{review.service_location}</p>
            </div>
            <div className="flex items-center mb-3">
              {getRatingStars(review.rating)}
              <span className="ml-2 text-sm text-gray-600">
                {format(parseISO(review.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
              </span>
            </div>
            <p className="text-gray-700 leading-relaxed">
              {review.content}
            </p>
            {review.is_hidden && (
              <Badge variant="secondary" className="mt-2">
                비공개 리뷰
              </Badge>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>
            작성일: {format(parseISO(review.created_at), 'yyyy년 MM월 dd일', { locale: ko })}
          </span>
          {review.updated_at !== review.created_at && (
            <span>
              수정일: {format(parseISO(review.updated_at), 'yyyy.MM.dd', { locale: ko })}
            </span>
          )}
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
        <span className="text-gray-900">리뷰 히스토리</span>
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
              <Star className="h-8 w-8 text-green-600 mr-3" />
              내 리뷰 히스토리
            </h1>
            <p className="text-gray-600 mt-1">
              작성한 리뷰들을 확인하고 관리하세요
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

      {/* 리뷰 통계 카드 */}
      <Card className="mb-8 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800">
            <TrendingUp className="h-5 w-5 mr-2" />
            리뷰 작성 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-700 mb-2">
                {stats.totalReviews}건
              </div>
              <p className="text-green-600 text-sm">총 작성 리뷰</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700 mb-2 flex items-center justify-center">
                {stats.averageRating.toFixed(1)}
                <Star className="h-5 w-5 ml-1 text-yellow-400 fill-current" />
              </div>
              <p className="text-green-600 text-sm">평균 별점</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-700 mb-2">
                {stats.thisMonthReviews}건
              </div>
              <p className="text-gray-600 text-sm">이번 달</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-700 mb-2">
                {stats.ratingDistribution.filter(count => count > 0).length}개
              </div>
              <p className="text-gray-600 text-sm">이용 서비스</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-center space-x-6">
            {[5, 4, 3, 2, 1].map(rating => (
              <div key={rating} className="text-center">
                <div className="flex items-center mb-1">
                  <span className="text-sm font-medium mr-1">{rating}</span>
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                </div>
                <div className="text-sm text-gray-600">
                  {stats.ratingDistribution[rating - 1]}건
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
                <span className="text-sm font-medium text-gray-700">별점 필터:</span>
                <Select value={ratingFilter} onValueChange={(value: any) => setRatingFilter(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="5">5점</SelectItem>
                    <SelectItem value="4">4점</SelectItem>
                    <SelectItem value="3">3점</SelectItem>
                    <SelectItem value="2">2점</SelectItem>
                    <SelectItem value="1">1점</SelectItem>
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
                    <SelectItem value="rating_high">별점 높은순</SelectItem>
                    <SelectItem value="rating_low">별점 낮은순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-600">
                총 {filteredReviews.length}건
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 리뷰 목록 */}
      {filteredReviews.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {ratingFilter === 'all' ? '작성한 리뷰가 없습니다' : `${ratingFilter}점 리뷰가 없습니다`}
            </h3>
            <p className="text-gray-500 mb-6">
              서비스 이용 후 리뷰를 작성해보세요
            </p>
            <Link href="/">
              <Button>서비스 둘러보기</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {/* 도움말 섹션 */}
      <Card className="mt-8 bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">리뷰 관리 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">리뷰 혜택</h4>
              <ul className="space-y-1">
                <li>• 리뷰 작성 시 적립시간 30분 지급</li>
                <li>• 포토 리뷰 작성 시 추가 혜택</li>
                <li>• 우수 리뷰 선정 시 쿠폰 지급</li>
                <li>• 지속적인 리뷰 작성 시 VIP 혜택</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">리뷰 정책</h4>
              <ul className="space-y-1">
                <li>• 작성 후 24시간 내 수정 가능</li>
                <li>• 부적절한 내용 포함 시 비공개 처리</li>
                <li>• 허위 리뷰 작성 시 계정 제재</li>
                <li>• 서비스 이용 후에만 작성 가능</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 