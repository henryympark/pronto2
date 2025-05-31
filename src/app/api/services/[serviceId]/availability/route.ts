import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const { serviceId } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: '날짜 매개변수가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    console.log(`[API] 가용시간 통합 조회 시작: ${serviceId} - ${date}`);

    // 🔥 병렬 쿼리 실행: 예약 정보와 차단된 시간을 동시에 조회
    const [reservationsResult, blockedTimesResult] = await Promise.all([
      // 예약 정보 조회
      supabase
        .from('reservations')
        .select('start_time, end_time, status')
        .eq('service_id', serviceId)
        .eq('reservation_date', date)
        .in('status', ['confirmed', 'pending', 'modified']),
      
      // 차단된 시간 조회
      supabase
        .from('blocked_times')
        .select('start_time, end_time, reason')
        .eq('service_id', serviceId)
        .eq('blocked_date', date)
    ]);

    // 에러 체크
    if (reservationsResult.error) {
      console.error('예약 정보 조회 오류:', reservationsResult.error);
      return NextResponse.json(
        { error: '예약 정보를 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    if (blockedTimesResult.error) {
      console.warn('차단된 시간 조회 오류:', blockedTimesResult.error);
    }

    const result = {
      reservations: reservationsResult.data || [],
      blockedTimes: blockedTimesResult.data || [],
      date: date,
      serviceId: serviceId
    };

    console.log(`[API] 가용시간 통합 조회 완료:`, {
      serviceId,
      date,
      reservationsCount: result.reservations.length,
      blockedTimesCount: result.blockedTimes.length
    });

    // 캐싱 헤더 설정 (짧은 캐시 - 실시간성 중요)
    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');

    return response;
  } catch (error) {
    console.error('가용시간 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 