import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// 웹훅 이벤트 타입 정의
interface WebhookEvent {
  id: string;
  event_type: string;
  event_data: any;
  webhook_url: string;
  retry_count: number;
}

// HMAC-SHA256 서명 생성 함수
async function generateWebhookSignature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  );
  
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `sha256=${hashHex}`;
}

// 개별 웹훅 발송 함수
async function sendWebhook(
  supabaseClient: any,
  webhookEvent: WebhookEvent,
  webhookSecret?: string
): Promise<{ success: boolean; statusCode?: number; errorMessage?: string }> {
  try {
    if (!webhookEvent.webhook_url) {
      console.log(`웹훅 URL이 설정되지 않음 - 이벤트 ID: ${webhookEvent.id}`);
      return { success: true }; // URL이 없으면 성공으로 처리 (발송 필요 없음)
    }

    const payload = JSON.stringify(webhookEvent.event_data);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Pronto-Webhook/1.0',
      'X-Webhook-Event-Type': webhookEvent.event_type,
      'X-Webhook-Event-Id': webhookEvent.id,
      'X-Webhook-Retry-Count': webhookEvent.retry_count.toString(),
    };

    // HMAC 서명 추가 (시크릿이 있는 경우)
    if (webhookSecret) {
      headers['X-Pronto-Signature'] = await generateWebhookSignature(payload, webhookSecret);
    }

    console.log(`웹훅 발송 시도 - 이벤트: ${webhookEvent.event_type}, URL: ${webhookEvent.webhook_url}`);

    const response = await fetch(webhookEvent.webhook_url, {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(30000), // 30초 타임아웃
    });

    const responseText = await response.text();
    
    if (response.ok) {
      console.log(`웹훅 발송 성공 - 이벤트 ID: ${webhookEvent.id}, 상태: ${response.status}`);
      return { success: true, statusCode: response.status };
    } else {
      console.error(`웹훅 발송 실패 - 이벤트 ID: ${webhookEvent.id}, 상태: ${response.status}, 응답: ${responseText}`);
      return { 
        success: false, 
        statusCode: response.status, 
        errorMessage: responseText.slice(0, 1000) // 최대 1000자까지만 저장
      };
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`웹훅 발송 오류 - 이벤트 ID: ${webhookEvent.id}:`, errorMessage);
    
    return { 
      success: false, 
      statusCode: 0, // 네트워크 오류 등
      errorMessage: errorMessage.slice(0, 1000)
    };
  }
}

// 메인 핸들러
Deno.serve(async (req: Request) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');

    if (req.method === 'POST') {
      // 수동 웹훅 발송 (특정 이벤트 ID)
      const { event_id } = await req.json();
      
      if (!event_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'event_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 특정 이벤트 조회
      const { data: eventData, error: fetchError } = await supabaseClient
        .from('webhook_events')
        .select('id, event_type, event_data, webhook_url, retry_count')
        .eq('id', event_id)
        .eq('status', 'pending')
        .single();

      if (fetchError || !eventData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Event not found or already processed' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 웹훅 발송
      const result = await sendWebhook(supabaseClient, eventData, webhookSecret);
      
      // 결과에 따라 상태 업데이트
      const { error: updateError } = await supabaseClient.rpc('update_webhook_event_status', {
        p_event_id: event_id,
        p_status: result.success ? 'sent' : 'failed',
        p_response_status: result.statusCode,
        p_response_body: result.errorMessage
      });

      if (updateError) {
        console.error('웹훅 이벤트 상태 업데이트 실패:', updateError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          webhook_sent: result.success,
          status_code: result.statusCode
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (req.method === 'GET') {
      // 배치 웹훅 발송 (재시도 대상 이벤트들)
      const { data: retryEvents, error: retryError } = await supabaseClient.rpc('get_webhook_events_for_retry');

      if (retryError) {
        console.error('재시도 대상 이벤트 조회 실패:', retryError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch retry events' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!retryEvents || retryEvents.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No events to retry', processed: 0 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let successCount = 0;
      let failedCount = 0;

      // 각 이벤트에 대해 웹훅 발송 시도
      for (const event of retryEvents) {
        try {
          const result = await sendWebhook(supabaseClient, event, webhookSecret);
          
          // 결과에 따라 상태 업데이트
          const { error: updateError } = await supabaseClient.rpc('update_webhook_event_status', {
            p_event_id: event.id,
            p_status: result.success ? 'sent' : 'failed',
            p_response_status: result.statusCode,
            p_response_body: result.errorMessage
          });

          if (updateError) {
            console.error(`이벤트 ${event.id} 상태 업데이트 실패:`, updateError);
          }

          if (result.success) {
            successCount++;
          } else {
            failedCount++;
          }

        } catch (error) {
          console.error(`이벤트 ${event.id} 처리 중 오류:`, error);
          failedCount++;
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Processed ${retryEvents.length} events`,
          processed: retryEvents.length,
          success_count: successCount,
          failed_count: failedCount
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Webhook dispatcher error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 