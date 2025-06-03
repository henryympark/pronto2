"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminPage() {
  const router = useRouter();
  const { authUser, isAdmin, loading } = useAuth();

  useEffect(() => {
    // AuthContext 로딩이 완료된 후에만 권한 확인
    if (loading) return;
    
    if (!authUser) {
      router.push('/auth/login');
      return;
    }

    if (!isAdmin) {
      // 관리자가 아닌 경우 메인 페이지로 리디렉션
      router.push('/');
      return;
    }

    // 관리자인 경우 대시보드로 리다이렉트
    router.push('/admin/dashboard');
  }, [authUser, isAdmin, loading, router]);

  // AuthContext 로딩 중이거나 권한 확인 중일 때만 로딩 표시
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-lg">권한을 확인하는 중입니다...</p>
        </div>
      </div>
    );
  }

  // 권한이 없는 경우 리디렉션 중
  return null;
}