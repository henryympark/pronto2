"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, MessageSquare, Calendar, MapPin, Clock, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { formatTimeDisplay } from "@/lib/date-utils";

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

interface AvailableReview {
  reservation_id: string;
  service_id: string;
  service_name: string;
  service_location: string;
  completed_at: string;
  customer_id: string;
}

const ITEMS_PER_PAGE = 10;
const REVIEW_REWARD_MINUTES = 10; // 리뷰 1건당 적립되는 분수

export default function ReviewHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewHistory[]>([]);
  const [availableReviews, setAvailableReviews] = useState<AvailableReview[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'written'>('available');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      if (activeTab === 'available') {
        fetchAvailableReviews();
      } else {
        fetchWrittenReviews();
      }
    }
  }, [user, authLoading, router, activeTab, currentPage]);

  const fetchAvailableReviews = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // 완료된 예약 중 리뷰가 작성되지 않은 것들 조회
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          customer_id,
          service_id,
          status,
          updated_at,
          services:service_id (
            name,
            location
          )
        `)
        .eq('customer_id', user.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // 이미 리뷰가 작성된 예약들 조회
      const { data: existingReviews, error: reviewError } = await supabase
        .from('reviews')
        .select('reservation_id')
        .eq('customer_id', user.id)
        .is('deleted_at', null);

      if (reviewError) throw reviewError;

      const reviewedReservationIds = new Set(
        existingReviews?.map(review => review.reservation_id) || []
      );

      // 리뷰가 작성되지 않은 완료된 예약들 필터링
      const availableReviewsData = (data as any[])?.filter(reservation => 
        !reviewedReservationIds.has(reservation.id) &&
        reservation.status === 'completed'
      ).map(item => ({
        reservation_id: item.id,
        service_id: item.service_id,
        service_name: item.services?.name || '서비스 정보 없음',
        service_location: item.services?.location || '위치 정보 없음',
        completed_at: item.updated_at,
        customer_id: item.customer_id
      })) as AvailableReview[] || [];

      // 페이지네이션 적용
      const totalCount = availableReviewsData.length;
      const calculatedTotalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
      setTotalPages(calculatedTotalPages);

      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedData = availableReviewsData.slice(startIndex, endIndex);
      
      setAvailableReviews(paginatedData);
      
    } catch (error) {
      console.error('작성 가능한 리뷰 조회 실패:', error);
      toast({
        title: "오류",
        description: "데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWrittenReviews = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // 전체 개수 조회
      const { count, error: countError } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', user.id)
        .is('deleted_at', null);

      if (countError) throw countError;

      const totalCount = count || 0;
      const calculatedTotalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
      setTotalPages(calculatedTotalPages);

      // 페이지별 데이터 조회
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
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

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
    }
  };

  const handleTabChange = (value: string) => {
    const tab = value as 'available' | 'written';
    setActiveTab(tab);
    setCurrentPage(1); // 탭 변경 시 첫 페이지로
  };

  const getEarnableMinutes = () => {
    if (activeTab === 'available') {
      return availableReviews.length * REVIEW_REWARD_MINUTES;
    }
    return 0;
  };

  const getRewardMessage = () => {
    const earnableMinutes = getEarnableMinutes();
    if (activeTab === 'available') {
      if (earnableMinutes > 0) {
        return `리뷰 작성하고 ${formatTimeDisplay(earnableMinutes)}의 혜택을 받아가세요`;
      } else {
        return '현재 작성 가능한 리뷰가 없습니다';
      }
    } else {
      return '작성해주신 리뷰로 적립시간을 받으셨습니다';
    }
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

  const AvailableReviewCard = ({ availableReview }: { availableReview: AvailableReview }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg text-gray-900 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                {availableReview.service_name}
              </h3>
              <Badge className="bg-blue-100 text-blue-700">
                작성 가능
              </Badge>
            </div>
            <div className="flex items-center mb-3">
              <MapPin className="h-4 w-4 mr-1 text-gray-500" />
              <p className="text-sm text-gray-600">{availableReview.service_location}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                완료일: {availableReview.completed_at ? 
                  format(parseISO(availableReview.completed_at), 'yyyy.MM.dd', { locale: ko }) : 
                  '날짜 없음'}
              </span>
              <div className="flex items-center text-green-600">
                <Gift className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">+{formatTimeDisplay(REVIEW_REWARD_MINUTES)} 적립 가능</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
                {review.created_at ? format(parseISO(review.created_at), 'yyyy.MM.dd HH:mm', { locale: ko }) : '날짜 없음'}
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
            작성일: {review.created_at ? format(parseISO(review.created_at), 'yyyy년 MM월 dd일', { locale: ko }) : '날짜 없음'}
          </span>
          {review.updated_at && review.updated_at !== review.created_at && (
            <span>
              수정일: {format(parseISO(review.updated_at), 'yyyy.MM.dd', { locale: ko })}
            </span>
          )}
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
        <h1 className="text-2xl font-bold text-gray-900">내 리뷰</h1>
      </div>

      {/* 리뷰 탭 섹션 */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>작성 가능한 리뷰</span>
          </TabsTrigger>
          <TabsTrigger value="written" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>내가 작성한 리뷰</span>
          </TabsTrigger>
        </TabsList>

        {/* 적립 메시지 영역 */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-center">
              <Gift className="h-5 w-5 mr-2 text-green-600" />
              <p className="text-green-700 font-medium">
                {getRewardMessage()}
              </p>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="available" className="space-y-4">
          {availableReviews.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  작성 가능한 리뷰가 없습니다
                </h3>
                <p className="text-gray-500">
                  서비스 이용 완료 후 리뷰 작성이 가능합니다
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {availableReviews.map(availableReview => (
                  <AvailableReviewCard key={availableReview.reservation_id} availableReview={availableReview} />
                ))}
              </div>
              <Pagination />
            </>
          )}
        </TabsContent>

        <TabsContent value="written" className="space-y-4">
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  작성한 리뷰가 없습니다
                </h3>
                <p className="text-gray-500">
                  서비스 이용 후 리뷰를 작성해보세요
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {reviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
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