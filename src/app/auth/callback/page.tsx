"use client";

import { useEffect, Suspense, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabase } from "@/contexts/SupabaseContext";
import { getUserRole, registerNewUser } from '@/lib/auth-utils';

// OAuth 콜백 처리를 담당하는 컴포넌트
function OAuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("로그인 처리 중...");
  const isMounted = useRef(true);
  const supabase = useSupabase();
  
  // 안정적인 리디렉션 함수
  const safeRedirect = (path: string) => {
    console.log(`[OAuth 콜백] 리디렉션: ${path}`);
    setIsRedirecting(true);
    setProcessingMessage("페이지 이동 중...");
    
    try {
      window.location.href = path;
    } catch (error) {
      console.error('[OAuth 콜백] 리디렉션 오류:', error);
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
    
    const handleOAuthCallback = async () => {
      try {
        console.log('[OAuth 콜백] DB 기반 처리 시작');
        setProcessingMessage("인증 정보 확인 중...");
        
        // OAuth 콜백인지 확인
        const isOAuthCallback = searchParams.get('code') || 
                               searchParams.get('access_token') ||
                               searchParams.get('type') === 'email_confirmation' ||
                               searchParams.get('email_confirmed') === 'true';
        
        console.log('[OAuth 콜백] 파라미터 확인:', {
          hasCode: !!searchParams.get('code'),
          hasAccessToken: !!searchParams.get('access_token'),
          isEmailConfirmation: searchParams.get('type') === 'email_confirmation',
          emailConfirmed: searchParams.get('email_confirmed')
        });
        
        if (!isOAuthCallback) {
          console.log('[OAuth 콜백] OAuth 콜백이 아님, 홈으로 리디렉션');
          safeRedirect('/');
          return;
        }
        
        setProcessingMessage("세션 정보 가져오는 중...");
        
        // 세션 가져오기
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[OAuth 콜백] 세션 오류:', sessionError);
          safeRedirect('/auth/login?error=oauth');
          return;
        }
        
        if (!session?.user) {
          console.error('[OAuth 콜백] 세션 또는 사용자 정보 없음');
          safeRedirect('/auth/login?error=no-user');
          return;
        }
        
        console.log('[OAuth 콜백] 사용자 정보 확인:', {
          id: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider
        });
        
        setProcessingMessage("DB 기반 권한 확인 중...");
        
        // ✅ DB 기반 권한 체크
        const userRole = await getUserRole(supabase, session.user);
        
        console.log('[OAuth 콜백] DB 기반 권한 확인 완료:', {
          isAdmin: userRole.isAdmin,
          role: userRole.role,
          source: userRole.source
        });
        
        // customers 테이블에 사용자가 없으면 자동 생성
        if (userRole.source === 'default') {
          console.log('[OAuth 콜백] 새 사용자 등록 처리');
          setProcessingMessage("사용자 정보 등록 중...");
          
          const provider = session.user.app_metadata?.provider || "oauth";
          const registered = await registerNewUser(supabase, session.user, provider);
          
          if (registered) {
            console.log('[OAuth 콜백] 사용자 등록 완료');
            // 등록 후 권한 다시 확인 (캐시 갱신)
            const updatedRole = await getUserRole(supabase, session.user);
            console.log('[OAuth 콜백] 등록 후 권한 재확인:', updatedRole);
          } else {
            console.warn('[OAuth 콜백] 사용자 등록 실패했지만 계속 진행');
          }
        }
        
        // 이메일 인증을 통해 접근한 경우
        if (searchParams.get('type') === 'email_confirmation') {
          console.log('[OAuth 콜백] 이메일 인증 완료');
          setProcessingMessage("이메일 인증 완료! 리디렉션 중...");
        } else {
          setProcessingMessage(`${userRole.isAdmin ? '관리자' : '서비스'} 페이지로 이동 중...`);
        }
        
        // ✅ DB 기반 최종 리디렉션
        const targetPath = userRole.isAdmin ? '/admin/reservations' : '/service/pronto-b';
        console.log(`[OAuth 콜백] DB 기반 ${userRole.isAdmin ? '관리자' : '일반사용자'} 리디렉션: ${targetPath}`);
        
        // 약간의 지연 후 리디렉션 (사용자가 메시지를 볼 수 있도록)
        setTimeout(() => {
          safeRedirect(targetPath);
        }, 1000);
        
      } catch (error) {
        console.error('[OAuth 콜백] 처리 오류:', error);
        setProcessingMessage("오류가 발생했습니다. 서비스 페이지로 이동합니다...");
        
        setTimeout(() => {
          safeRedirect('/service/pronto-b');
        }, 2000);
      }
    };

    // 짧은 지연 후 실행 (DOM 렌더링 완료 대기)
    const timeoutId = setTimeout(() => {
      if (isMounted.current) {
        handleOAuthCallback();
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [router, searchParams, isRedirecting, supabase]);

  return (
    <div className="text-center mt-8">
      <div className="w-12 h-12 border-4 border-t-pronto-primary rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-pronto-primary font-medium">{processingMessage}</p>
    </div>
  );
}

// 로딩 상태를 표시하는 컴포넌트
function LoadingState() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">OAuth 로그인 처리 중...</h1>
      <p className="text-muted-foreground">잠시만 기다려주세요.</p>
      <div className="w-8 h-8 border-4 border-t-pronto-primary rounded-full animate-spin"></div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold text-pronto-primary">DB 기반 OAuth 로그인 처리</h1>
      <p className="text-muted-foreground">소셜 로그인 인증을 완료하고 있습니다...</p>
      
      <Suspense fallback={<LoadingState />}>
        <OAuthCallbackHandler />
      </Suspense>
      
      <div className="mt-8 text-xs text-gray-400 text-center max-w-md">
        <p>카카오, 네이버 로그인 또는 이메일 인증을 통해 접근하신 경우 DB 기반으로 자동 처리됩니다.</p>
        <p>문제가 지속되면 직접 로그인을 시도해보세요.</p>
      </div>
    </div>
  );
}