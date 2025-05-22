"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LucideIcon, LayoutDashboard, Calendar, Settings, Users, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient$ } from "@/lib/supabase";

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

type SidebarItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

const sidebarItems: SidebarItem[] = [
  {
    name: "예약 현황",
    href: "/admin/reservations",
    icon: Calendar,
  },
  {
    name: "서비스 관리",
    href: "/admin/services",
    icon: Settings,
  },
  {
    name: "고객 관리",
    href: "/admin/customers",
    icon: Users,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading, isAdmin } = useAuth();
  const [isAdminChecked, setIsAdminChecked] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authCheckCompleted = useRef(false);
  const authCheckInProgress = useRef(false);

  // 사용자 권한 확인
  useEffect(() => {
    devLog('[어드민 레이아웃] 마운트됨. AuthContext 상태:', {
      loading,
      isAdmin,
      userId: user?.id,
      email: user?.email
    });
    
    // 이미 AuthContext에서 관리자 권한이 확인된 경우 추가 검증 불필요
    if (isAdmin === true) {
      devLog('[어드민 레이아웃] AuthContext에서 이미 어드민 권한 확인됨');
      setIsAdminChecked(true);
      setIsLoading(false);
      return;
    }
    
    // 이미 관리자가 아닌 것이 확인된 경우 권한 없음 
    if (isAdmin === false) {
      devLog('[어드민 레이아웃] AuthContext에서 이미 관리자 아님이 확인됨');
      setIsAdminChecked(false);
      setIsLoading(false);
      window.location.href = '/';
      return;
    }
    
    // loading 상태일 때는 대기
    if (loading) {
      devLog('[어드민 레이아웃] AuthContext 로딩 중...');
      return;
    }

    // 이미 권한 확인이 완료되었거나 진행 중인 경우 중복 실행 방지
    if (authCheckCompleted.current || authCheckInProgress.current) {
      devLog('[어드민 레이아웃] 중복 권한 확인 건너뜀:', {
        completed: authCheckCompleted.current,
        inProgress: authCheckInProgress.current
      });
      return;
    }
    
    async function checkAdminAccess() {
      devLog('[어드민 레이아웃] 권한 확인 시작');
      authCheckInProgress.current = true;
      
      // 로그인되지 않은 경우
      if (!user) {
        devLog('[어드민 레이아웃] 로그인된 사용자 없음');
        authCheckCompleted.current = true;
        authCheckInProgress.current = false;
        setIsAdminChecked(false);
        setIsLoading(false);
        window.location.href = '/auth/login';
        return;
      }

      try {
        devLog('[어드민 레이아웃] 사용자 정보:', {
          id: user.id,
          email: user.email
        });
        
        // 미들웨어를 통과했다면 기본적으로 어드민일 가능성이 높음
        // 하지만 추가 검증을 위해 동일한 검사 로직 사용
        
        // 알려진 어드민 이메일 확인
        const adminEmails = ['admin@pronto.com', 'henry.ympark@gmail.com'];
        if (user.email && adminEmails.includes(user.email.toLowerCase())) {
          devLog('[어드민 레이아웃] 알려진 어드민 이메일 확인됨:', user.email);
          authCheckCompleted.current = true;
          authCheckInProgress.current = false;
          setIsAdminChecked(true);
          setIsLoading(false);
          return;
        }
        
        // 수퍼베이스 클라이언트
        const supabase = createClient$();
        
        // RPC로 역할 확인
        try {
          devLog('[어드민 레이아웃] get_customer_role RPC 함수 호출');
          const { data: roleData, error: roleError } = await supabase
            .rpc('get_customer_role', { user_id: user.id });
            
          // RPC 함수가 존재하고 정상 호출된 경우
          if (!roleError && roleData === 'admin') {
            devLog('[어드민 레이아웃] RPC에서 관리자 권한 확인됨');
            authCheckCompleted.current = true;
            authCheckInProgress.current = false;
            setIsAdminChecked(true);
            setIsLoading(false);
            return;
          }
          
          devLog('[어드민 레이아웃] RPC 결과:', { roleData, hasError: !!roleError });
        } catch (rpcError) {
          console.error('[어드민 레이아웃] RPC 호출 중 예외 발생:', rpcError);
        }
        
        // customers 테이블 직접 확인
        try {
          devLog('[어드민 레이아웃] customers 테이블 조회');
          const { data: customerData, error: customerError } = await supabase
            .from("customers")
            .select("role")
            .eq("id", user.id)
            .single();
          
          // 고객 테이블에서 관리자 확인
          if (!customerError && customerData && customerData.role === 'admin') {
            devLog('[어드민 레이아웃] customers 테이블에서 관리자 권한 확인됨');
            authCheckCompleted.current = true;
            authCheckInProgress.current = false;
            setIsAdminChecked(true);
            setIsLoading(false);
            return;
          }
          
          devLog('[어드민 레이아웃] customers 테이블 결과:', { 
            role: customerData?.role, 
            hasError: !!customerError 
          });
          
          // 테이블이 없는 경우 개발 환경에서는 접근 허용 (개발 편의성)
          // 주의: 이 코드는 개발 환경에서만 사용됨. 프로덕션 배포 시 customers 테이블이 반드시 필요함
          if (process.env.NODE_ENV === 'development' && 
              (customerError?.code === 'PGRST116' || customerError?.message?.includes('does not exist'))) {
            console.log('[어드민 레이아웃] 개발 환경에서 customers 테이블이 없습니다. 접근을 허용합니다.');
            authCheckCompleted.current = true;
            authCheckInProgress.current = false;
            setIsAdminChecked(true);
            setIsLoading(false);
            return;
          }
        } catch (tableError) {
          console.error('[어드민 레이아웃] customers 테이블 조회 중 예외 발생:', tableError);
        }
        
        // 미들웨어를 통과했음에도 권한 확인 실패 - 개발 환경에서는 접근 허용
        // 주의: 이 코드는 개발 단계에서만 사용됨. 프로덕션 배포 전에 검토 필요
        if (process.env.NODE_ENV === 'development') {
          console.log('[어드민 레이아웃] 개발 환경에서 접근을 허용합니다.');
          authCheckCompleted.current = true; 
          authCheckInProgress.current = false;
          setIsAdminChecked(true);
          setIsLoading(false);
          return;
        }
        
        // 어드민이 아닌 경우 홈으로 리디렉션
        devLog('[어드민 레이아웃] 관리자 권한 없음, 홈페이지로 이동');
        authCheckCompleted.current = true;
        authCheckInProgress.current = false;
        setIsAdminChecked(false);
        setIsLoading(false);
        window.location.href = '/';
      } catch (error) {
        console.error('[어드민 레이아웃] 권한 확인 중 예외 발생:', error);
        
        // 개발 환경에서는 예외가 발생해도 접근 허용
        // 주의: 이 코드는 개발 단계에서만 사용됨. 프로덕션에서는 권한 오류 시 접근 차단
        if (process.env.NODE_ENV === 'development') {
          console.log('[어드민 레이아웃] 개발 환경에서 예외 발생. 접근을 허용합니다.');
          authCheckCompleted.current = true;
          authCheckInProgress.current = false;
          setIsAdminChecked(true);
          setIsLoading(false);
          return;
        }
        
        authCheckCompleted.current = true;
        authCheckInProgress.current = false;
        setIsAdminChecked(false);
        setIsLoading(false);
        alert('권한 확인 중 오류가 발생했습니다.');
        window.location.href = '/';
      }
    }

    // 로딩이 완료되었고 권한 체크가 아직 완료되지 않았으며 체크가 진행 중이 아닐 때만 실행
    if (!loading && !authCheckCompleted.current && !authCheckInProgress.current) {
      devLog('[어드민 레이아웃] 권한 확인 함수 호출');
      checkAdminAccess();
    }
  }, [user, loading, isAdmin]);

  // 로딩 중이거나 권한 확인 중일 때 로딩 화면 표시
  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-pronto-primary rounded-full animate-spin mb-4"></div>
          <p className="text-lg">권한을 확인하는 중입니다...</p>
          <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  // 관리자가 아닌 경우 (리디렉션 전에 잠시 보여줄 메시지)
  if (!isAdminChecked) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* 사이드바 */}
      <aside className="w-64 bg-gray-900 text-white">
        <div className="p-4 border-b border-gray-800">
          <Link href="/admin/reservations" className="flex items-center space-x-2">
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-lg font-bold">프론토 관리자</span>
          </Link>
        </div>
        <nav className="mt-6 px-4">
          <ul className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-pronto-primary text-white"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-8 border-t border-gray-800 pt-4">
            <Link
              href="/"
              className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>메인으로 이동</span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 bg-gray-100 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
} 