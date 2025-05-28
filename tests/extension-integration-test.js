/**
 * 예약 연장 기능 통합 테스트
 * 모든 시나리오를 체계적으로 검증
 */

// 테스트 환경 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 테스트 데이터
const TEST_SCENARIOS = [
  {
    name: '정상 연장 (보유 시간 충분)',
    description: '적립 시간이 충분한 상태에서 30분 연장',
    extensionMinutes: 30,
    useAccumulatedTime: true,
    useCoupons: [],
    expectedSuccess: true,
    expectedCost: 0
  },
  {
    name: '정상 연장 (보유 시간 일부 사용)',
    description: '적립 시간 일부만 사용하고 나머지는 결제',
    extensionMinutes: 60,
    useAccumulatedTime: true,
    useCoupons: [],
    expectedSuccess: true,
    expectedCostRange: [15000, 30000]
  },
  {
    name: '정상 연장 (보유 시간 부족)',
    description: '적립 시간 없이 전액 결제로 연장',
    extensionMinutes: 30,
    useAccumulatedTime: false,
    useCoupons: [],
    expectedSuccess: true,
    expectedCostRange: [15000, 30000]
  },
  {
    name: 'Grace Period 초과',
    description: '예약 종료 후 10분이 지난 상태에서 연장 시도',
    extensionMinutes: 30,
    useAccumulatedTime: true,
    useCoupons: [],
    expectedSuccess: false,
    expectedError: 'Grace Period 만료'
  },
  {
    name: '다음 시간대 예약 충돌',
    description: '연장하려는 시간대에 이미 다른 예약이 있는 경우',
    extensionMinutes: 30,
    useAccumulatedTime: true,
    useCoupons: [],
    expectedSuccess: false,
    expectedError: '시간대 충돌'
  },
  {
    name: '운영시간 외 연장',
    description: '연장 시 운영시간을 초과하는 경우',
    extensionMinutes: 120,
    useAccumulatedTime: true,
    useCoupons: [],
    expectedSuccess: false,
    expectedError: '운영시간 초과'
  }
];

// 테스트 실행 함수
async function runExtensionTest(scenario, reservationId) {
  console.log(`\n🧪 테스트 시작: ${scenario.name}`);
  console.log(`📝 설명: ${scenario.description}`);
  
  const startTime = Date.now();
  
  try {
    // 1. 연장 가능성 확인 API 호출
    console.log('📞 연장 가능성 확인 API 호출...');
    const checkResponse = await fetch(`${API_BASE_URL}/api/reservations/${reservationId}/check-extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        extensionMinutes: scenario.extensionMinutes
      })
    });
    
    const checkResult = await checkResponse.json();
    console.log('✅ 연장 가능성 확인 결과:', checkResult);
    
    // 연장 불가능한 시나리오의 경우 여기서 종료
    if (!scenario.expectedSuccess) {
      if (!checkResult.eligible) {
        console.log('✅ 예상대로 연장 불가능');
        return { success: true, scenario: scenario.name };
      } else {
        console.log('❌ 연장 불가능해야 하는데 가능하다고 응답함');
        return { success: false, scenario: scenario.name, error: '예상과 다른 결과' };
      }
    }
    
    // 연장 가능한 경우만 실제 연장 진행
    if (!checkResult.eligible) {
      console.log('❌ 연장 가능해야 하는데 불가능하다고 응답함');
      return { success: false, scenario: scenario.name, error: '연장 불가능' };
    }
    
    // 2. 실제 연장 API 호출
    console.log('📞 실제 연장 API 호출...');
    const extendResponse = await fetch(`${API_BASE_URL}/api/reservations/${reservationId}/extend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        extensionMinutes: scenario.extensionMinutes,
        useAccumulatedTime: scenario.useAccumulatedTime,
        useCoupons: scenario.useCoupons
      })
    });
    
    const extendResult = await extendResponse.json();
    console.log('✅ 연장 처리 결과:', extendResult);
    
    // 3. 결과 검증
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (responseTime > 3000) {
      console.log(`⚠️ 응답 시간 초과: ${responseTime}ms (목표: 3초 이내)`);
    } else {
      console.log(`✅ 응답 시간 양호: ${responseTime}ms`);
    }
    
    if (extendResult.success !== scenario.expectedSuccess) {
      console.log('❌ 예상 결과와 다름');
      return { success: false, scenario: scenario.name, error: '예상과 다른 결과' };
    }
    
    // 비용 검증
    if (scenario.expectedCost !== undefined) {
      if (extendResult.additionalPaymentRequired !== scenario.expectedCost) {
        console.log(`❌ 예상 비용과 다름: ${extendResult.additionalPaymentRequired} (예상: ${scenario.expectedCost})`);
        return { success: false, scenario: scenario.name, error: '비용 불일치' };
      }
    }
    
    if (scenario.expectedCostRange) {
      const cost = extendResult.additionalPaymentRequired;
      if (cost < scenario.expectedCostRange[0] || cost > scenario.expectedCostRange[1]) {
        console.log(`❌ 예상 비용 범위 벗어남: ${cost} (범위: ${scenario.expectedCostRange[0]}-${scenario.expectedCostRange[1]})`);
        return { success: false, scenario: scenario.name, error: '비용 범위 벗어남' };
      }
    }
    
    console.log(`✅ 테스트 성공: ${scenario.name}`);
    return { success: true, scenario: scenario.name, responseTime };
    
  } catch (error) {
    console.log(`❌ 테스트 실패: ${scenario.name}`, error);
    return { success: false, scenario: scenario.name, error: error.message };
  }
}

