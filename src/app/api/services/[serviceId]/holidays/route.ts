import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const { serviceId } = await params;
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    // 년도와 월이 제공되지 않은 경우 현재 년월 사용
    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;

    // 해당 월의 시작일과 종료일 계산
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const supabase = await createClient();

    // 해당 서비스의 해당 월 휴무일 조회
    const { data: holidays, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('service_id', serviceId)
      .gte('holiday_date', startDate.toISOString().split('T')[0])
      .lte('holiday_date', endDate.toISOString().split('T')[0])
      .order('holiday_date', { ascending: true });

    if (error) {
      console.error('휴무일 조회 오류:', error);
      return NextResponse.json(
        { error: '휴무일 정보를 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // 캐싱 헤더 설정 (1시간 캐시)
    const response = NextResponse.json({
      holidays: holidays || [],
      year: targetYear,
      month: targetMonth
    });

    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=1800');

    return response;
  } catch (error) {
    console.error('휴무일 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 