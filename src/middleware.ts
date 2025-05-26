import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// 🔧 환경 변수 백업 처리 개선
const getSupabaseUrl = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://plercperpovsdoprkyow.supabase.co';
};

const getSupabaseAnonKey = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsZXJjcGVycG92c2RvcHJreW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MDgxMDgsImV4cCI6MjA2MjE4NDEwOH0.kwEENt9W15rNM1DMTznbhyB6RPObgY6YmwvUdTk6xUw';
};

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

// DB 기반 권한 체크 함수
async function checkUserRoleFromDB(supabase: any, userId: string): Promise<'admin' | 'customer' | null> {
  try {
    devLog('[미들웨어] DB 기반 권한 체크 시작', { userId });
    
    // 1차: customers 테이블에서 직접 조회
    const { data: customer, error } = await supabase
      .from('customers')
      .select('role')
      .eq('id', userId)
      .single();

    if (!error && customer) {
      devLog('[미들웨어] customers 테이블에서 권한 확인', { 
        userId, 
        role: customer.role 
      });
      return customer.role;
    }
    
    devLog('[미들웨어] customers 테이블 조회 실패', { 
      error: error?.message,
      code: error?.code
    });
    
    // 2차: RPC 함수로 백업 시도
    try {
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_customer_role', { user_id: userId });
        
      if (!roleError && roleData) {
        devLog('[미들웨어] RPC 함수에서 권한 확인', { 
          userId, 
          role: roleData 
        });
        return roleData;
      }
      
      devLog('[미들웨어] RPC 함수 호출 실패', { 
        error: roleError?.message 
      });
    } catch (rpcError) {
      devLog('[미들웨어] RPC 함수 호출 예외', { error: rpcError });
    }
    
    return null;
    
  } catch (error) {
    console.error('[미들웨어] DB 권한 체크 중 예외:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  // URL에서 경로 가져오기 (예: /admin/reservations -> /admin)
  const { pathname } = request.nextUrl;
  
  // 관리자 페이지 접근 시 권한 확인
  if (pathname.startsWith('/admin')) {
    devLog(`[미들웨어] 🔍 관리자 경로 접근 감지: ${pathname}`);
    
    // 🔧 환경 변수 디버깅
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();
    
    devLog('[미들웨어] 🔑 Supabase 설정 확인:', {
      hasUrl: !!supabaseUrl,
      urlLength: supabaseUrl?.length || 0,
      hasKey: !!supabaseAnonKey,
      keyLength: supabaseAnonKey?.length || 0,
      isBackupUrl: supabaseUrl?.includes('plercperpovsdoprkyow'),
    });
    
    // Next.js 응답 객체 생성 - 여기서 쿠키를 설정할 수 있음
    const response = NextResponse.next();
    
    // 🔍 디버깅을 위해 요청 시 가져온 모든 쿠키를 로깅
    const allCookies = request.cookies.getAll();
    const cookieNames = allCookies.map(cookie => cookie.name);
    devLog('[미들웨어] 🍪 요청에 포함된 모든 쿠키:', cookieNames);
    
    // 🔍 Supabase 관련 쿠키가 있는지 확인
    const supabaseCookies = allCookies.filter(cookie => 
      cookie.name.includes('supabase') || 
      cookie.name.includes('sb-')
    );
    if (supabaseCookies.length > 0) {
      devLog('[미들웨어] ✅ Supabase 관련 쿠키 발견:', 
        supabaseCookies.map(c => ({ name: c.name, valueLength: c.value?.length || 0 })));
    } else {
      devLog('[미들웨어] ❌ 요청에 Supabase 관련 쿠키가 없음');
    }

    // 🔧 안전한 Supabase 클라이언트 생성
    let supabase;
    try {
      supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            get(name) {
              const cookie = request.cookies.get(name);
              devLog(`[미들웨어] 🍪 쿠키 GET: ${name} = ${cookie?.value ? '존재' : '없음'}`);
              return cookie?.value;
            },
            set(name, value, options) {
              // 🔧 클라이언트와 동일한 옵션 적용
              devLog(`[미들웨어] 🍪 쿠키 SET: ${name}`, {
                valueLength: value?.length || 0,
                options: options || {}
              });
              
              // 🔧 클라이언트와 동일한 기본 옵션 설정
              const isLocalhost = request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1';
              
              const defaultOptions = {
                path: '/',
                maxAge: 60 * 60 * 24 * 365, // 1년
                // 🔧 클라이언트와 동일: localhost에서는 domain 설정 안함
                ...(isLocalhost ? {} : { domain: request.nextUrl.hostname }),
                secure: request.nextUrl.protocol === 'https:',
                sameSite: 'lax' as const, // 🔧 클라이언트와 동일: lax로 설정
                httpOnly: false // 🔧 클라이언트에서도 읽을 수 있도록
              };
              
              const finalOptions = { ...defaultOptions, ...options };
              
              // NextResponse.cookies에 쿠키 설정
              response.cookies.set({
                name,
                value,
                ...finalOptions,
              });
            },
            remove(name, options) {
              // 🔧 클라이언트와 동일한 삭제 로직
              devLog(`[미들웨어] 🍪 쿠키 REMOVE: ${name}`);
              
              const isLocalhost = request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1';
              
              const defaultOptions = {
                path: '/',
                ...(isLocalhost ? {} : { domain: request.nextUrl.hostname }),
              };
              
              const finalOptions = { ...defaultOptions, ...options };
              
              // NextResponse.cookies에서 쿠키 제거
              response.cookies.set({
                name,
                value: '',
                ...finalOptions,
                maxAge: 0,
              });
            },
          },
          auth: {
            // 🔧 클라이언트와 동일한 auth 설정
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false, // 서버사이드에서는 URL 감지 비활성화
            flowType: 'pkce',
            debug: process.env.NODE_ENV === 'development',
            storageKey: 'supabase.auth.token', // 🔧 클라이언트와 동일한 키
          },
          global: {
            headers: {
              'X-Client-Info': `pronto-web/1.0.0`,
              'X-Client-Platform': 'server',
            },
          }
        }
      );
      
      devLog('[미들웨어] ✅ Supabase 클라이언트 생성 성공');
      
    } catch (clientError) {
      console.error('[미들웨어] ❌ Supabase 클라이언트 생성 실패:', clientError);
      
      // 개발 환경에서는 접근 허용
      if (process.env.NODE_ENV === 'development') {
        console.log('[미들웨어] ⚠️ 개발 환경에서 Supabase 클라이언트 오류 발생. 접근을 허용합니다.');
        return response;
      }
      
      // 프로덕션에서는 로그인 페이지로 리디렉션
      const redirectUrl = new URL('/auth/login', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    try {
      // 🔍 세션 확인 전 상세 쿠키 분석
      devLog('[미들웨어] 🔑 세션 확인 시작');
      
      // 🔍 Supabase 관련 모든 쿠키 상세 분석
      const supabaseAuthCookies = allCookies.filter(cookie => 
        cookie.name.includes('supabase') || 
        cookie.name.includes('sb-') ||
        cookie.name === 'supabase.auth.token'
      );
      
      devLog('[미들웨어] 🔍 Supabase 인증 쿠키 상세 분석:', 
        supabaseAuthCookies.map(c => ({
          name: c.name,
          valueLength: c.value?.length || 0,
          valuePreview: c.value?.substring(0, 50) + '...' || 'empty'
        }))
      );
      
      // 세션 가져오기 (여기서 내부적으로 쿠키 처리가 이루어짐)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // 🔍 세션 에러 상세 분석
      if (sessionError) {
        console.error('[미들웨어] ❌ 세션 가져오기 오류:', {
          message: sessionError.message,
          name: sessionError.name,
          status: sessionError.status || 'unknown',
          details: sessionError
        });
      }
      
      // 🔍 세션 상태 상세 확인
      devLog('[미들웨어] 🔑 세션 상태 상세:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        email: session?.user?.email,
        expiresAt: session?.expires_at,
        tokenType: session?.token_type,
        accessTokenLength: session?.access_token?.length || 0,
        refreshTokenLength: session?.refresh_token?.length || 0
      });
      
      if (!session) {
        devLog('[미들웨어] ❌ 세션 없음 - 상세 진단:', {
          cookieCount: allCookies.length,
          supabaseCookieCount: supabaseAuthCookies.length,
          hasAuthToken: allCookies.some(c => c.name === 'supabase.auth.token'),
          requestUrl: request.url,
          userAgent: request.headers.get('user-agent')?.substring(0, 100)
        });
        
        // 응답 쿠키 확인 (디버깅 용)
        devLog('[미들웨어] 🍪 응답에 설정될 쿠키:', 
          Array.from(response.cookies.getAll()).map(c => ({ name: c.name, valueLength: c.value?.length || 0 })));
        
        // 로그인되지 않은 경우 로그인 페이지로 리디렉션
        const redirectUrl = new URL('/auth/login', request.url);
        redirectUrl.searchParams.set('redirect', pathname); // 🔧 리디렉션 후 돌아올 경로 저장
        const redirectResponse = NextResponse.redirect(redirectUrl);
        
        // 응답의 모든 쿠키를 리디렉션 응답으로 복사
        response.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie);
        });
        
        return redirectResponse;
      }

      devLog(`[미들웨어] ✅ 세션 확인됨, 사용자 ID: ${session.user?.id}`);
      
      // 서버로부터 안전하게 사용자 정보 가져오기 (보안 강화)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[미들웨어] ❌ 사용자 정보 가져오기 오류:', userError);
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
        console.log('[미들웨어] ❌ 사용자 정보 없음, 로그인 페이지로 리디렉션');
        const redirectUrl = new URL('/auth/login', request.url);
        const redirectResponse = NextResponse.redirect(redirectUrl);
        
        response.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie);
        });
        
        return redirectResponse;
      }
      
      devLog(`[미들웨어] ✅ 사용자 확인됨, 이메일: ${user.email}`);

      // DB 기반 권한 체크
      const userRole = await checkUserRoleFromDB(supabase, user.id);
      
      if (userRole === 'admin') {
        devLog('[미들웨어] ✅ DB에서 관리자 권한 확인됨', { 
          userId: user.id, 
          email: user.email 
        });
        devLog(`[미들웨어] 🎉 관리자 접근 허용: ${pathname}`);
        return response; // 어드민이면 접근 허용
      }
      
      // 개발 환경에서는 DB 오류가 있어도 접근 허용 (개발 편의성)
      if (process.env.NODE_ENV === 'development' && userRole === null) {
        console.log('[미들웨어] ⚠️ 개발 환경에서 DB 권한 체크 실패. 접근을 허용합니다.');
        return response;
      }
      
      devLog('[미들웨어] ❌ 관리자 권한 없음, 홈페이지로 리디렉션', { 
        userId: user.id, 
        role: userRole || 'unknown' 
      });
      
      // 관리자가 아닌 경우 홈페이지로 리디렉션
      const redirectUrl = new URL('/', request.url);
      const redirectResponse = NextResponse.redirect(redirectUrl);
      
      // 응답의 모든 쿠키를 리디렉션 응답으로 복사
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie);
      });
      
      return redirectResponse;
      
    } catch (error) {
      console.error('[미들웨어] ❌ 인증 확인 오류:', error);
      
      // 개발 환경일 때는 오류가 있어도 접근 허용 - 개발 편의성
      if (process.env.NODE_ENV === 'development') {
        console.log('[미들웨어] ⚠️ 개발 환경에서 인증 오류 발생. 접근을 허용합니다.');
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
};