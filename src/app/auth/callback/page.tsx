"use client";

import { useEffect, Suspense, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabase } from "@/contexts/SupabaseContext";

// 실제 인증 콜백 처리를 담당하는 컴포넌트
function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 렌더링 완료 추적을 위한 ref와 state
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isMounted = useRef(true);
  // useSupabase 훅을 사용하여 단일 Supabase 인스턴스 사용
  const supabase = useSupabase();
  
  // 안정적인 리디렉션 함수 - 단순화된 버전
  const safeRedirect = (path: string) => {
    console.log(`[리디렉션] 경로로 이동 시작: ${path}`);
    setIsRedirecting(true);
    
    try {
      // 직접 이동 - 가장 안정적인 방법
      console.log(`[리디렉션] window.location.href 사용: ${path}`);
      window.location.href = path;
    } catch (error) {
      console.error('[리디렉션 예외 발생]', error);
      // 오류 발생해도 계속 시도
      window.location.href = path;
    }
  };
  
  // 컴포넌트 마운트/언마운트 감지
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  useEffect(() => {
    // 이미 리디렉션 중이면 중복 실행 방지
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
        console.log("[디버깅] 로그인한 사용자 정보:", {
          id: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider
        });
        
        // customers 테이블에서 사용자 조회
        const { data: customer, error: customerError } = await supabase
          .from("customers")
          .select("*")
          .eq("id", session.user.id)
          .single();
        
        console.log("[디버깅] customers 테이블 조회 결과:", { 
          customer: customer ? { ...customer, created_at: undefined, updated_at: undefined } : null,
          error: customerError ? customerError.message : null 
        });
        
        if (customer) {
          console.log("[디버깅] customer.role 값:", customer.role);
          console.log("[디버깅] 'admin'과 일치 여부:", customer.role === 'admin');
          console.log("[디버깅] typeof customer.role:", typeof customer.role);
          
          // 역할값이 있는 경우 소문자 및 공백 처리
          const userRole = customer.role ? customer.role.toLowerCase().trim() : '';
          console.log("[디버깅] 정규화된 사용자 역할:", userRole);
        }
        
        // 사용자가 존재하지 않으면 새로 생성
        if (customerError || !customer) {
          // OAuth provider 확인 (kakao, naver 등)
          const provider = session.user.app_metadata?.provider || "unknown";
          
          // 새 고객 정보 생성
          const { error: insertError } = await supabase
            .from("customers")
            .insert({
              id: session.user.id,
              email: session.user.email,
              role: 'customer',
              auth_provider: provider || 'unknown',
            });
            
          if (insertError) {
            console.error("새 사용자 등록 오류:", insertError);
            safeRedirect("/auth/login?error=register");
            return;
          }
          
          // 새로 등록된 사용자는 일반 고객으로 서비스 페이지로 리디렉션
          console.log("신규 사용자 등록 완료, 서비스 페이지로 리디렉션");
          safeRedirect("/service/pronto-b");
          return;
        }
        
        // 이메일 인증을 통해 접근한 경우, 계정 활성화 처리
        if (isEmailConfirmation && customer.auth_provider === 'email') {
          // 계정 활성화 처리는 더 이상 필요하지 않음
          console.log('이메일 인증 완료');
        }
        
        // 고객 역할에 따라 적절한 페이지로 리디렉션
        // 대소문자 구분 없이 비교를 위해 소문자 변환 및 공백 제거
        const normalizedRole = customer.role ? customer.role.toLowerCase().trim() : '';
        
        if (normalizedRole === "admin") {
          // 관리자인 경우 관리자 페이지로 리디렉션
          console.log('[디버깅] 관리자 계정 확인됨, 관리자 페이지로 이동 시작');
          
          // 어드민 계정 데이터 정합성 확인
          try {
            // 관리자 역할이 정확히 'admin'으로 설정되도록 업데이트
            const { error: updateError } = await supabase
              .from('customers')
              .update({ role: 'admin' })
              .eq("id", session.user.id);
              
            if (updateError) {
              console.warn('[디버깅] 관리자 역할 업데이트 실패', updateError);
            } else {
              console.log('[디버깅] 관리자 역할 업데이트 성공');
            }
          } catch (updateError) {
            console.error('[디버깅] 역할 업데이트 예외', updateError);
            // 이 오류는 무시하고 계속 진행
          }
          
          safeRedirect("/admin/reservations");
        } else {
          // 일반 사용자인 경우 서비스 페이지로 리디렉션
          console.log('일반 사용자 계정 확인됨, 서비스 페이지로 이동');
          safeRedirect("/service/pronto-b");
        }
      } catch (error) {
        console.error("인증 콜백 처리 오류:", error);
        safeRedirect("/auth/login?error=unknown");
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
      {/* 로딩 상태 표시 */}
      <div className="w-8 h-8 border-4 border-t-pronto-primary rounded-full animate-spin"></div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">로그인 처리 중...</h1>
      <p className="text-muted-foreground">잠시만 기다려주세요.</p>
      {/* 로딩 상태 표시 */}
      <div className="w-8 h-8 border-4 border-t-pronto-primary rounded-full animate-spin"></div>
      
      <Suspense fallback={<LoadingState />}>
        <AuthCallbackHandler />
      </Suspense>
    </div>
  );
} 