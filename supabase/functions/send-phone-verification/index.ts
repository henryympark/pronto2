// Follow this setup guide to integrate the Deno SDK with your Supabase project:
// https://docs.supabase.com/guides/functions/deno/connect-to-supabase
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS 처리
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    // 요청 본문에서 전화번호 추출
    const { phone } = await req.json();
    
    if (!phone || !/^01[0-9]{8,9}$/.test(phone)) {
      return new Response(
        JSON.stringify({ error: "유효한 휴대폰 번호가 아닙니다." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Supabase 클라이언트 생성
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // 6자리 랜덤 코드 생성
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 인증 코드 저장 (실제 구현에서는 Redis나 DB에 저장하는 것이 좋음)
    const { error: insertError } = await supabaseClient
      .from("phone_verifications")
      .insert({
        phone,
        code: verificationCode,
        expires_at: new Date(Date.now() + 3 * 60 * 1000).toISOString(), // 3분 후 만료
      })
      .select();
    
    if (insertError) {
      throw new Error("인증 코드 저장 중 오류가 발생했습니다.");
    }
    
    // 실제 SMS 발송 로직 (여기서는 모의 구현)
    // 실제 구현에서는 NHN Cloud, NaverCloud, AWS SNS 등의 SMS 서비스를 사용
    console.log(`[SMS 발송] 전화번호: ${phone}, 인증 코드: ${verificationCode}`);
    
    // 개발 환경에서는 로그로 확인할 수 있도록 코드를 응답에 포함
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "인증 코드가 발송되었습니다.",
        ...(isDevelopment && { code: verificationCode }), // 개발 환경에서만 코드 노출
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}); 