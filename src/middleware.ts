import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// 개발 환경에서만 로그를 출력하는 유틸리티 함수
const devLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

export async function middleware(request: NextRequest) {
  // URL에서 경로 가져오기 (예: /admin/reservations -> /admin)
  const { pathname } = request.nextUrl;
  
  // 관리자 페이지 접근 시 권한 확인
  if (pathname.startsWith('/admin')) {
    devLog(`[미들웨어] 관리자 경로 접근 감지: ${pathname}`);
    
    // Next.js 응답 객체 생성 - 여기서 쿠키를 설정할 수 있음
    const response = NextResponse.next();
    
    // 디버깅을 위해 요청 시 가져온 모든 쿠키를 로깅
    const allCookies = request.cookies.getAll();
    const cookieNames = allCookies.map(cookie => cookie.name);
    devLog('[미들웨어] 요청에 포함된 쿠키:', cookieNames);
    
    // Supabase 관련 쿠키가 있는지 확인
    const supabaseCookies = allCookies.filter(cookie => 
      cookie.name.includes('supabase') || 
      cookie.name.includes('sb-')
    );
    if (supabaseCookies.length > 0) {
      devLog('[미들웨어] Supabase 관련 쿠키 발견:', 
        supabaseCookies.map(c => c.name));
    } else {
      devLog('[미들웨어] 요청에 Supabase 관련 쿠키가 없음');
    }

    // Supabase 클라이언트 생성 - @supabase/ssr 최신 권장 방식 적용
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            const cookie = request.cookies.get(name);
            return cookie?.value;
          },
          set(name, value, options) {
            // 디버깅용 로그
            if (process.env.NODE_ENV === 'development' && (name.includes('sb-') || name.includes('supabase'))) {
              console.log(`[미들웨어] 쿠키 설정: ${name}`);
            }
            
            // NextResponse.cookies에 쿠키 설정
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name, options) {
            // 디버깅용 로그
            if (process.env.NODE_ENV === 'development' && (name.includes('sb-') || name.includes('supabase'))) {
              console.log(`[미들웨어] 쿠키 제거: ${name}`);
            }
            
            // NextResponse.cookies에서 쿠키 제거
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
            });
          },
        },
      }
    );

    try {
      // 세션 확인 전에 추가 로깅
      devLog('[미들웨어] 세션 확인 시작');
      
      // 세션 가져오기 (여기서 내부적으로 쿠키 처리가 이루어짐)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // 세션 에러 확인 (디버깅 용)
      if (sessionError) {
        console.error('[미들웨어] 세션 가져오기 오류:', sessionError);
      }
      
      if (!session) {
        devLog('[미들웨어] 세션 없음, 로그인 페이지로 리디렉션');
        
        // 응답 쿠키 확인 (디버깅 용)
        devLog('[미들웨어] 응답에 설정될 쿠키:', 
          Array.from(response.cookies.getAll()).map(c => c.name));
        
        // 로그인되지 않은 경우 로그인 페이지로 리디렉션
        const redirectUrl = new URL('/auth/login', request.url);
        const redirectResponse = NextResponse.redirect(redirectUrl);
        
        // 응답의 모든 쿠키를 리디렉션 응답으로 복사
        response.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie);
        });
        
        return redirectResponse;
      }

      devLog(`[미들웨어] 세션 확인됨, 사용자 ID: ${session.user?.id}`);
      
      // 서버로부터 안전하게 사용자 정보 가져오기 (보안 강화)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[미들웨어] 사용자 정보 가져오기 오류:', userError);
        // 사용자 정보 검증 실패시 로그인 페이지로 리디렉션
        const redirectUrl = new URL('/auth/login', request.url);
        const redirectResponse = NextResponse.redirect(redirectUrl);
        
        response.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie);
        });
        
        return redirectResponse;
      }

      // 사용자 정보 null 체크 추가
      if (!user) {
        console.log('[미들웨어] 사용자 정보 없음, 로그인 페이지로 리디렉션');
        const redirectUrl = new URL('/auth/login', request.url);
        const redirectResponse = NextResponse.redirect(redirectUrl);
        
        response.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie);
        });
        
        return redirectResponse;
      }
      
      devLog(`[미들웨어] 사용자 확인됨, 이메일: ${user.email}`);

      // 1. 알려진 어드민 이메일 목록 - AuthContext와 일관성 유지
      const adminEmails = ['admin@pronto.com', 'henry.ympark@gmail.com'];
      if (user.email && adminEmails.includes(user.email.toLowerCase())) {
        devLog('[미들웨어] 알려진 어드민 이메일 확인됨:', user.email);
        return response; // 어드민 이메일이면 접근 허용
      }

      // 2. 사용자 역할 확인 - 더 안정적으로 처리
      try {
        devLog('[미들웨어] 사용자 역할 확인 시작');
        
        // 먼저 RPC 함수로 확인 시도 - 더 신뢰할 수 있는 방법
        const { data: roleData, error: roleError } = await supabase
          .rpc('get_customer_role', { user_id: user.id });
          
        devLog('[미들웨어] RPC 결과:', { roleData, hasError: !!roleError });
          
        if (!roleError && roleData === 'admin') {
          devLog('[미들웨어] RPC에서 관리자 권한 확인됨');
          return response; // 어드민 역할이면 접근 허용
        }
        
        // RPC가 실패하면 직접 테이블 쿼리로 시도
        devLog('[미들웨어] customers 테이블 직접 확인 시도');
        const { data: customer, error } = await supabase
          .from('customers')
          .select('role')
          .eq('id', user.id)
          .single();

        devLog('[미들웨어] customers 쿼리 결과:', { 
          role: customer?.role, 
          hasError: !!error,
          errorMessage: error?.message
        });

        if (!error && customer && customer.role === 'admin') {
          devLog('[미들웨어] customers 테이블에서 관리자 권한 확인됨');
          return response; // 어드민 역할이면 접근 허용
        }
        
        // 개발 환경에서는 테이블이 없는 경우에도 접근 허용 (개발 편의성)
        // 주의: 이 코드는 개발 환경에서만 사용됨. 프로덕션에서는 적절한 데이터베이스 설정 필요
        if (process.env.NODE_ENV === 'development' && error?.code === 'PGRST116') {
          console.log('[미들웨어] 개발 환경에서 customers 테이블이 없습니다. 접근을 허용합니다.');
          return response;
        }
        
        devLog('[미들웨어] 관리자 권한 없음, 홈페이지로 리디렉션');
        // 관리자가 아닌 경우 홈페이지로 리디렉션
        const redirectUrl = new URL('/', request.url);
        const redirectResponse = NextResponse.redirect(redirectUrl);
        
        // 응답의 모든 쿠키를 리디렉션 응답으로 복사
        response.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie);
        });
        
        return redirectResponse;
      } catch (roleCheckError) {
        console.error('[미들웨어] 역할 확인 중 오류:', roleCheckError);
        
        // 개발 환경일 때는 오류가 있어도 접근 허용 - 개발 편의성
        // 주의: 이 코드는 개발 환경에서만 사용됨. 프로덕션에서는 역할 확인 오류 시 접근 차단
        if (process.env.NODE_ENV === 'development') {
          console.log('[미들웨어] 개발 환경에서 역할 확인 오류 발생. 접근을 허용합니다.');
          return response;
        }
        
        // 프로덕션 환경에서는 홈으로 리디렉션
        const redirectUrl = new URL('/', request.url);
        const redirectResponse = NextResponse.redirect(redirectUrl);
        
        // 응답의 모든 쿠키를 리디렉션 응답으로 복사
        response.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie);
        });
        
        return redirectResponse;
      }
    } catch (error) {
      console.error('[미들웨어] 인증 확인 오류:', error);
      
      // 개발 환경일 때는 오류가 있어도 접근 허용 - 개발 편의성
      // 주의: 이 코드는 개발 환경에서만 사용됨. 프로덕션에서는 인증 오류 시 접근 차단
      if (process.env.NODE_ENV === 'development') {
        console.log('[미들웨어] 개발 환경에서 인증 오류 발생. 접근을 허용합니다.');
        return response;
      }
      
      // 오류 발생 시 로그인 페이지로 리디렉션
      const redirectUrl = new URL('/auth/login', request.url);
      const redirectResponse = NextResponse.redirect(redirectUrl);
      
      // 응답의 모든 쿠키를 리디렉션 응답으로 복사
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie);
      });
      
      return redirectResponse;
    }
  }
  
  return NextResponse.next();
}

export const config = {
  // 미들웨어를 적용할 경로 패턴 지정
  matcher: ['/admin/:path*'],
}