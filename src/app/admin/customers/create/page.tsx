"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/shared/hooks/useToast";

export default function CreateCustomerPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const { isAdmin, loading: authLoading } = useAuth();

  // 폼 상태
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // 유효성 검사
    if (!email.trim()) {
      toast({
        title: "입력 오류",
        description: "이메일을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!nickname.trim()) {
      toast({
        title: "입력 오류",
        description: "이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "입력 오류",
        description: "올바른 이메일 형식을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // 이메일 중복 확인
      const { data: existingCustomer, error: checkError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', email.trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingCustomer) {
        toast({
          title: "등록 실패",
          description: "이미 등록된 이메일입니다.",
          variant: "destructive",
        });
        return;
      }

      // 고객 생성
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          email: email.trim(),
          nickname: nickname.trim(),
          phone: phone.trim() || null,
          auth_provider: 'manual',
          role: 'customer',
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("고객 생성 오류:", error);
        throw new Error(`고객 생성 실패: ${error.message}`);
      }

      toast({
        title: "성공",
        description: "고객이 성공적으로 등록되었습니다.",
      });

      // 예약 등록 페이지로 돌아가면서 생성된 고객 정보 전달
      const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
      if (returnUrl === '/admin/reservations/create') {
        router.push(`/admin/reservations/create?customerId=${customer.id}`);
      } else {
        router.push('/admin/customers');
      }
    } catch (error) {
      console.error('고객 등록 오류:', error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "고객 등록에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">접근 권한이 없습니다</p>
          <p>관리자 권한이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </Button>
        <h1 className="text-2xl font-bold">신규 고객 등록</h1>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>고객 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="고객 이메일을 입력하세요"
              />
            </div>
            
            <div>
              <Label htmlFor="nickname">이름 *</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="고객 이름을 입력하세요"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="전화번호를 입력하세요 (선택사항)"
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !email.trim() || !nickname.trim()}
              >
                {isSubmitting ? "등록 중..." : "고객 등록"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 