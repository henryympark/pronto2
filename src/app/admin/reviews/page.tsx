"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Star, Eye, EyeOff, Trash2, Search, Filter, MoreVertical } from "lucide-react";
import Image from "next/image";
import { useSupabase } from "@/contexts/SupabaseContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReviewWithDetails {
  id: string;
  customer_id: string;
  service_id: string;
  reservation_id: string;
  rating: number;
  content: string;
  is_hidden: boolean;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  customer: {
    id: string;
    nickname: string;
    email: string;
  };
  service: {
    id: string;
    name: string;
  };
  images: {
    id: string;
    image_url: string;
  }[];
}

type FilterStatus = "all" | "visible" | "hidden" | "deleted";

export default function AdminReviewsPage() {
  const supabase = useSupabase();
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedReview, setSelectedReview] = useState<ReviewWithDetails | null>(null);
  const [actionType, setActionType] = useState<"hide" | "show" | "delete" | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 리뷰 목록 조회
  const fetchReviews = async () => {
    try {
      setLoading(true);
      
      // 먼저 리뷰와 서비스, 이미지 조회 (customer는 수동 조인)
      let query = supabase
        .from("reviews")
        .select(`
          *,
          service:services(id, name),
          images:review_images(id, image_url)
        `)
        .order("created_at", { ascending: false });

      // 필터 적용
      if (filterStatus === "visible") {
        query = query.eq("is_hidden", false).is("deleted_at", null);
      } else if (filterStatus === "hidden") {
        query = query.eq("is_hidden", true).is("deleted_at", null);
      } else if (filterStatus === "deleted") {
        query = query.not("deleted_at", "is", null);
      }

      const { data: reviewsData, error } = await query;

      if (error) {
        console.error("리뷰 조회 오류:", error);
        toast({
          title: "오류",
          description: "리뷰 목록을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
        return;
      }

      // 고객 정보 별도 조회
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("id, nickname, email");

      if (customersError) {
        console.error("고객 조회 오류:", customersError);
        toast({
          title: "오류",
          description: "고객 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
        return;
      }

      // 수동으로 고객 정보 조인
      const reviewsWithCustomers = (reviewsData || []).map(review => {
        const customer = (customersData || []).find(c => c.id === review.customer_id);
        return {
          ...review,
          customer: customer ? {
            id: customer.id,
            nickname: customer.nickname,
            email: customer.email
          } : {
            id: review.customer_id,
            nickname: "알 수 없는 사용자",
            email: ""
          }
        };
      });

      setReviews(reviewsWithCustomers);
    } catch (error) {
      console.error("리뷰 조회 오류:", error);
      toast({
        title: "오류",
        description: "리뷰 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 리뷰 숨김/표시 처리
  const handleToggleVisibility = async (review: ReviewWithDetails) => {
    try {
      const newHiddenStatus = !review.is_hidden;
      
      const { error } = await supabase
        .from("reviews")
        .update({ 
          is_hidden: newHiddenStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", review.id);

      if (error) {
        console.error("리뷰 상태 변경 오류:", error);
        toast({
          title: "오류",
          description: "리뷰 상태 변경에 실패했습니다.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "성공",
        description: `리뷰가 ${newHiddenStatus ? "숨김" : "표시"} 처리되었습니다.`,
      });

      // 목록 새로고침
      fetchReviews();
    } catch (error) {
      console.error("리뷰 상태 변경 오류:", error);
      toast({
        title: "오류",
        description: "리뷰 상태 변경에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 리뷰 삭제 처리 (soft delete)
  const handleDeleteReview = async (review: ReviewWithDetails) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", review.id);

      if (error) {
        console.error("리뷰 삭제 오류:", error);
        toast({
          title: "오류",
          description: "리뷰 삭제에 실패했습니다.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "성공",
        description: "리뷰가 삭제되었습니다.",
      });

      // 목록 새로고침
      fetchReviews();
      setShowDeleteDialog(false);
      setSelectedReview(null);
    } catch (error) {
      console.error("리뷰 삭제 오류:", error);
      toast({
        title: "오류",
        description: "리뷰 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 검색 필터링
  const filteredReviews = reviews.filter((review) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      review.content.toLowerCase().includes(searchLower) ||
      review.customer.nickname.toLowerCase().includes(searchLower) ||
      review.service.name.toLowerCase().includes(searchLower)
    );
  });

  // 리뷰 상태 표시
  const getStatusBadge = (review: ReviewWithDetails) => {
    if (review.deleted_at) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">삭제됨</Badge>;
    }
    if (review.is_hidden) {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">숨김</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 border-green-200">표시</Badge>;
  };

  // 별점 표시
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  // 컴포넌트 마운트 시 즉시 데이터 로딩
  useEffect(() => {
    fetchReviews();
  }, [filterStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">리뷰 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">리뷰 관리</h1>
          <p className="text-gray-600">고객 리뷰를 관리하고 모니터링할 수 있습니다.</p>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="리뷰 내용, 고객명, 서비스명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="상태 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="visible">표시</SelectItem>
                  <SelectItem value="hidden">숨김</SelectItem>
                  <SelectItem value="deleted">삭제됨</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{reviews.filter(r => !r.deleted_at).length}</div>
            <p className="text-xs text-muted-foreground">전체 리뷰</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{reviews.filter(r => !r.is_hidden && !r.deleted_at).length}</div>
            <p className="text-xs text-muted-foreground">표시 중</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{reviews.filter(r => r.is_hidden && !r.deleted_at).length}</div>
            <p className="text-xs text-muted-foreground">숨김</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{reviews.filter(r => r.deleted_at).length}</div>
            <p className="text-xs text-muted-foreground">삭제됨</p>
          </CardContent>
        </Card>
      </div>

      {/* 리뷰 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>리뷰 목록 ({filteredReviews.length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReviews.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">조건에 맞는 리뷰가 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>고객</TableHead>
                    <TableHead>서비스</TableHead>
                    <TableHead>별점</TableHead>
                    <TableHead>리뷰 내용</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작성일</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{review.customer.nickname}</div>
                          <div className="text-sm text-gray-500">{review.customer.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{review.service.name}</div>
                      </TableCell>
                      <TableCell>
                        {renderStars(review.rating)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="truncate">{review.content}</p>
                          {review.images && review.images.length > 0 && (
                            <div className="flex mt-2 space-x-1">
                              {review.images.slice(0, 3).map((image, index) => (
                                <div key={image.id} className="relative w-8 h-8">
                                  <Image
                                    src={image.image_url}
                                    alt={`리뷰 이미지 ${index + 1}`}
                                    fill
                                    className="object-cover rounded"
                                  />
                                </div>
                              ))}
                              {review.images.length > 3 && (
                                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-xs">
                                  +{review.images.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(review)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(review.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button className="h-8 w-8 p-0 hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!review.deleted_at && (
                              <DropdownMenuItem
                                onClick={() => handleToggleVisibility(review)}
                              >
                                {review.is_hidden ? (
                                  <>
                                    <Eye className="mr-2 h-4 w-4" />
                                    표시하기
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="mr-2 h-4 w-4" />
                                    숨기기
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            {!review.deleted_at && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedReview(review);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제하기
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>리뷰 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 리뷰를 삭제하시겠습니까? 삭제된 리뷰는 복구할 수 없습니다.
              <br />
              <br />
              <strong>고객:</strong> {selectedReview?.customer.nickname}
              <br />
              <strong>서비스:</strong> {selectedReview?.service.name}
              <br />
              <strong>내용:</strong> {selectedReview?.content.substring(0, 100)}
              {selectedReview && selectedReview.content.length > 100 && "..."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedReview && handleDeleteReview(selectedReview)}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 