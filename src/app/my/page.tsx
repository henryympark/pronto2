"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function MyPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // 로그아웃 처리 함수
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("로그아웃 에러:", error);
      toast.error("로그아웃 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setIsLoading(false);
  }, [user, loading, router]);

  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">마이페이지</h1>
          <button 
            onClick={handleSignOut}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            로그아웃
          </button>
        </div>
        
        <div className="text-center py-10">
          <p className="text-lg">마이페이지 기본 레이아웃</p>
          <p className="text-sm text-gray-500 mt-2">
            사용자: {user.email}
          </p>
        </div>
      </div>
    </div>
  );
}
