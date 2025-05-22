/**
 * @deprecated 이 파일은 더 이상 사용하지 않습니다.
 * 대신 직접 contexts/SupabaseContext.tsx의 useSupabase() 훅을 가져와 사용하세요.
 * 예시: `const supabase = useSupabase();`
 */

// import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseClient } from "../supabase";

// 싱글톤 패턴을 사용하는 getSupabaseClient를 일관되게 사용
export function createClient() {
  // 클라이언트 사이드에서 호출될 경우 경고
  if (typeof window !== 'undefined') {
    console.error(
      '[오류] lib/supabase/client.ts의 createClient()는 더 이상 사용되지 않습니다. ' +
      '대신 contexts/SupabaseContext.tsx의 useSupabase() 훅을 직접 가져와 사용하세요.'
    );
  }
  
  throw new Error(
    'createClient()는 더 이상 지원되지 않습니다. ' +
    '클라이언트 컴포넌트에서는 useSupabase() 훅을 사용하세요.'
  );
}
