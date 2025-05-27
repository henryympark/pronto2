/**
 * 임시 저장 API
 * 로그인 전 예약 정보를 임시로 안전하게 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  TempStorageRequest, 
  TempStorageResponse, 
  PrivateReservationData,
  TEMP_STORAGE_CONFIG 
} from '@/types/tempStorage';
import { 
  encryptData, 
  generateDataHash, 
  generateSessionId, 
  validateEncryptionSetup 
} from '@/lib/encryption';

/**
 * POST: 예약 정보 임시 저장
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[TempStorage API] 임시 저장 요청 시작');

    // 암호화 설정 검증
    if (!validateEncryptionSetup()) {
      console.error('[TempStorage API] 암호화 설정 오류');
      return NextResponse.json(
        { error: 'ENCRYPTION_FAILED', message: '암호화 설정이 올바르지 않습니다.' },
        { status: 500 }
      );
    }

    // 요청 데이터 파싱
    const body: TempStorageRequest = await request.json();
    const { publicData, privateData, returnUrl } = body;

    // 데이터 유효성 검증
    if (!publicData || !privateData) {
      console.error('[TempStorage API] 필수 데이터 누락');
      return NextResponse.json(
        { error: 'INVALID_DATA', message: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 개인정보 동의 확인
    if (!privateData.privacyAgreed) {
      console.error('[TempStorage API] 개인정보 동의 필요');
      return NextResponse.json(
        { error: 'INVALID_DATA', message: '개인정보 처리 동의가 필요합니다.' },
        { status: 400 }
      );
    }

    // 세션 ID 생성
    const sessionId = generateSessionId();
    console.log('[TempStorage API] 세션 ID 생성:', sessionId);

    // 개인정보 데이터 암호화
    const privateDataJson = JSON.stringify(privateData);
    const encryptedData = await encryptData(privateDataJson);
    const dataHash = await generateDataHash(privateDataJson);

    // 만료 시간 계산 (30분 후)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + TEMP_STORAGE_CONFIG.TTL_MINUTES);

    // 보안 메타데이터 수집
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor || realIp || undefined;

    console.log('[TempStorage API] 데이터베이스 저장 시작');

    // Supabase 클라이언트 생성
    const supabase = await createClient();

    // 데이터베이스에 저장
    const { data, error } = await supabase
      .from(TEMP_STORAGE_CONFIG.TABLE_NAME)
      .insert({
        session_id: sessionId,
        encrypted_data: encryptedData,
        data_hash: dataHash,
        expires_at: expiresAt.toISOString(),
        user_agent: userAgent,
        ip_address: ipAddress,
      })
      .select('id, session_id, expires_at')
      .single();

    if (error) {
      console.error('[TempStorage API] 데이터베이스 저장 실패:', error);
      return NextResponse.json(
        { error: 'STORAGE_FAILED', message: '데이터 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log('[TempStorage API] 저장 완료:', data);

    // 로그인 URL 생성 (returnUrl 포함)
    const loginUrl = `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;

    // 응답 데이터 생성
    const response: TempStorageResponse = {
      sessionId: data.session_id,
      expiresAt: data.expires_at,
      loginUrl,
    };

    console.log('[TempStorage API] 임시 저장 성공');

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('[TempStorage API] 예상치 못한 오류:', error);
    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR', 
        message: '서버 내부 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 임시 저장 데이터 삭제 (로그인 완료 후)
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('[TempStorage API] 임시 데이터 삭제 요청');

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'INVALID_DATA', message: '세션 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = await createClient();

    // 데이터 삭제
    const { error } = await supabase
      .from(TEMP_STORAGE_CONFIG.TABLE_NAME)
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      console.error('[TempStorage API] 삭제 실패:', error);
      return NextResponse.json(
        { error: 'DELETE_FAILED', message: '데이터 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log('[TempStorage API] 임시 데이터 삭제 완료:', sessionId);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('[TempStorage API] 삭제 중 오류:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 