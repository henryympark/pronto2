/**
 * 임시 저장 데이터 복원 API
 * 로그인 완료 후 임시 저장된 예약 정보 복원
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  RestoreDataRequest, 
  RestoreDataResponse, 
  PrivateReservationData,
  TEMP_STORAGE_CONFIG 
} from '@/types/tempStorage';
import { 
  decryptData, 
  verifyDataHash 
} from '@/lib/encryption';

/**
 * POST: 임시 저장 데이터 복원
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[TempStorage Restore API] 데이터 복원 요청 시작');

    // 요청 데이터 파싱
    const body: RestoreDataRequest = await request.json();
    const { sessionId } = body;

    // 데이터 유효성 검증
    if (!sessionId) {
      console.error('[TempStorage Restore API] 세션 ID 누락');
      return NextResponse.json(
        { error: 'INVALID_DATA', message: '세션 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('[TempStorage Restore API] 세션 ID:', sessionId);

    // Supabase 클라이언트 생성
    const supabase = await createClient();

    // 데이터베이스에서 임시 저장 데이터 조회
    const { data, error } = await supabase
      .from(TEMP_STORAGE_CONFIG.TABLE_NAME)
      .select('encrypted_data, data_hash, expires_at, created_at')
      .eq('session_id', sessionId)
      .single();

    if (error || !data) {
      console.error('[TempStorage Restore API] 데이터 조회 실패:', error);
      return NextResponse.json(
        { error: 'NOT_FOUND', message: '임시 저장 데이터를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    console.log('[TempStorage Restore API] 데이터 조회 성공');

    // 만료 시간 확인
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const isExpired = now > expiresAt;

    if (isExpired) {
      console.error('[TempStorage Restore API] 데이터 만료됨');
      
      // 만료된 데이터 삭제
      await supabase
        .from(TEMP_STORAGE_CONFIG.TABLE_NAME)
        .delete()
        .eq('session_id', sessionId);

      return NextResponse.json(
        { error: 'EXPIRED', message: '임시 저장 데이터가 만료되었습니다.' },
        { status: 410 }
      );
    }

    try {
      // 데이터 복호화
      console.log('[TempStorage Restore API] 데이터 복호화 시작');
      const decryptedData = await decryptData(data.encrypted_data);
      
      // 데이터 무결성 검증
      const isValid = await verifyDataHash(decryptedData, data.data_hash);
      if (!isValid) {
        console.error('[TempStorage Restore API] 데이터 무결성 검증 실패');
        return NextResponse.json(
          { error: 'INVALID_DATA', message: '데이터 무결성 검증에 실패했습니다.' },
          { status: 400 }
        );
      }

      // JSON 파싱
      const privateData: PrivateReservationData = JSON.parse(decryptedData);
      
      console.log('[TempStorage Restore API] 복원 완료');

      // 응답 데이터 생성 (publicData는 클라이언트에서 제공)
      const response: Omit<RestoreDataResponse, 'publicData'> & { privateData: PrivateReservationData } = {
        privateData,
        isExpired: false,
      };

      return NextResponse.json(response, { status: 200 });

    } catch (decryptError) {
      console.error('[TempStorage Restore API] 복호화 실패:', decryptError);
      return NextResponse.json(
        { error: 'ENCRYPTION_FAILED', message: '데이터 복호화에 실패했습니다.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[TempStorage Restore API] 예상치 못한 오류:', error);
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
 * GET: 임시 저장 데이터 상태 확인 (만료 여부만 체크)
 */
export async function GET(request: NextRequest) {
  try {
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

    // 데이터 존재 여부 및 만료 시간만 조회
    const { data, error } = await supabase
      .from(TEMP_STORAGE_CONFIG.TABLE_NAME)
      .select('expires_at')
      .eq('session_id', sessionId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { exists: false, isExpired: true },
        { status: 200 }
      );
    }

    // 만료 시간 확인
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const isExpired = now > expiresAt;

    return NextResponse.json(
      { 
        exists: true, 
        isExpired,
        expiresAt: data.expires_at 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[TempStorage Restore API] 상태 확인 오류:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 