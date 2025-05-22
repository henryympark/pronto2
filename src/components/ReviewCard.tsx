"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Star, MoreVertical, Edit, Trash } from "lucide-react";
import Image from "next/image";
import { Review } from "@/types";
import { Button } from "@/components/ui/button";
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

interface ReviewCardProps {
  review: Review;
  isOwner?: boolean;
  onEdit?: (review: Review) => void;
  onDelete?: (review: Review) => void;
}

export default function ReviewCard({
  review,
  isOwner = false,
  onEdit,
  onDelete,
}: ReviewCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expandContent, setExpandContent] = useState(false);
  const [expandImages, setExpandImages] = useState(false);

  // 리뷰 작성일 포맷팅
  const formattedDate = format(
    new Date(review.created_at),
    "yyyy년 M월 d일",
    { locale: ko }
  );

  // 내용이 100자 이상인지 확인
  const isLongContent = review.content.length > 100;
  const displayContent = expandContent 
    ? review.content 
    : isLongContent 
      ? `${review.content.substring(0, 100)}...` 
      : review.content;

  // 별점 렌더링 함수
  const renderStars = (rating: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ));
  };

  // 삭제 확인 다이얼로그 열기
  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  // 삭제 확인
  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(review);
    }
    setIsDeleteDialogOpen(false);
  };

  // 수정 버튼 클릭
  const handleEditClick = () => {
    if (onEdit) {
      onEdit(review);
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium mr-3">
            {review.customer?.name?.substring(0, 1) || "익명"}
          </div>
          <div>
            <h4 className="font-medium">
              {review.customer?.name || "익명"}
            </h4>
            <div className="flex items-center">
              <div className="flex mr-2">{renderStars(review.rating)}</div>
              <span className="text-sm text-gray-500">{formattedDate}</span>
            </div>
          </div>
        </div>

        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEditClick}>
                <Edit className="mr-2 h-4 w-4" />
                <span>수정</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
                <Trash className="mr-2 h-4 w-4" />
                <span>삭제</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 리뷰 내용 */}
      <div className="my-3">
        <p className="text-gray-700 whitespace-pre-line">{displayContent}</p>
        {isLongContent && (
          <button
            onClick={() => setExpandContent(!expandContent)}
            className="text-sm text-blue-600 mt-1"
          >
            {expandContent ? "접기" : "더 보기"}
          </button>
        )}
      </div>

      {/* 리뷰 이미지 */}
      {review.images && review.images.length > 0 && (
        <div className="mt-3">
          <div className="grid grid-cols-5 gap-2">
            {(expandImages ? review.images : review.images.slice(0, 3)).map((image, index) => (
              <div
                key={image.id}
                className="relative aspect-square rounded-md overflow-hidden"
              >
                <Image
                  src={image.image_url}
                  alt={`리뷰 이미지 ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          {review.images.length > 3 && (
            <button
              onClick={() => setExpandImages(!expandImages)}
              className="text-sm text-blue-600 mt-2"
            >
              {expandImages ? "접기" : `${review.images.length - 3}개 더 보기`}
            </button>
          )}
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>리뷰 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 리뷰를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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