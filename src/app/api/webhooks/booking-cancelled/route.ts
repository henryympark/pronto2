import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      reservationId, 
      customerId, 
      serviceId, 
      startTime, 
      endTime, 
      reservationDate,
      cancelReason,
      cancelledBy // 취소 주체 (user 또는 admin)
    } = body;

    // 필수 필드 검증
    if (!reservationId || !customerId || !serviceId || !startTime || !endTime || !reservationDate) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    // 여기서는 웹훅 이벤트만 발생시키고, 실제 카카오 알림톡 발송은 Phase 8에서 구현
    console.log('예약 취소 이벤트 발생:', {
      type: 'booking.cancelled',
      data: {
        reservationId,
        customerId,
        serviceId,
        startTime,
        endTime,
        reservationDate,
        cancelReason: cancelReason || '사용자 요청',
        cancelledBy: cancelledBy || 'user', // 취소 주체 정보 추가
        timestamp: new Date().toISOString()
      }
    });

    // 성공 응답
    return NextResponse.json({ 
      success: true, 
      message: '예약 취소 이벤트가 성공적으로 발생되었습니다.' 
    });
  } catch (error) {
    console.error('예약 취소 웹훅 처리 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 