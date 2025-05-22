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
    // 요청 본문에서 전화번호와 인증 코드 추출
    const { phone, code } = await req.json();
    
    if (!phone || !/^01[0-9]{8,9}$/.test(phone)) {
      return new Response(
        JSON.stringify({ error: "유효한 휴대폰 번호가 아닙니다." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: "유효한 인증 코드가 아닙니다." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Supabase 클라이언트 생성
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // 인증 코드 검증
    const { data: verificationData, error: selectError } = await supabaseClient
      .from("phone_verifications")
      .select("*")
      .eq("phone", phone)
      .eq("code", code)
      .gt("expires_at", new Date().toISOString()) // 만료되지 않은 코드만 조회
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (selectError || !verificationData) {
      return new Response(
        JSON.stringify({ error: "유효하지 않거나 만료된 인증 코드입니다." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // 인증 성공 처리 - 인증 상태 업데이트
    const { error: updateError } = await supabaseClient
      .from("phone_verifications")
      .update({ verified: true })
      .eq("id", verificationData.id);
    
    if (updateError) {
      throw new Error("인증 상태 업데이트 중 오류가 발생했습니다.");
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "휴대폰 번호 인증이 완료되었습니다.",
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