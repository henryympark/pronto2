"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { KakaoLogo, NaverLogo } from "@/components/ui/logos";

// 리디렉션 디버깅을 위한 상수 - 디버깅 코드 비활성화
const ENABLE_REDIRECT_DEBUGGING = false;

// 개발 환경에서만 로그를 출력하는 유틸리티 함수
const devLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    if (data !== undefined) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithKakao, signInWithNaver, user, loading, isAdmin } = useAuth();
  const supabase = useSupabase();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // 리디렉션 중복 방지를 위한 상태 추가
  const [isRedirecting, setIsRedirecting] = useState(false);
  // 리디렉션 시도 추적을 위한 ref
  const hasAttemptedRedirectRef = useRef(false);
  
  // URL의 에러 파라미터와 성공 파라미터 확인
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const signupSuccess = searchParams.get("signup") === "success";
    const activationSuccess = searchParams.get("activation") === "success";
    const passwordResetSuccess = searchParams.get("reset") === "success";
    const accountDeactivated = searchParams.get("message") === "account_deactivated";
    
    // 에러 메시지 설정
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        "session": "세션을 불러오는데 문제가 발생했습니다.",
        "no-user": "사용자 정보를 찾을 수 없습니다.",
        "register": "계정 등록 중 문제가 발생했습니다.",
        "activation": "계정 활성화 중 문제가 발생했습니다.",
        "unknown": "로그인 처리 중 오류가 발생했습니다."
      };
      
      setError(errorMessages[errorParam] || "로그인에 실패했습니다.");
    }
    
    // 성공 메시지 설정
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
  
  // 이미 로그인한 사용자 처리 - 리디렉션 로직 개선
  useEffect(() => {
    devLog(`[Login Page useEffect] 실행, loading: ${loading}, user: ${user ? user.id : '없음'}, isAdmin: ${isAdmin}, redirected: ${hasAttemptedRedirectRef.current}`);
    
    if (hasAttemptedRedirectRef.current) {
      devLog('[Login Page useEffect] 이미 리디렉션 시도됨, 중복 방지.');
      return;
    }

    // 1. AuthContext의 로딩이 완료되고, 사용자 정보가 있으며, isAdmin 상태가 boolean으로 확정되었을 때만 진행
    if (!loading && user && typeof isAdmin === 'boolean') {
      // 2. 로그아웃 직후의 리디렉션은 건너뜀 (t 파라미터 확인)
      const timestamp = searchParams.get("t");
      if (timestamp) {
        devLog('[Login Page useEffect] URL에 "t" 파라미터 감지됨.');
        // URL에서 't' 파라미터를 제거하여 다음 useEffect 실행 시에는 영향을 주지 않도록 함.
        // 이렇게 하면 현재 실행은 리디렉션을 건너뛰지만, router.replace 후 searchParams가 변경되어
        // useEffect가 다시 실행될 때 't'가 없으므로 정상적인 리디렉션 로직을 탈 수 있음.
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete('t');
        const newUrl = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
        
        // 중복 리디렉션 시도 방지 플래그를 여기서 초기화하면 안됨.
        // 이 useEffect 실행에서는 리디렉션을 시도하지 않으므로.
        
        router.replace(newUrl); // URL만 변경
        devLog('[Login Page useEffect] "t" 파라미터 제거 후 URL 변경 시도. 이번 리디렉션은 건너뜀.');
        return; // 이번 실행은 여기서 중단
      }

      // 3. 모든 조건 만족 시, isAdmin 상태에 따라 리디렉션 실행 (단 한 번만)
      let targetPath = '/service/pronto-b'; // 일반 사용자 기본 경로
      if (isAdmin) {
        devLog('[Login Page useEffect] 어드민 사용자 감지됨. 어드민 예약 페이지로 리디렉션합니다.');
        targetPath = '/admin/reservations'; // 어드민일 경우, 어드민 예약 페이지로 리디렉션
      }

      devLog(`[Login Page useEffect] 최종 조건 만족, isAdmin: ${isAdmin}. 변경된 테스트 경로: ${targetPath}로 리디렉션 실행.`);

      // 추가 로그 시작
      devLog('[Login Page useEffect] 현재 router 객체:', router);
      devLog('[Login Page useEffect] 리디렉션 시도할 경로 (targetPath):', targetPath);
      // 추가 로그 끝

      hasAttemptedRedirectRef.current = true; // 리디렉션 시도 플래그 설정!
      setIsRedirecting(true);

      try {
        devLog(`[Login Page useEffect] router.push('${targetPath}') 호출 시도...`); // 호출 직전 로그
        router.push(targetPath);
        devLog(`[Login Page useEffect] router.push('${targetPath}') 호출 완료 (에러 없음).`); // 호출 직후 성공 로그
        
        // router.push 후에도 페이지가 이동하지 않을 경우를 위한 백업 방안
        // 디버깅 모드에서만 활성화
        if (ENABLE_REDIRECT_DEBUGGING) {
          // 1초 후에 window.location.href를 사용하여 강제 이동 시도
          setTimeout(() => {
            devLog(`[Login Page useEffect] router.push 후 1초 경과, 여전히 같은 페이지라면 window.location.href로 시도...`);
            window.location.href = targetPath;
          }, 1000);
        }
      } catch (error) {
        // 기존 에러 로그 외에 추가 정보 로깅
        console.error(`[Login Page useEffect] router.push 실패! 오류 객체:`, error);
        console.error(`[Login Page useEffect] 오류 메시지: ${error instanceof Error ? error.message : '알 수 없는 오류'}, 경로: ${targetPath}`);
        hasAttemptedRedirectRef.current = false;
        setIsRedirecting(false);
      }
    } else if (loading) {
      devLog('[Login Page useEffect] AuthContext 로딩 중...');
    } else if (!user) {
      devLog('[Login Page useEffect] 로그인된 사용자 없음, 리디렉션 불필요. (리디렉션 시도 플래그 초기화)');
      hasAttemptedRedirectRef.current = false; // 사용자가 로그아웃되거나 없다면 다음 로그인 시 리디렉션 가능하도록 플래그 초기화
    }
  }, [user, loading, isAdmin, router, searchParams]);

  // 이메일 로그인 처리
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      devLog("[로그인] 로그인 시도 이메일:", email);
      
      // Supabase Auth로 로그인 시도
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // 로그인 오류 처리
      if (error) {
        console.error("[로그인] 로그인 에러 발생:", error.message);
        if (error.message.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 일치하지 않습니다.');
        } else {
          setError(error.message || "로그인에 실패했습니다.");
        }
        return;
      }
      
      // 성공적으로 로그인됨
      if (data.session && data.user) {
        devLog("[로그인] 로그인 성공! 사용자 정보:", data.user);
        
        // 브라우저 쿠키 확인 (디버깅용)
        if (process.env.NODE_ENV === 'development' && typeof document !== 'undefined') {
          console.log("[로그인] 현재 쿠키 상태:", document.cookie);
          
          // sb- 쿠키가 있는지 확인
          const hasSbCookie = document.cookie.split('; ').some(c => c.startsWith('sb-'));
          console.log("[로그인] Supabase 인증 쿠키 존재 여부:", hasSbCookie);
        }
        
        // 성공 메시지 표시
        setSuccessMessage("로그인 성공! 페이지 이동 중...");
        
        // 리디렉션은 useEffect에서 처리됩니다 - 여기서는 아무 작업도 하지 않음
      } else {
        console.log("[로그인] 로그인 성공했지만 세션이 없음");
        setError("로그인에 성공했지만 세션을 생성할 수 없습니다.");
      }
    } catch (error: any) {
      console.error("[로그인] 로그인 에러:", error);
      setError(error.message || "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    setError(null);
    try {
      await signInWithKakao();
      // 리디렉션은 OAuth 과정에서 처리됨
    } catch (error: any) {
      setError("카카오 로그인에 실패했습니다.");
      console.error("카카오 로그인 에러:", error);
    }
  };

  const handleNaverLogin = async () => {
    setError(null);
    try {
      await signInWithNaver();
      // 리디렉션은 OAuth 과정에서 처리됨
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
        {/* 인증 로딩 상태 표시 (전체 컴포넌트에 영향) */}
        {loading && (
          <div className="p-4 text-center bg-blue-50 border border-blue-200 rounded flex items-center justify-center space-x-2">
            <Loader2 className="animate-spin h-4 w-4" />
            <span className="text-sm text-blue-700">인증 상태 확인 중...</span>
          </div>
        )}
        
        {/* 리디렉션 중 표시 */}
        {isRedirecting && (
          <div className="p-4 text-center bg-green-50 border border-green-200 rounded flex items-center justify-center space-x-2">
            <Loader2 className="animate-spin h-4 w-4" />
            <span className="text-sm text-green-700">로그인 확인됨, 페이지 이동 중...</span>
          </div>
        )}
        
        {/* 소셜 로그인 버튼 */}
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

        {/* 이메일 로그인 폼 */}
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
          
          {successMessage && !isRedirecting && (
            <div className="p-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded mb-2">
              {successMessage}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 font-medium" 
            disabled={isLoading || isRedirecting}
          >
            {isLoading ? "로그인 중..." : "이메일로 로그인"}
            {!isLoading && !isRedirecting && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-gray-500">아직 회원이 아니신가요?</span>{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            이메일로 회원가입
          </Link>
        </div>

        {/* 운영자 로그인 안내 */}
        <div className="mt-10 text-center text-xs text-gray-400">
          <p>운영자는 지정된 이메일과 비밀번호로 로그인해주세요</p>
        </div>
      </div>
    </div>
  );
} 