"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { KakaoLogo, NaverLogo } from "@/components/ui/logos";
import { getUserRole, registerNewUser } from '@/domains/auth';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithKakao, signInWithNaver, user, loading } = useAuth();
  const supabase = useSupabase();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // URL 파라미터 처리
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const signupSuccess = searchParams.get("signup") === "success";
    const activationSuccess = searchParams.get("activation") === "success";
    const passwordResetSuccess = searchParams.get("reset") === "success";
    const accountDeactivated = searchParams.get("message") === "account_deactivated";
    
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        "session": "세션을 불러오는데 문제가 발생했습니다.",
        "no-user": "사용자 정보를 찾을 수 없습니다.",
        "register": "계정 등록 중 문제가 발생했습니다.",
        "activation": "계정 활성화 중 문제가 발생했습니다.",
        "logout_failed": "로그아웃 처리 중 오류가 발생했습니다.",
        "oauth": "소셜 로그인 처리 중 오류가 발생했습니다.",
        "unknown": "로그인 처리 중 오류가 발생했습니다."
      };
      setError(errorMessages[errorParam] || "로그인에 실패했습니다.");
    }
    
    if (signupSuccess) {
      setSuccessMessage("회원가입이 완료되었습니다. 이메일로 발송된 인증 링크를 클릭하여 계정을 활성화해주세요.");
    } else if (activationSuccess) {
      setSuccessMessage("계정이 성공적으로 활성화되었습니다. 이제 로그인할 수 있습니다.");
    } else if (passwordResetSuccess) {
      setSuccessMessage("비밀번호가 성공적으로 재설정되었습니다. 새 비밀번호로 로그인해주세요.");
    } else if (accountDeactivated) {
      setSuccessMessage("회원 탈퇴가 정상적으로 처리되었습니다. 그동안 프론토 서비스를 이용해주셔서 감사합니다.");
    }
  }, [searchParams]);
  
  // ✅ DB 기반 직접 리디렉션 로직
  useEffect(() => {
    console.log('[LoginPage] 상태 체크:', { 
      loading, 
      hasUser: !!user, 
      hasLogoutParam: !!searchParams.get("t") 
    });
    
    // 로그아웃 후 접근한 경우 리디렉션 안함
    if (searchParams.get("t")) {
      console.log('[LoginPage] 로그아웃 후 접근 - 리디렉션 스킵');
      return;
    }
    
    // 로딩 완료 && 사용자 있음 = DB 기반 권한 체크 후 리디렉션
    if (!loading && user) {
      console.log('[LoginPage] 기존 로그인 사용자 감지 - DB 기반 리디렉션 처리');
      
      const handleDirectRedirect = async () => {
        try {
          console.log('[LoginPage] DB 기반 권한 체크 시작');
          const userRole = await getUserRole(supabase, user);
          
          console.log('[LoginPage] 권한 체크 완료:', {
            isAdmin: userRole.isAdmin,
            role: userRole.role,
            source: userRole.source
          });
          
          const targetPath = userRole.isAdmin ? '/admin/reservations' : '/service/pronto-b';
          console.log(`[LoginPage] DB 기반 리디렉션: ${targetPath}`);
          
          router.push(targetPath);
          
        } catch (error) {
          console.error('[LoginPage] 권한 체크 실패:', error);
          // 권한 체크 실패 시 기본 서비스 페이지로
          router.push('/service/pronto-b');
        }
      };
      
      handleDirectRedirect();
    }
  }, [loading, user, router, searchParams, supabase]);

  // 이메일 로그인 처리 (DB 기반 직접 리디렉션)
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      console.log("[이메일 로그인] 로그인 시도:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("[이메일 로그인] 로그인 에러:", error.message);
        if (error.message.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 일치하지 않습니다.');
        } else {
          setError(error.message || "로그인에 실패했습니다.");
        }
        return;
      }
      
      if (data.session && data.user) {
        console.log("[이메일 로그인] 로그인 성공! DB 기반 리디렉션 처리");
        
        try {
          // ✅ DB 기반 권한 체크 후 리디렉션
          const userRole = await getUserRole(supabase, data.user);
          
          console.log('[이메일 로그인] DB 기반 권한 체크 완료:', {
            isAdmin: userRole.isAdmin,
            role: userRole.role,
            source: userRole.source
          });
          
          // customers 테이블에 사용자가 없으면 자동 생성
          if (userRole.source === 'default') {
            console.log("[이메일 로그인] 새 사용자 등록 처리");
            const registered = await registerNewUser(supabase, data.user, 'email');
            if (!registered) {
              console.warn("[이메일 로그인] 사용자 등록 실패했지만 계속 진행");
            }
          }
          
          const targetPath = userRole.isAdmin ? '/admin/reservations' : '/service/pronto-b';
          setSuccessMessage(`로그인 성공! ${userRole.isAdmin ? '관리자' : '서비스'} 페이지로 이동 중...`);
          
          console.log(`[이메일 로그인] DB 기반 리디렉션 실행: ${targetPath}`);
          router.push(targetPath);
          
        } catch (roleError) {
          console.error('[이메일 로그인] 권한 체크 실패:', roleError);
          setSuccessMessage('로그인 성공! 서비스 페이지로 이동 중...');
          router.push('/service/pronto-b');
        }
        
      } else {
        console.error("[이메일 로그인] 세션 생성 실패");
        setError("로그인에 성공했지만 세션을 생성할 수 없습니다.");
      }
    } catch (error: any) {
      console.error("[이메일 로그인] 로그인 에러:", error);
      setError(error.message || "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // OAuth 로그인들 (AuthCallback으로 이동)
  const handleKakaoLogin = async () => {
    setError(null);
    try {
      console.log('[카카오 로그인] OAuth 시작 - AuthCallback에서 DB 기반 처리됨');
      await signInWithKakao();
    } catch (error: any) {
      setError("카카오 로그인에 실패했습니다.");
      console.error("카카오 로그인 에러:", error);
    }
  };

  const handleNaverLogin = async () => {
    setError(null);
    try {
      console.log('[네이버 로그인] OAuth 시작 - AuthCallback에서 DB 기반 처리됨');
      await signInWithNaver();
    } catch (error: any) {
      setError("네이버 로그인에 실패했습니다.");
      console.error("네이버 로그인 에러:", error);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-8 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold">로그인</h1>
        <p className="mt-2 text-sm text-gray-500">
          프론토 서비스를 이용하기 위해 로그인해주세요
        </p>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="p-4 text-center bg-blue-50 border border-blue-200 rounded flex items-center justify-center space-x-2">
            <Loader2 className="animate-spin h-4 w-4" />
            <span className="text-sm text-blue-700">인증 상태 확인 중...</span>
          </div>
        )}
        
        <Button 
          onClick={handleKakaoLogin}
          className="w-full bg-[#FEE500] text-black hover:bg-[#FEE500]/90 font-medium" 
          type="button"
        >
          <KakaoLogo className="mr-2 h-5 w-5" />
          카카오로 로그인
        </Button>
        
        <Button 
          onClick={handleNaverLogin}
          className="w-full bg-[#03C75A] hover:bg-[#03C75A]/90 font-medium" 
          type="button"
        >
          <NaverLogo className="mr-2 h-5 w-5" />
          네이버로 로그인
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200"></span>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-gray-500">또는</span>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="form-group">
            <Label htmlFor="email">이메일</Label>
            <div className="relative">
              <Mail className="input-icon" />
              <Input
                id="email"
                type="email"
                placeholder="이메일 주소를 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-with-icon"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">비밀번호</Label>
              <Link 
                href="/password/find" 
                className="text-xs text-primary hover:underline"
              >
                비밀번호 찾기
              </Link>
            </div>
            <div className="relative">
              <Lock className="input-icon" />
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-with-icon"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded mb-2">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="p-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded mb-2">
              {successMessage}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 font-medium" 
            disabled={isLoading}
          >
            {isLoading ? "로그인 중..." : "이메일로 로그인"}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-gray-500">아직 회원이 아니신가요?</span>{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            이메일로 회원가입
          </Link>
        </div>

        <div className="mt-10 text-center text-xs text-gray-400">
          <p>DB에 등록된 관리자 계정으로 로그인하면 관리자 페이지로 이동합니다</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}