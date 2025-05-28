"use client";

import { useEffect, useState } from "react";
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
  if (!authUser || !isAdmin) {
    return null;
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
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">리뷰 관리</h2>
          <p className="text-gray-600">고객 리뷰를 관리하세요.</p>
          <button 
            onClick={() => router.push('/admin/reviews')}
            className="mt-4 bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
          >
            리뷰 관리
          </button>
        </div>
      </div>
    </div>
  );
}