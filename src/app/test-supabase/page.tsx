"use client";

import { useSupabase } from "@/contexts/SupabaseContext";
import { useEffect } from "react";

export default function TestSupabasePage() {
  // useSupabase 훅을 사용하여 Supabase 클라이언트 인스턴스를 가져옵니다.
  const supabase = useSupabase();

  useEffect(() => {
    console.log("[TestSupabasePage] Supabase 인스턴스 접근:", supabase);
    
    // 기본적인 Supabase 함수 호출 테스트
    async function testSupabase() {
      const { data, error } = await supabase.auth.getSession();
      console.log("[TestSupabasePage] 세션 데이터:", data);
    }
    
    testSupabase();
  }, [supabase]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Supabase 싱글톤 테스트</h1>
      <p>브라우저 콘솔을 열어 로그를 확인하세요.</p>
      <p>
        <strong>확인 포인트:</strong>
        <ul className="list-disc pl-6 mt-2">
          <li>[SupabaseProvider] 클라이언트 인스턴스 생성 (useMemo) - 최초 1회만 표시되어야 함</li>
          <li>Multiple GoTrueClient instances detected 경고가 없어야 함</li>
        </ul>
      </p>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded"
        onClick={() => {
          console.log("[버튼 클릭] 동일한 Supabase 인스턴스 재사용:", supabase);
        }}
      >
        Supabase 인스턴스 로그
      </button>
    </div>
  );
} 