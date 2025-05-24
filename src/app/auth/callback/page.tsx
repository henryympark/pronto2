"use client";

import { useEffect, Suspense, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabase } from "@/contexts/SupabaseContext";
import { getUserRole } from '@/lib/auth-utils';

// 실제 인증 콜백 처리를 담당하는 컴포넌트
function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isMounted = useRef(true);
  const supabase = useSupabase();
  
  // 안정적인 리디렉션 함수
  const safeRedirect = (path: string) => {
    console.log(`[리디렉션] 경로로 이동 시작: ${path}`);
    setIsRedirecting(true);
    
    try {
      console.log(`[리디렉션] window.location.href 사용: ${path}`);
      window.location.href = path;
    } catch (error) {
      console.error('[리디렉션 예외 발생]', error);
      window.location.href = path;
    }
  };
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  useEffect(() => {
    if (isRedirecting) return;
    
    const handleAuthCallback = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // 이메일 인증 관련 파라미터 확인
      const isEmailConfirmation = searchParams.get('type') === 'email_confirmation' || 
                                searchParams.get('email_confirmed') === 'true';
      
      if (sessionError) {
        console.error("세션 불러오기 오류:", sessionError);
        safeRedirect("/auth/login?error=session");
        return;
      }
      
      if (!session?.user) {
        console.log("[인증] 세션 또는 사용자 정보 없음");
        safeRedirect("/auth/login?error=no-user");
        return;
      }

      try {
        console.log("[AuthCallback] 로그인한 사용자 정보:", {
          id: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider
        });
        
        // ✅ 통합 권한 유틸리티 사용
        const userRole = await getUserRole(supabase, session.user);
        
        console.log("[AuthCallback] 권한 확인 완료:", {
          isAdmin: userRole.isAdmin,
          role: userRole.role,
          source: userRole.source
        });
        
        // customers 테이블에 사용자가 없으면 자동 생성
        if (userRole.source === 'default') {
          console.log("[AuthCallback] 새 사용자 등록 처리");
          try {
            const provider = session.user.app_metadata?.provider || "email";
            const { error: insertError } = await supabase
              .from("customers")
              .insert({
                id: session.user.id,
                email: session.user.email,
                role: 'customer',
                auth_provider: provider,
              });
            
            if (insertError) {
              console.error("새 사용자 등록 오류:", insertError);
              // 에러가 있어도 계속 진행 (이미 존재할 수 있음)
            }
          } catch (insertError) {
            console.error("사용자 등록 중 예외:", insertError);
            // 에러가 있어도 계속 진행
          }
        }
        
        // 이메일 인증을 통해 접근한 경우 로그 출력
        if (isEmailConfirmation) {
          console.log('[AuthCallback] 이메일 인증 완료');
        }
        
        // ✅ 단순한 리디렉션 로직
        const targetPath = userRole.isAdmin ? '/admin/reservations' : '/service/pronto-b';
        console.log(`[AuthCallback] ${userRole.isAdmin ? '관리자' : '일반사용자'} 리디렉션: ${targetPath}`);
        
        safeRedirect(targetPath);
        
      } catch (error) {
        console.error("인증 콜백 처리 오류:", error);
        // 오류 발생 시 안전한 기본 경로로 리디렉션
        safeRedirect("/service/pronto-b");
      }
    };

    handleAuthCallback();
  }, [router, searchParams, isRedirecting, supabase]);

  if (isRedirecting) {
    return (
      <div className="text-center mt-4">
        <p className="text-pronto-primary">페이지 이동 중...</p>
      </div>
    );
  }

  return null;
}

// 로딩 상태를 표시하는 컴포넌트
function LoadingState() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">로그인 처리 중...</h1>
      <p className="text-muted-foreground">잠시만 기다려주세요.</p>
      <div className="w-8 h-8 border-4 border-t-pronto-primary rounded-full animate-spin"></div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">로그인 처리 중...</h1>
      <p className="text-muted-foreground">잠시만 기다려주세요.</p>
      <div className="w-8 h-8 border-4 border-t-pronto-primary rounded-full animate-spin"></div>
      
      <Suspense fallback={<LoadingState />}>
        <AuthCallbackHandler />
      </Suspense>
    </div>
  );
}