"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient$ } from '@/lib/supabase';

export default function AdminPage() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();
  const supabase = createClient$();

  useEffect(() => {
    console.log("[어드민 루트] 권한 확인 시작", { 
      loading, 
      userId: user?.id,
      email: user?.email,
      isAdmin 
    });
    
    async function checkAdminAndRedirect() {
      // 로딩 중이면 대기
      if (loading) {
        console.log("[어드민 루트] AuthContext 로딩 중");
        return;
      }
      
      // 로그인하지 않은 경우
      if (!user) {
        console.log("[어드민 루트] 로그인되지 않음, 로그인 페이지로 리디렉션");
        router.push('/auth/login');
        return;
      }

      // isAdmin 값이 이미 있는 경우 (AuthContext에서 설정됨)
      if (isAdmin === true) {
        console.log("[어드민 루트] AuthContext에서 어드민 권한 확인됨, 예약 페이지로 이동");
        router.push('/admin/reservations');
        return;
      }
      
      // isAdmin이 false인 경우 추가 검사 없이 홈으로 리디렉션
      if (isAdmin === false) {
        console.log("[어드민 루트] 관리자 권한 없음, 홈으로 리디렉션");
        router.push('/');
        return;
      }
      
      // isAdmin이 null인 경우만 직접 확인
      try {
        console.log("[어드민 루트] isAdmin 값이 null, 직접 권한 확인");
        
        // 1. 알려진 어드민 이메일 확인
        const adminEmails = ['admin@pronto.com', 'henry.ympark@gmail.com'];
        if (user.email && adminEmails.includes(user.email.toLowerCase())) {
          console.log("[어드민 루트] 알려진 어드민 이메일 확인됨:", user.email);
          router.push('/admin/reservations');
          return;
        }
        
        // 2. RPC로 권한 확인
        console.log("[어드민 루트] RPC 권한 확인 시작");
        const { data: roleData, error: roleError } = await supabase
          .rpc('get_customer_role', { user_id: user.id });
          
        if (!roleError && roleData === 'admin') {
          console.log("[어드민 루트] RPC에서 관리자 권한 확인됨");
          router.push('/admin/reservations');
          return;
        }
        
        // 3. customers 테이블에서 직접 확인
        console.log("[어드민 루트] customers 테이블에서 직접 확인");
        const { data: customer, error } = await supabase
          .from('customers')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!error && customer && customer.role === 'admin') {
          console.log("[어드민 루트] customers 테이블에서 관리자 권한 확인됨");
          router.push('/admin/reservations');
          return;
        }
        
        console.log("[어드민 루트] 모든 권한 확인 실패, 관리자 아님");
        alert('관리자 권한이 필요합니다.');
        router.push('/');
      } catch (error) {
        console.error("[어드민 루트] 권한 확인 중 오류:", error);
        alert('권한 확인 중 오류가 발생했습니다.');
        router.push('/');
      }
    }

    checkAdminAndRedirect();
  }, [user, loading, isAdmin, router, supabase]);

  // 로딩 인디케이터 표시
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-t-pronto-primary rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg mb-2">어드민 페이지로 이동 중...</p>
        <p className="text-sm text-gray-500">잠시만 기다려주세요</p>
      </div>
    </div>
  );
} 