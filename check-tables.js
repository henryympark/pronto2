const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // service role key 사용

if (!supabaseUrl || !supabaseKey) {
  console.error('필요한 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

// Supabase 클라이언트 생성 (service role key 사용)
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  try {
    // 1. services 테이블 확인
    console.log('=== services 테이블 구조 확인 ===')
    const { data: servicesInfo, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .limit(1)
    
    if (servicesError) {
      console.error('services 테이블 조회 에러:', servicesError)
    } else {
      console.log('services 테이블 구조:', servicesInfo.length > 0 ? Object.keys(servicesInfo[0]) : '데이터 없음')
      console.log('샘플 데이터:', servicesInfo)
    }
    
    // 2. customers 테이블 확인
    console.log('\n=== customers 테이블 구조 확인 ===')
    const { data: customersInfo, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .limit(3)
    
    if (customersError) {
      console.error('customers 테이블 조회 에러:', customersError)
    } else {
      console.log('customers 테이블 구조:', customersInfo.length > 0 ? Object.keys(customersInfo[0]) : '데이터 없음')
      console.log('고객 수:', customersInfo.length)
    }
    
    // 3. reservations 테이블 확인
    console.log('\n=== reservations 테이블 구조 확인 ===')
    const { data: reservationsInfo, error: reservationsError } = await supabase
      .from('reservations')
      .select('*')
      .limit(3)
    
    if (reservationsError) {
      console.error('reservations 테이블 조회 에러:', reservationsError)
    } else {
      console.log('reservations 테이블 구조:', reservationsInfo.length > 0 ? Object.keys(reservationsInfo[0]) : '데이터 없음')
      console.log('예약 수:', reservationsInfo.length)
    }
  } catch (err) {
    console.error('테이블 확인 중 예외 발생:', err)
  }
}

checkTables() 