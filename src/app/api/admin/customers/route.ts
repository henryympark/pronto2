import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { createAdminClient } from '@/lib/supabase-admin';

// 관리자 전용 API 엔드포인트
export async function POST(req: NextRequest) {
  try {
    // 요청 본문 파싱
    const { email, password, nickname, phone, memo } = await req.json();

    // 필수 파라미터 검증
    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호는 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    // 클라이언트 측 요청의 토큰을 가져옵니다.
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // 일반 Supabase 클라이언트 (사용자 토큰 사용)
    const supabaseClient = createSupabaseServerClient();
    // 요청 헤더에 토큰 추가
    supabaseClient.auth.setSession({
      access_token: token,
      refresh_token: '',
    });

    // 요청한 사용자가 관리자인지 확인
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: '인증 오류: 로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    const { data: adminData, error: adminError } = await supabaseClient
      .from('customers')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (adminError || adminData?.role !== 'admin') {
      return NextResponse.json(
        { error: '권한 오류: 관리자만 고객 등록이 가능합니다.' },
        { status: 403 }
      );
    }

    // 서비스 롤 키를 사용하는 관리자 권한 클라이언트
    const supabaseAdmin = createAdminClient();

    // 1. 사용자 생성 (이메일 인증 완료 상태로)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증 자동 완료
    });

    if (createError || !authData.user) {
      return NextResponse.json(
        { error: createError?.message || '사용자 생성에 실패했습니다.' },
        { status: 400 }
      );
    }

    // 2. customers 테이블에 추가 정보 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('customers')
      .update({
        nickname,
        phone,
        auth_provider: 'email',
        role: 'customer',
        is_active: true,
        memo
      })
      .eq('id', authData.user.id);

    if (updateError) {
      // 사용자를 생성했지만 추가 정보 업데이트 실패 시 사용자 삭제 (롤백)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: updateError.message || '고객 정보 업데이트에 실패했습니다.' },
        { status: 400 }
      );
    }

    // 성공 응답
    return NextResponse.json({
      user: authData.user,
      message: '고객이 성공적으로 등록되었습니다.',
    });
  } catch (err: any) {
    console.error('고객 등록 오류:', err);
    return NextResponse.json(
      { error: `고객 등록 중 오류가 발생했습니다: ${err.message}` },
      { status: 500 }
    );
  }
} 