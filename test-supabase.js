const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// 환경 변수에서 Supabase 정보 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key 존재:', supabaseKey ? '예' : '아니오')

// Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    // 간단한 쿼리 실행 (services 테이블 조회)
    const { data, error } = await supabase.from('services').select('name').limit(1)
    
    if (error) {
      console.error('Supabase 쿼리 에러:', error)
      return
    }
    
    console.log('Supabase 연결 성공!')
    console.log('조회된 데이터:', data)
  } catch (err) {
    console.error('예외 발생:', err)
  }
}

testConnection() 