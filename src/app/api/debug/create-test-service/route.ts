import { NextResponse } from 'next/server';
import { createClient$ } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Supabase MCP 클라이언트 생성
    const supabase = createClient$();
    
    // 현재 로그인한 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: '인증되지 않은 사용자입니다.', 
        authError 
      }, { status: 401 });
    }
    
    // 테스트 서비스 데이터 생성
    const testService = {
      name: '테스트 스튜디오',
      description: '테스트를 위한 가상 스튜디오입니다.',
      price_per_hour: 20000,
      location: '서울시 강남구',
      image_url: 'https://picsum.photos/800/600',
      is_active: true
    };
    
    // 데이터베이스에 테스트 서비스 데이터 삽입
    const { data: insertResult, error: insertError } = await supabase
      .from('services')
      .insert(testService)
      .select();
    
    if (insertError) {
      return NextResponse.json({ 
        error: '테스트 서비스 데이터 생성 실패', 
        insertError 
      }, { status: 500 });
    }
    
    // 결과 반환
    return NextResponse.json({
      success: true,
      message: '테스트 서비스 데이터가 성공적으로 생성되었습니다.',
      insertResult
    });
    
  } catch (error) {
    console.error('테스트 서비스 데이터 생성 API 오류:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 