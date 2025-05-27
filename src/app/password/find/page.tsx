"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useSupabase } from "@/contexts/SupabaseContext";
import { Mail, ArrowLeft } from "lucide-react";

export default function PasswordFindPage() {
  const router = useRouter();
  const supabase = useSupabase();
  
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 이메일 형식 검사
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("유효한 이메일을 입력해주세요.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Supabase Auth를 통한 비밀번호 재설정 이메일 발송
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/password/reset`,
      });
      
      if (error) throw error;
      
      setSucceeded(true);
      toast.success("비밀번호 재설정 링크가 이메일로 발송되었습니다.");
    } catch (error: any) {
      console.error("비밀번호 재설정 이메일 발송 오류:", error);
      setError(error.message || "비밀번호 재설정 이메일 발송에 실패했습니다.");
      toast.error(error.message || "이메일 발송 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="mx-auto max-w-md space-y-8 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold">비밀번호 찾기</h1>
        <p className="mt-2 text-sm text-pronto-gray-500">
          가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다
        </p>
      </div>
      
      {succeeded ? (
        <div className="rounded-lg border border-green-100 bg-green-50 p-6 text-center">
          <h2 className="mb-4 text-xl font-semibold text-green-700">이메일 발송 완료</h2>
          <p className="mb-4 text-green-600">
            비밀번호 재설정 링크가 <span className="font-medium">{email}</span>로 발송되었습니다.
            이메일을 확인하고 링크를 클릭하여 비밀번호를 재설정해주세요.
          </p>
          <p className="mb-6 text-sm text-green-500">
            이메일이 도착하지 않았다면 스팸함을 확인해주세요.
          </p>
          <div className="flex flex-col space-y-2">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setSucceeded(false)}
            >
              다시 요청하기
            </Button>
            <Link href="/auth/login">
              <Button 
                className="w-full bg-pronto-primary hover:bg-pronto-primary/90"
              >
                로그인 페이지로 돌아가기
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일 주소</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pronto-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="가입하신 이메일 주소를 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`pl-10 ${error ? "border-destructive" : ""}`}
                required
              />
            </div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-pronto-primary hover:bg-pronto-primary/90 font-medium" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "처리 중..." : "비밀번호 재설정 링크 받기"}
          </Button>
          
          <div className="flex items-center justify-center">
            <Link 
              href="/auth/login" 
              className="flex items-center text-sm text-pronto-gray-600 hover:text-pronto-primary"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              로그인 페이지로 돌아가기
            </Link>
          </div>
        </form>
      )}
    </div>
  );
} 
