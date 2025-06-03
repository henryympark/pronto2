import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 요청 타입 인터페이스
interface ReviewRewardRequest {
  customer_id: string;
  review_id?: string;
  reservation_id?: string;
  reward_minutes: number;
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
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-client-info, apikey',
  'Access-Control-Max-Age': '86400',
};

// Supabase Edge Function
Deno.serve(async (req: Request) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // POST 메서드 체크
  if (req.method !== 'POST') {
    console.error('[review-reward] Method not allowed:', req.method);
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
    console.log('[review-reward] Function started - Headers:', {
      authorization: req.headers.get('Authorization') ? 'Present' : 'Missing',
      contentType: req.headers.get('Content-Type'),
      userAgent: req.headers.get('User-Agent')?.slice(0, 50) + '...'
    });
    
    // 요청 바디 파싱
    let requestBody: ReviewRewardRequest;
    try {
      requestBody = await req.json() as ReviewRewardRequest;
      console.log('[review-reward] Request body parsed:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('[review-reward] Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body' 
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
    
    const { customer_id, review_id, reservation_id, reward_minutes } = requestBody;

    // 필수 파라미터 검증
    if (!customer_id || !reward_minutes) {
      console.error('[review-reward] Missing required fields:', { 
        customer_id: !!customer_id, 
        reward_minutes: !!reward_minutes,
        received_fields: Object.keys(requestBody)
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: customer_id and reward_minutes' 
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

    console.log('[review-reward] Creating Supabase client');
    
    // Supabase 클라이언트 생성 (Service Role 사용)
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

    console.log('[review-reward] Fetching customer data for ID:', customer_id);
    
    // 1. 고객 존재 여부 확인
    const { data: customerData, error: customerError } = await supabaseClient
      .from('customers')
      .select('id, accumulated_time_minutes, email, nickname')
      .eq('id', customer_id)
      .single();

    if (customerError) {
      console.error('[review-reward] Customer fetch error:', {
        message: customerError.message,
        code: customerError.code,
        details: customerError.details,
        hint: customerError.hint
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Customer lookup failed: ${customerError.message}` 
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

    if (!customerData) {
      console.error('[review-reward] Customer not found for ID:', customer_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Customer not found' 
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

    console.log('[review-reward] Customer found:', { 
      id: customerData.id, 
      email: customerData.email,
      current_time: customerData.accumulated_time_minutes 
    });

    // 2. 적립 시간 업데이트
    const currentTime = customerData.accumulated_time_minutes || 0;
    const newAccumulatedTime = currentTime + reward_minutes;
    
    console.log('[review-reward] Updating accumulated time:', { 
      current: currentTime,
      reward: reward_minutes,
      new_total: newAccumulatedTime
    });
    
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
      console.error('[review-reward] Update failed:', {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint
      });
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

    console.log('[review-reward] Update successful:', {
      customer_id: updatedCustomer?.id,
      new_time: updatedCustomer?.accumulated_time_minutes,
      updated_at: updatedCustomer?.updated_at
    });

    // 3. 웹훅 이벤트 페이로드 생성
    const timestamp = new Date().toISOString();
    const webhookPayload: WebhookPayload = {
      event: 'time.granted',
      customer_id,
      review_id,
      reservation_id,
      rewarded_minutes: reward_minutes,
      accumulated_time_minutes: newAccumulatedTime,
      timestamp
    };

    // 4. 웹훅 발송 (웹훅 URL이 환경 변수로 설정된 경우에만)
    const webhookUrl = Deno.env.get('WEBHOOK_URL');
    if (webhookUrl) {
      try {
        console.log('[review-reward] Sending webhook to:', webhookUrl);
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': Deno.env.get('WEBHOOK_SECRET') || ''
          },
          body: JSON.stringify(webhookPayload)
        });

        if (!webhookResponse.ok) {
          const webhookErrorText = await webhookResponse.text();
          console.error('[review-reward] Webhook delivery failed:', {
            status: webhookResponse.status,
            statusText: webhookResponse.statusText,
            responseText: webhookErrorText
          });
        } else {
          console.log('[review-reward] Webhook sent successfully');
        }
      } catch (webhookError) {
        console.error('[review-reward] Error sending webhook:', {
          name: webhookError.name,
          message: webhookError.message,
          stack: webhookError.stack
        });
      }
    } else {
      console.log('[review-reward] No webhook URL configured, skipping webhook');
    }

    // 5. 성공 응답 반환
    const response: ReviewRewardResponse = {
      success: true,
      message: `Successfully rewarded ${reward_minutes} minutes for review`,
      data: {
        customer_id,
        review_id,
        rewarded_minutes: reward_minutes,
        accumulated_time_minutes: newAccumulatedTime,
        updated_at: updatedCustomer?.updated_at || timestamp
      }
    };

    console.log('[review-reward] Function completed successfully:', JSON.stringify(response, null, 2));

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
    console.error('[review-reward] Unexpected error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
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