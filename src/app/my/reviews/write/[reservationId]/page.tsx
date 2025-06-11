"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Star, ArrowLeft, Upload, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useSupabase } from "@/contexts/SupabaseContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";
import Link from "next/link";

// 리뷰 작성 폼 스키마
const reviewSchema = z.object({
  rating: z.number().min(1, "별점을 선택해주세요").max(5),
  content: z.string()
    .min(10, "리뷰 내용은 최소 10자 이상 작성해주세요")
    .max(1000, "리뷰 내용은 최대 1000자까지 작성 가능합니다"),
  images: z.array(z.instanceof(File))
    .max(5, "이미지는 최대 5개까지 업로드 가능합니다")
    .optional()
});

type FormData = z.infer<typeof reviewSchema>;

interface Reservation {
  id: string;
  service_id: string;
  service: {
    id: string;
    name: string;
  };
  reservation_date: string;
  start_time: string;
  end_time: string;
  has_review: boolean;
}

export default function WriteReviewPage({ params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = React.use(params);
  const router = useRouter();
  const { user } = useAuth();
  const supabase = useSupabase(); // useSupabase 훅 사용
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      content: "",
      images: []
    }
  });
  
  // 예약 정보 조회
  useEffect(() => {
    const fetchReservation = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from("reservations")
          .select(`
            id,
            service_id,
            service:services(id, name),
            reservation_date,
            start_time,
            end_time,
            has_review
          `)
          .eq("id", reservationId)
          .eq("customer_id", user.id)
          .single();
          
        if (error) throw error;
        
        if (!data) {
          toast({
            title: "오류",
            description: "해당 예약이 존재하지 않거나 접근 권한이 없습니다.",
            variant: "destructive"
          });
          router.push("/my");
          return;
        }
        
        if (data.has_review) {
          toast({
            title: "알림",
            description: "이미 리뷰를 작성한 예약입니다.",
            variant: "destructive"
          });
          router.push("/my");
          return;
        }
        
        setReservation({
          id: data.id,
          service_id: data.service_id,
          service: Array.isArray(data.service) ? data.service[0] : data.service,
          reservation_date: data.reservation_date,
          start_time: data.start_time,
          end_time: data.end_time,
          has_review: data.has_review || false
        });
      } catch (error) {
        console.error("예약 정보 조회 오류:", error);
        toast({
          title: "오류",
          description: "예약 정보를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive"
        });
        router.push("/my");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReservation();
  }, [user, reservationId, router, supabase]);
  
  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
    setValue("rating", selectedRating);
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    
    if (selectedImages.length + newFiles.length > 5) {
      toast({
        title: "알림",
        description: "이미지는 최대 5개까지만 업로드 가능합니다.",
        variant: "destructive"
      });
      return;
    }
    
    const validFiles = newFiles.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "알림",
          description: "이미지 크기는 5MB 이하여야 합니다.",
          variant: "destructive"
        });
        return false;
      }
      
      if (!file.type.startsWith("image/")) {
        toast({
          title: "알림",
          description: "이미지 파일만 업로드 가능합니다.",
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    
    setSelectedImages(prev => [...prev, ...validFiles]);
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    setValue("images", [...selectedImages, ...validFiles]);
  };
  
  const removeImage = (index: number) => {
    setSelectedImages(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      setValue("images", newFiles);
      return newFiles;
    });
    
    setImagePreviewUrls(prev => {
      const newUrls = [...prev];
      URL.revokeObjectURL(newUrls[index]);
      newUrls.splice(index, 1);
      return newUrls;
    });
  };
  
  const onSubmit = async (data: FormData) => {
    if (!user || !reservation) {
      console.error("사용자 또는 예약 정보가 없습니다:", { user: !!user, reservation: !!reservation });
      toast({
        title: "오류",
        description: "사용자 인증 정보가 없습니다. 다시 로그인해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      console.log("리뷰 작성 시작:", {
        userId: user.id,
        userEmail: user.email,
        reservationId: reservation.id,
        serviceId: reservation.service_id
      });
      
      try {
        const { data: review, error: reviewError } = await supabase
          .from("reviews")
          .insert({
            customer_id: user.id,
            service_id: reservation.service_id,
            reservation_id: reservation.id,
            rating: data.rating,
            content: data.content
          })
          .select()
          .single();
          
        if (reviewError) {
          console.error("리뷰 저장 오류:", {
            message: reviewError.message,
            details: reviewError.details,
            hint: reviewError.hint,
            code: reviewError.code
          });
          
          if (reviewError.code === '42P01' || reviewError.message?.includes("does not exist")) {
            toast({
              title: "알림",
              description: "리뷰 기능이 아직 준비 중입니다. 나중에 다시 시도해주세요.",
              variant: "destructive"
            });
            router.push("/my");
            return;
          } else {
            throw new Error(reviewError.message);
          }
        }

        console.log("리뷰 저장 성공:", review);

        // 이미지 처리 (간소화)
        if (selectedImages.length > 0 && review) {
          try {
            for (const file of selectedImages) {
              const fileExt = file.name.split('.').pop();
              const fileName = `${review.id}/${Date.now()}.${fileExt}`;
              
              await supabase.storage
                .from("review_images")
                .upload(fileName, file);
            }
          } catch (imageError) {
            console.error("이미지 처리 중 오류:", imageError);
          }
        }

        // 적립시간 부여 로직 추가 (Edge Function 사용)
        try {
          console.log("적립시간 부여 시작:", {
            userId: user.id,
            reviewId: review.id,
            rewardMinutes: 10
          });
          
          // 현재 세션 확인
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          console.log("현재 세션 상태:", { 
            hasSession: !!session, 
            sessionError: sessionError?.message,
            accessToken: session?.access_token ? "있음" : "없음"
          });

          if (!session?.access_token) {
            throw new Error("인증 토큰이 없습니다. 다시 로그인해주세요.");
          }
          
          const requestPayload = {
            customer_id: user.id,
            review_id: review.id,
            reward_minutes: 10
          };

          console.log("Edge Function 호출 준비:", {
            functionName: 'review-reward',
            payload: requestPayload,
            hasAuth: true
          });

          const { data: rewardResult, error: rewardError } = await supabase.functions.invoke('review-reward', {
            body: requestPayload,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          console.log("Edge Function 응답:", { 
            data: rewardResult, 
            error: rewardError ? {
              name: rewardError.name,
              message: rewardError.message,
              details: rewardError.details || rewardError,
              context: rewardError.context,
              stack: rewardError.stack
            } : null,
            hasData: !!rewardResult,
            dataSuccess: rewardResult?.success
          });

          if (rewardError) {
            console.error("Edge Function 호출 오류:", {
              name: rewardError.name,
              message: rewardError.message,
              details: rewardError.details,
              context: rewardError.context,
              stack: rewardError.stack,
              fullError: JSON.stringify(rewardError, null, 2)
            });
            
            throw rewardError;
          }

          if (!rewardResult?.success) {
            console.error("Edge Function 응답 오류:", JSON.stringify(rewardResult, null, 2));
            throw new Error(rewardResult?.error || "적립시간 부여 실패");
          }

          console.log("적립시간 부여 성공:", rewardResult.data);

          toast({
            title: "성공",
            description: "소중한 리뷰를 작성해주셔서 감사합니다."
          });
          toast({
            title: "적립 완료",
            description: "리뷰 작성으로 10분의 적립 시간이 추가되었습니다."
          });
          
        } catch (rewardError: any) {
          console.error("적립시간 부여 실패:", {
            errorType: typeof rewardError,
            errorConstructor: rewardError?.constructor?.name,
            errorName: rewardError?.name,
            errorMessage: rewardError?.message,
            errorCode: rewardError?.code,
            errorDetails: rewardError?.details,
            errorContext: rewardError?.context,
            errorStack: rewardError?.stack,
            fullError: JSON.stringify(rewardError, null, 2)
          });
          
          // FunctionsFetchError의 경우 더 자세한 정보 로깅
          if (rewardError?.name === 'FunctionsFetchError') {
            console.error("Edge Function 네트워크 오류:", {
              url: "review-reward",
              fetchError: true,
              possibleCauses: [
                "Edge Function이 비활성화됨",
                "네트워크 연결 문제", 
                "인증 토큰 문제",
                "Supabase 서비스 장애"
              ]
            });
          }
          
          // Edge Function 실패 시 백업 로직: 직접 데이터베이스 업데이트
          try {
            console.log("백업 로직 시작: 직접 적립시간 업데이트");
            
            // 현재 사용자의 적립시간 조회
            const { data: currentUser, error: userError } = await supabase
              .from('customers')
              .select('accumulated_time_minutes')
              .eq('id', user.id)
              .single();

            if (userError) {
              console.error("사용자 정보 조회 오류:", {
                message: userError.message,
                code: userError.code,
                details: userError.details,
                hint: userError.hint,
                fullError: JSON.stringify(userError, null, 2)
              });
              throw userError;
            }

            console.log("현재 사용자 적립시간:", currentUser?.accumulated_time_minutes || 0);

            // 적립시간 10분 추가
            const newAccumulatedTime = (currentUser?.accumulated_time_minutes || 0) + 10;
            
            const { data: updateResult, error: updateError } = await supabase
              .from('customers')
              .update({ 
                accumulated_time_minutes: newAccumulatedTime,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id)
              .select('accumulated_time_minutes, updated_at');

            if (updateError) {
              console.error("적립시간 업데이트 오류:", {
                message: updateError.message,
                code: updateError.code,
                details: updateError.details,
                hint: updateError.hint,
                fullError: JSON.stringify(updateError, null, 2)
              });
              throw updateError;
            }

            console.log("백업 로직 성공:", {
              updateResult,
              previousTime: currentUser?.accumulated_time_minutes || 0,
              newTime: newAccumulatedTime
            });

            toast({
              title: "성공",
              description: "소중한 리뷰를 작성해주셔서 감사합니다."
            });
            toast({
              title: "적립 완료",
              description: "리뷰 작성으로 10분의 적립 시간이 추가되었습니다."
            });

          } catch (backupError: any) {
            console.error("백업 로직 실패:", {
              errorType: typeof backupError,
              errorName: backupError?.name,
              errorMessage: backupError?.message,
              errorCode: backupError?.code,
              errorDetails: backupError?.details,
              errorHint: backupError?.hint,
              fullError: JSON.stringify(backupError, null, 2)
            });
            
            // 적립시간 부여 실패해도 리뷰 작성은 성공으로 처리
            toast({
              title: "성공",
              description: "소중한 리뷰를 작성해주셔서 감사합니다."
            });
            
            // 백업 로직도 실패한 경우에만 고객센터 안내
            const isEdgeFunctionFailure = backupError?.message?.includes("Edge Function") || 
                                         backupError?.name === 'FunctionsFetchError';
            
            if (isEdgeFunctionFailure) {
              toast({
                title: "안내",
                description: "적립 시간은 나중에 자동으로 부여될 예정입니다. 잠시만 기다려주세요.",
                variant: "default"
              });
            } else {
              toast({
                title: "안내", 
                description: "적립 시간 부여 중 문제가 발생했습니다. 고객센터로 문의해주세요.",
                variant: "destructive"
              });
            }
          }
        }
        
        router.push("/my");
      } catch (error: any) {
        if (error?.code === '42P01' || error?.message?.includes("does not exist")) {
          toast({
            title: "알림",
            description: "리뷰 기능이 아직 준비 중입니다. 나중에 다시 시도해주세요.",
            variant: "destructive"
          });
          router.push("/my");
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("리뷰 저장 오류:", error);
      toast({
        title: "오류",
        description: "리뷰를 저장하는 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGoBack = () => {
    router.back();
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }
  
  if (!reservation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-xl font-semibold mb-2">예약을 찾을 수 없습니다</h2>
        <p className="text-gray-500 mb-4">해당 예약이 존재하지 않거나 접근 권한이 없습니다.</p>
        <Link href="/my">
          <Button>마이페이지로 이동</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleGoBack}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          뒤로가기
        </Button>
        
        <h1 className="text-2xl font-bold mb-2">리뷰 작성</h1>
        <p className="text-gray-500">
          {reservation.service?.name} 이용에 대한 리뷰를 작성해주세요.
        </p>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-2">예약 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">서비스</p>
              <p className="font-medium">{reservation.service?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">이용 일시</p>
              <p className="font-medium">
                {format(new Date(reservation.reservation_date), "yyyy년 M월 d일", { locale: ko })}
                <br />
                {reservation.start_time.substring(0, 5)} ~ {reservation.end_time.substring(0, 5)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 별점 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">별점</label>
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-8 w-8 cursor-pointer transition-colors ${
                  star <= (hoverRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                }`}
                onClick={() => handleRatingClick(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              />
            ))}
          </div>
          {errors.rating && (
            <p className="text-sm text-red-500">{errors.rating.message}</p>
          )}
        </div>
        
        <Separator />
        
        {/* 리뷰 내용 */}
        <div className="space-y-2">
          <label htmlFor="content" className="text-sm font-medium">
            리뷰 내용 (10~1000자)
          </label>
          <Textarea
            id="content"
            placeholder="스튜디오 이용 경험을 자세히 알려주세요."
            className="min-h-[150px]"
            {...register("content")}
          />
          {errors.content && (
            <p className="text-sm text-red-500">{errors.content.message}</p>
          )}
        </div>
        
        <Separator />
        
        {/* 이미지 업로드 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            이미지 첨부 (최대 5개, 선택사항)
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
            {/* 이미지 미리보기 */}
            {imagePreviewUrls.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
                <Image
                  src={url}
                  alt={`리뷰 이미지 ${index + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-0 right-0 bg-black bg-opacity-50 p-1 rounded-bl"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ))}
            
            {/* 이미지 추가 버튼 */}
            {selectedImages.length < 5 && (
              <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                <Upload className="h-6 w-6 text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">업로드</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>
          {errors.images && (
            <p className="text-sm text-red-500">{errors.images.message}</p>
          )}
        </div>
        
        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || rating === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              "리뷰 등록하기"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
