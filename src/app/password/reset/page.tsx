"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { createClient$ } from "@/lib/supabase";
import { Lock, Eye, EyeOff, Check, ArrowRight } from "lucide-react";

function PasswordResetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient$();
  
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSucceeded, setResetSucceeded] = useState(false);
  
  // URL에서 토큰 파라미터 확인
  useEffect(() => {
    // 토큰이 없으면 비밀번호 찾기 페이지로 리디렉션
    if (!searchParams.has("token")) {
      toast.error("비밀번호 재설정 링크가 유효하지 않습니다.", {
        title: "유효하지 않은 접근",
      });
      router.push("/password/find");
    }
  }, [searchParams, router]);
  
  // 입력값 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // 실시간 유효성 검사 (해당 필드의 에러만 지움)
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // 폼 유효성 검사
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // 비밀번호 검사 (8자 이상, 영문/숫자/특수문자 조합)
    if (!formData.password) {
      newErrors.password = "비밀번호를 입력해주세요.";
    } else if (formData.password.length < 8) {
      newErrors.password = "비밀번호는 8자 이상이어야 합니다.";
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(formData.password)) {
      newErrors.password = "비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.";
    }
    
    // 비밀번호 확인
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "비밀번호 확인을 입력해주세요.";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // 비밀번호 변경 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Supabase Auth를 통한 비밀번호 변경
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });
      
      if (error) throw error;
      
      setResetSucceeded(true);
      toast.success("비밀번호가 성공적으로 변경되었습니다.", {
        title: "비밀번호 변경 완료",
      });
    } catch (error: any) {
      console.error("비밀번호 변경 오류:", error);
      toast.error(error.message || "비밀번호 변경 중 오류가 발생했습니다.", {
        title: "비밀번호 변경 실패",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="mx-auto max-w-md space-y-8 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold">비밀번호 재설정</h1>
        <p className="mt-2 text-sm text-pronto-gray-500">
          새로운 비밀번호를 입력해주세요
        </p>
      </div>
      
      {resetSucceeded ? (
        <div className="rounded-lg border border-green-100 bg-green-50 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="mb-4 text-xl font-semibold text-green-700">비밀번호 변경 완료</h2>
          <p className="mb-6 text-green-600">
            비밀번호가 성공적으로 변경되었습니다.
            새로운 비밀번호로 로그인해주세요.
          </p>
          <Link href="/auth/login?reset=success">
            <Button 
              className="w-full bg-pronto-primary hover:bg-pronto-primary/90"
            >
              로그인 페이지로 이동
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 새 비밀번호 입력 */}
          <div className="space-y-2">
            <Label htmlFor="password">
              새 비밀번호 <span className="text-destructive">*</span>
              <span className="text-xs text-pronto-gray-400 ml-1">
                (8자 이상, 영문/숫자/특수문자 조합)
              </span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pronto-gray-400" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="새 비밀번호를 입력하세요"
                value={formData.password}
                onChange={handleChange}
                className={`pl-10 ${errors.password ? "border-destructive" : ""}`}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-pronto-gray-400"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>
          
          {/* 비밀번호 확인 */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">비밀번호 확인 <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pronto-gray-400" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="새 비밀번호를 다시 입력하세요"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`pl-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-pronto-gray-400"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword}</p>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-pronto-primary hover:bg-pronto-primary/90 font-medium mt-4" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "처리 중..." : "비밀번호 변경하기"}
            {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function PasswordResetPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md space-y-8 py-10 text-center">로딩 중...</div>}>
      <PasswordResetContent />
    </Suspense>
  );
} 