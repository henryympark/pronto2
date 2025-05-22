import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 요청 타입 인터페이스
interface GrantCouponRequest {
  customer_id: string;
  admin_id: string;
  count?: number; // 부여할 쿠폰 개수 (기본값 1)
  minutes?: number; // 각 쿠폰의 시간 (기본값 30분)
  expires_at?: string; // 쿠폰 만료 시간 (선택 사항)
}

// 응답 타입 인터페이스
interface GrantCouponResponse {
  success: boolean;
  message: string;
  data?: {
    customer_id: string;
    admin_id: string;
    granted_coupons: {
      id: string;
      minutes: number;
      created_at: string;
      expires_at?: string;
    }[];
    total_count: number;
  };
  error?: string;
}

// 웹훅 페이로드 타입
interface WebhookPayload {
  event: string;
  customer_id: string;
  admin_id: string;
  granted_coupons: {
    id: string;
    minutes: number;
    created_at: string;
    expires_at?: string;
  }[];
  total_count: number;
  timestamp: string;
}

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

// 상수
const DEFAULT_COUPON_MINUTES = 30; // 기본 쿠폰 시간 (30분)
const DEFAULT_COUPON_COUNT = 1; // 기본 부여 개수

// Supabase Edge Function
Deno.serve(async (req: Request) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // POST 메서드 체크
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      }),
      { 
        status: 405, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }

  try {
    // 요청 바디 파싱
    const { 
      customer_id, 
      admin_id, 
      count = DEFAULT_COUPON_COUNT, 
      minutes = DEFAULT_COUPON_MINUTES,
      expires_at 
    } = await req.json() as GrantCouponRequest;

    // 필수 파라미터 검증
    if (!customer_id || !admin_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: customer_id and admin_id are required' 
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // 쿠폰 개수 유효성 검사
    const couponCount = Math.max(1, Math.min(10, count)); // 1~10개 사이로 제한
    if (couponCount !== count) {
      console.warn(`Adjusted coupon count from ${count} to ${couponCount} (limited to 1-10)`);
    }

    // Supabase 클라이언트 생성
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. 고객 존재 여부 확인
    const { data: customerData, error: customerError } = await supabaseClient
      .from('customers')
      .select('id, email, nickname')
      .eq('id', customer_id)
      .single();

    if (customerError || !customerData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: customerError?.message || 'Customer not found' 
        }),
        { 
          status: 404, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // 2. 관리자 존재 및 권한 확인
    const { data: adminData, error: adminError } = await supabaseClient
      .from('customers')
      .select('id, role')
      .eq('id', admin_id)
      .eq('role', 'admin')
      .single();

    if (adminError || !adminData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: adminError?.message || 'Admin not found or not authorized' 
        }),
        { 
          status: 403, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // 3. 다수의 쿠폰 생성 및 저장
    const couponsToInsert = Array.from({ length: couponCount }, () => ({
      customer_id,
      minutes,
      granted_by: admin_id,
      expires_at: expires_at || null,
      is_used: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: insertedCoupons, error: insertError } = await supabaseClient
      .from('customer_coupons')
      .insert(couponsToInsert)
      .select('id, customer_id, minutes, created_at, expires_at');

    if (insertError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to grant coupons: ${insertError.message}` 
        }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // 4. 웹훅 이벤트 페이로드 생성
    const timestamp = new Date().toISOString();
    const grantedCoupons = insertedCoupons.map(coupon => ({
      id: coupon.id,
      minutes: coupon.minutes,
      created_at: coupon.created_at,
      expires_at: coupon.expires_at
    }));

    const webhookPayload: WebhookPayload = {
      event: 'coupon.granted',
      customer_id,
      admin_id,
      granted_coupons: grantedCoupons,
      total_count: grantedCoupons.length,
      timestamp
    };

    // 5. 웹훅 발송 (웹훅 URL이 환경 변수로 설정된 경우에만)
    const webhookUrl = Deno.env.get('WEBHOOK_URL');
    if (webhookUrl) {
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': Deno.env.get('WEBHOOK_SECRET') || ''
          },
          body: JSON.stringify(webhookPayload)
        });

        if (!webhookResponse.ok) {
          console.error('Webhook delivery failed:', await webhookResponse.text());
        }
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }
    }

    // 6. 성공 응답 반환
    const response: GrantCouponResponse = {
      success: true,
      message: `Successfully granted ${grantedCoupons.length} coupons to customer`,
      data: {
        customer_id,
        admin_id,
        granted_coupons: grantedCoupons,
        total_count: grantedCoupons.length
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    // 예외 처리
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
}); 