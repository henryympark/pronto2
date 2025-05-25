"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { getUserRole } from "@/domains/auth";

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = useSupabase();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdminAccess() {
      if (loading) return;
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      try {
        const userRole = await getUserRole(supabase, user);
        setIsAdmin(userRole.isAdmin);
        
        if (userRole.isAdmin === true) {
          // 관리자 확인됨 - 페이지 표시
          setIsLoading(false);
        } else {
          // 관리자 아님 - 메인 페이지로 리디렉션
          router.push('/');
        }
      } catch (error) {
        console.error('권한 확인 중 오류:', error);
        router.push('/');
      }
    }

    checkAdminAccess();
  }, [user, loading, router, supabase]);

  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-lg">권한을 확인하는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (isAdmin !== true) {
    return null; // 리디렉션 중
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">관리자 대시보드</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">예약 현황</h2>
          <p className="text-gray-600">오늘의 예약 현황을 확인하세요.</p>
          <button 
            onClick={() => router.push('/admin/reservations')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            예약 관리
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">서비스 관리</h2>
          <p className="text-gray-600">서비스 정보를 관리하세요.</p>
          <button 
            onClick={() => router.push('/admin/services')}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            서비스 관리
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">고객 관리</h2>
          <p className="text-gray-600">고객 정보를 관리하세요.</p>
          <button 
            onClick={() => router.push('/admin/customers')}
            className="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            고객 관리
          </button>
        </div>
      </div>
    </div>
  );
}