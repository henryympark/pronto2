"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Star, Eye, EyeOff, Trash2, MessageSquare, FileText } from "lucide-react";
import Image from "next/image";
import { useSupabase } from "@/contexts/SupabaseContext";
import { AdminPageHeader } from "@/components/admin/common/AdminPageHeader";
import { AdminLoadingState } from "@/components/admin/common/AdminLoadingState";
import { AdminStatsGrid } from "@/components/admin/stats/AdminStatsGrid";
import { AdminStatsCard } from "@/components/admin/stats/AdminStatsCard";
import { AdminTable, AdminTableColumn } from "@/components/admin/tables/AdminTable";
import { useAdminFilters } from "@/hooks/admin/useAdminFilters";
import { useAdminToast } from "@/hooks/admin/useAdminToast";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreVertical } from "lucide-react";

interface ReviewWithDetails {
  id: string;
  customer_id: string;
  rating: number;
  content: string;
  is_hidden: boolean;
  created_at: string;
  deleted_at: string | null;
  customer: { nickname: string; email: string };
  service: { name: string };
  images: { id: string; image_url: string }[];
}

export default function AdminReviewsPage() {
  const supabase = useSupabase();
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewWithDetails | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { showSuccess, showError } = useAdminToast();

  // 필터링 설정
  const filterState = useAdminFilters({
    data: reviews,
    searchFields: ['content'],
    filterFunctions: {
      status: (review, status) => {
        if (status === 'visible') return !review.is_hidden && !review.deleted_at;
        if (status === 'hidden') return review.is_hidden && !review.deleted_at;
        if (status === 'deleted') return !!review.deleted_at;
        return true;
      }
    }
  });

  // 추가 필터링 (고객명, 서비스명)
  const filteredReviews = filterState.data.filter(review => {
    const searchTerm = (filterState.filters.search || '').toLowerCase();
    if (!searchTerm) return true;
    return (
      review.content.toLowerCase().includes(searchTerm) ||
      review.customer.nickname.toLowerCase().includes(searchTerm) ||
      review.service.name.toLowerCase().includes(searchTerm)
    );
  });

  // 데이터 로드
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select(`*, service:services(name), images:review_images(id, image_url)`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: customersData } = await supabase
        .from("customers")
        .select("id, nickname, email");

      const reviewsWithCustomers = (reviewsData || []).map(review => ({
        ...review,
        customer: customersData?.find(c => c.id === review.customer_id) || 
                 { nickname: "알 수 없는 사용자", email: "" }
      }));

      setReviews(reviewsWithCustomers);
    } catch (error) {
      showError("리뷰 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 리뷰 액션 처리
  const handleToggleVisibility = async (review: ReviewWithDetails) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ is_hidden: !review.is_hidden })
        .eq("id", review.id);

      if (error) throw error;
      showSuccess(`리뷰가 ${!review.is_hidden ? "숨김" : "표시"} 처리되었습니다.`);
      fetchReviews();
    } catch {
      showError("리뷰 상태 변경에 실패했습니다.");
    }
  };

  const handleDeleteReview = async (review: ReviewWithDetails) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", review.id);

      if (error) throw error;
      showSuccess("리뷰가 삭제되었습니다.");
      setShowDeleteDialog(false);
      fetchReviews();
    } catch {
      showError("리뷰 삭제에 실패했습니다.");
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // 테이블 컬럼 정의
  const columns: AdminTableColumn<ReviewWithDetails>[] = [
    {
      key: 'customer',
      title: '고객',
      render: (_, review) => (
        <div>
          <div className="font-medium">{review.customer.nickname}</div>
          <div className="text-sm text-gray-500">{review.customer.email}</div>
        </div>
      )
    },
    {
      key: 'service',
      title: '서비스',
      render: (_, review) => review.service.name
    },
    {
      key: 'rating',
      title: '별점',
      render: (_, review) => (
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className={`h-4 w-4 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
          ))}
          <span className="ml-1 text-sm">({review.rating})</span>
        </div>
      )
    },
    {
      key: 'content',
      title: '내용',
      render: (_, review) => (
        <div className="max-w-xs">
          <p className="truncate">{review.content}</p>
          {review.images?.length > 0 && (
            <div className="flex mt-2 space-x-1">
              {review.images.slice(0, 3).map((image, index) => (
                <div key={image.id} className="relative w-8 h-8">
                  <Image src={image.image_url} alt={`리뷰 이미지 ${index + 1}`} fill className="object-cover rounded" />
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
      )
    },
    {
      key: 'status',
      title: '상태',
      render: (_, review) => 
        review.deleted_at ? "삭제됨" : review.is_hidden ? "숨김" : "표시"
    },
    {
      key: 'created_at',
      title: '작성일',
      render: (_, review) => format(new Date(review.created_at), "yyyy.MM.dd HH:mm", { locale: ko })
    },
    {
      key: 'actions',
      title: '관리',
      render: (_, review) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!review.deleted_at && (
              <>
                <DropdownMenuItem onClick={() => handleToggleVisibility(review)}>
                  {review.is_hidden ? <><Eye className="mr-2 h-4 w-4" />표시하기</> : <><EyeOff className="mr-2 h-4 w-4" />숨기기</>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedReview(review); setShowDeleteDialog(true); }} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />삭제하기
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  if (loading) return <AdminLoadingState type="table" message="리뷰 목록을 불러오는 중..." />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="리뷰 관리"
        description="고객 리뷰를 관리하고 모니터링할 수 있습니다."
      />

      <AdminStatsGrid columns={4}>
        <AdminStatsCard
          title="전체 리뷰"
          value={reviews.filter(r => !r.deleted_at).length}
          icon={<MessageSquare className="h-5 w-5" />}
          description="활성 리뷰 수"
        />
        <AdminStatsCard
          title="표시 중"
          value={reviews.filter(r => !r.is_hidden && !r.deleted_at).length}
          icon={<Eye className="h-5 w-5" />}
          description="공개된 리뷰"
        />
        <AdminStatsCard
          title="숨김"
          value={reviews.filter(r => r.is_hidden && !r.deleted_at).length}
          icon={<EyeOff className="h-5 w-5" />}
          description="숨겨진 리뷰"
        />
        <AdminStatsCard
          title="삭제됨"
          value={reviews.filter(r => r.deleted_at).length}
          icon={<Trash2 className="h-5 w-5" />}
          description="삭제된 리뷰"
        />
      </AdminStatsGrid>

      <AdminTable
        columns={columns}
        data={filteredReviews}
        empty={{
          title: "조건에 맞는 리뷰가 없습니다",
          description: "다른 검색 조건을 시도해보세요"
        }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>리뷰 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 리뷰를 삭제하시겠습니까? 삭제된 리뷰는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedReview && handleDeleteReview(selectedReview)} className="bg-red-600">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 