// 동시성 테스트 함수
async function runConcurrencyTest(reservationId) {
  console.log('\n🔄 동시성 테스트 시작');
  
  const concurrentRequests = 3;
  const promises = [];
  
  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(
      fetch(`${API_BASE_URL}/api/reservations/${reservationId}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          extensionMinutes: 30,
          useAccumulatedTime: true,
          useCoupons: []
        })
      }).then(res => res.json())
    );
  }
  
  try {
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    
    console.log(`📊 동시 요청 결과: ${successCount}/${concurrentRequests} 성공`);
    
    if (successCount <= 1) {
      console.log('✅ 동시성 제어 정상 작동 (최대 1개만 성공)');
      return { success: true };
    } else {
      console.log('❌ 동시성 제어 실패 (여러 요청이 성공함)');
      return { success: false, error: '동시성 제어 실패' };
    }
    
  } catch (error) {
    console.log('❌ 동시성 테스트 실패:', error);
    return { success: false, error: error.message };
  }
}

// 메인 테스트 실행
async function runAllTests() {
  console.log('🚀 예약 연장 기능 통합 테스트 시작\n');
  
  // 테스트용 예약 ID (실제 환경에서는 실제 예약 ID 사용)
  const TEST_RESERVATION_ID = process.env.TEST_RESERVATION_ID || 'test-reservation-id';
  
  const results = [];
  
  // 개별 시나리오 테스트
  for (const scenario of TEST_SCENARIOS) {
    const result = await runExtensionTest(scenario, TEST_RESERVATION_ID);
    results.push(result);
    
    // 테스트 간 간격
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 동시성 테스트
  const concurrencyResult = await runConcurrencyTest(TEST_RESERVATION_ID);
  results.push({ ...concurrencyResult, scenario: '동시성 테스트' });
  
  // 결과 요약
  console.log('\n📊 테스트 결과 요약');
  console.log('==================');
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`총 테스트: ${totalCount}개`);
  console.log(`성공: ${successCount}개`);
  console.log(`실패: ${totalCount - successCount}개`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 모든 테스트 통과!');
  } else {
    console.log('\n❌ 일부 테스트 실패');
    results.filter(r => !r.success).forEach(r => {
      console.log(`- ${r.scenario}: ${r.error}`);
    });
  }
  
  // 평균 응답 시간
  const responseTimes = results.filter(r => r.responseTime).map(r => r.responseTime);
  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    console.log(`\n⏱️ 평균 응답 시간: ${Math.round(avgResponseTime)}ms`);
  }
  
  return results;
}

// 스크립트 실행
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  runExtensionTest,
  runConcurrencyTest
}; 