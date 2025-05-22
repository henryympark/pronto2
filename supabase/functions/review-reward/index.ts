import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 요청 타입 인터페이스
interface ReviewRewardRequest {
  customer_id: string;
  review_id?: string;
  reservation_id?: string;
}

// 응답 타입 인터페이스
interface ReviewRewardResponse {
  success: boolean;
  message: string;
  data?: {
    customer_id: string;
    review_id?: string;
    rewarded_minutes: number;
    accumulated_time_minutes: number;
    updated_at: string;
  };
  error?: string;
}

// 웹훅 페이로드 타입
interface WebhookPayload {
  event: string;
  customer_id: string;
  review_id?: string;
  reservation_id?: string;
  rewarded_minutes: number;
  accumulated_time_minutes: number;
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
const REWARD_MINUTES = 10; // 리뷰 작성 시 적립해줄 시간 (10분)

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
    const { customer_id, review_id, reservation_id } = await req.json() as ReviewRewardRequest;

    // 필수 파라미터 검증
    if (!customer_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required field: customer_id' 
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
      .select('id, accumulated_time_minutes, email, nickname')
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

    // 2. 트랜잭션으로 적립 시간 업데이트
    const newAccumulatedTime = (customerData.accumulated_time_minutes || 0) + REWARD_MINUTES;
    
    const { data: updatedCustomer, error: updateError } = await supabaseClient
      .from('customers')
      .update({ 
        accumulated_time_minutes: newAccumulatedTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', customer_id)
      .select('id, accumulated_time_minutes, updated_at')
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to update accumulated time: ${updateError.message}` 
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

    // 3. 웹훅 이벤트 페이로드 생성
    const timestamp = new Date().toISOString();
    const webhookPayload: WebhookPayload = {
      event: 'time.granted',
      customer_id,
      review_id,
      reservation_id,
      rewarded_minutes: REWARD_MINUTES,
      accumulated_time_minutes: newAccumulatedTime,
      timestamp
    };

    // 4. 웹훅 발송 (웹훅 URL이 환경 변수로 설정된 경우에만)
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

    // 5. 성공 응답 반환
    const response: ReviewRewardResponse = {
      success: true,
      message: `Successfully rewarded ${REWARD_MINUTES} minutes for review`,
      data: {
        customer_id,
        review_id,
        rewarded_minutes: REWARD_MINUTES,
        accumulated_time_minutes: newAccumulatedTime,
        updated_at: updatedCustomer?.updated_at || timestamp
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
        error: `Unexpected error: ${error.message}` 
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