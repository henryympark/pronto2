import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Request 타입 인터페이스
interface DeactivateAccountRequest {
  user_id: string;
}

// Supabase Function 핸들러
Deno.serve(async (req: Request) => {
  try {
    // CORS 헤더 설정
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
    
    // 메서드 확인 (POST만 허용)
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // 요청 본문 파싱
    const { user_id } = await req.json() as DeactivateAccountRequest

    // user_id 유효성 검사
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: user_id' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Authorization 헤더에서 JWT 토큰 추출
    const authorization = req.headers.get('Authorization')
    const jwt = authorization?.replace('Bearer ', '') || ''

    // Supabase 클라이언트 생성
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        global: {
          headers: { Authorization: `Bearer ${jwt}` },
        },
      }
    )

    // 사용자 존재 여부 확인
    const { data: userData, error: userError } = await supabaseClient
      .from('customers')
      .select('id')
      .eq('id', user_id)
      .single()

    if (userError || !userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // customers 테이블에서 사용자 삭제 상태 설정
    const now = new Date().toISOString()
    const { error: updateError } = await supabaseClient
      .from('customers')
      .update({
        deleted_at: now,
      })
      .eq('id', user_id)

    if (updateError) {
      console.error('Error updating customer:', updateError)
      return new Response(JSON.stringify({ error: 'Failed to deactivate account' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // 성공 응답
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Account deactivated successfully',
      deactivated_at: now
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    // 오류 처리
    console.error('Unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}) 