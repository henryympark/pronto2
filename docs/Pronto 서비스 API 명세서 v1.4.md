# Pronto 서비스 API 명세서 v1.4 (2025년 5월 26일 업데이트)

*(참고: 본 문서는 PRD v4.23, TDD v2.0, 데이터베이스 스키마 v1.4를 기준으로 작성되었습니다.)*
**(변경 이력: v1.4 - 2025년 5월 26일, 실제 구현된 API 엔드포인트들과 동기화, 구현 완료된 기능들 반영; v1.3 - 2025년 5월 10일, 시간 선택 UI UX 상세화에 따른 API 응답 필드 설명 보완; v1.2 - 2025년 5월 9일, 예약 연장 및 동시간대 예약 처리를 위한 제약 조건 추가)**

---

## 1. 개요 (Overview)

| 항목         | 내용                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------- |
| **API 버전** | v1.4                                                                                          |
| **기본 URL** | `https://your-domain.com/api` (실제 도메인으로 교체)                                                   |
| **프로토콜**   | HTTPS                                                                                         |
| **데이터 형식** | JSON                                                                                          |
| **인증 방식**  | Supabase Auth (JWT Token)                                                                    |
| **구현 상태**  | 본 문서는 **실제 구현된 API 엔드포인트들**을 기반으로 작성되었으며, 현재 운영 중인 API를 정확히 반영합니다.                      |

---

## 2. 인증 (Authentication)

### 인증 방식
- **Supabase Auth 기반 JWT 토큰 인증**
- 모든 보호된 엔드포인트는 `Authorization: Bearer <token>` 헤더 필요
- 토큰은 Supabase 클라이언트를 통해 자동 관리됨

### 권한 레벨
- **고객 (customer)**: 자신의 데이터만 접근 가능
- **관리자 (admin)**: 모든 데이터 접근 및 관리 가능

---

## 3. 공통 응답 형식 (Common Response Format)

### 성공 응답
```json
{
  "data": { /* 응답 데이터 */ },
  "message": "성공 메시지",
  "success": true
}
```

### 오류 응답
```json
{
  "error": "ERROR_CODE",
  "message": "사용자 친화적 오류 메시지"
}
```

### HTTP 상태 코드
- `200 OK`: 성공
- `201 Created`: 생성 성공
- `400 Bad Request`: 잘못된 요청
- `401 Unauthorized`: 인증 필요
- `403 Forbidden`: 권한 없음
- `404 Not Found`: 리소스 없음
- `409 Conflict`: 충돌 (예: 시간 중복)
- `500 Internal Server Error`: 서버 오류

---

## 4. 구현된 API 엔드포인트 (Implemented API Endpoints)

### 4.1 서비스 관련 API

#### GET `/api/services/{serviceId}/available-times`
**설명**: 특정 서비스의 예약 가능 시간 조회
**권한**: 모든 사용자
**구현 상태**: ✅ 완료

##### 요청 파라미터
- `serviceId` (path): 서비스 ID (UUID)
- `date` (query): 조회할 날짜 (YYYY-MM-DD 형식)

##### 성공 응답 (200 OK)
```json
{
  "date": "2025-05-26",
  "operatingStartTime": "09:00",
  "operatingEndTime": "18:00",
  "unavailableSlots": ["09:00", "09:30", "10:00"],
  "currentTime": "14:30",
  "isClosed": false,
  "message": null,
  "isToday": true,
  "daysDiff": 0
}
```

#### POST `/api/services/{serviceId}/reservations`
**설명**: 새 예약 생성
**권한**: 인증된 사용자
**구현 상태**: ✅ 완료

##### 요청 본문
```json
{
  "customerId": "uuid",
  "reservationDate": "2025-05-26",
  "startTime": "10:00",
  "endTime": "12:00",
  "totalHours": 2,
  "totalPrice": 40000
}
```

##### 성공 응답 (201 Created)
```json
{
  "message": "예약이 성공적으로 생성되었습니다.",
  "reservation": {
    "id": "uuid",
    "service_id": "uuid",
    "customer_id": "uuid",
    "reservation_date": "2025-05-26",
    "start_time": "10:00",
    "end_time": "12:00",
    "total_hours": 2,
    "total_price": 40000,
    "status": "pending",
    "created_at": "2025-05-26T05:30:00Z"
  }
}
```

#### GET `/api/services/{serviceId}/reservations`
**설명**: 특정 서비스의 예약 목록 조회
**권한**: 관리자
**구현 상태**: ✅ 완료

##### 요청 파라미터
- `serviceId` (path): 서비스 ID (UUID)
- `date` (query, optional): 특정 날짜 필터 (YYYY-MM-DD)

##### 성공 응답 (200 OK)
```json
{
  "reservations": [
    {
      "id": "uuid",
      "service_id": "uuid",
      "customer_id": "uuid",
      "reservation_date": "2025-05-26",
      "start_time": "10:00",
      "end_time": "12:00",
      "status": "confirmed",
      "created_at": "2025-05-26T05:30:00Z"
    }
  ]
}
```

### 4.2 예약 관련 API

#### GET `/api/reservations/{reservationId}`
**설명**: 특정 예약 상세 조회
**권한**: 예약 소유자 또는 관리자
**구현 상태**: ✅ 완료

##### 성공 응답 (200 OK)
```json
{
  "reservation": {
    "id": "uuid",
    "service_id": "uuid",
    "customer_id": "uuid",
    "reservation_date": "2025-05-26",
    "start_time": "10:00",
    "end_time": "12:00",
    "total_hours": 2,
    "total_price": 40000,
    "status": "confirmed",
    "customer_name": "홍길동",
    "company_name": "테스트 회사",
    "shooting_purpose": "제품 촬영",
    "vehicle_number": "12가3456",
    "services": {
      "name": "스튜디오 A",
      "price_per_hour": 20000,
      "location": "서울시 강남구",
      "image_url": "https://example.com/image.jpg"
    },
    "customers": {
      "email": "user@example.com",
      "nickname": "홍길동",
      "phone": "010-1234-5678"
    },
    "created_at": "2025-05-26T05:30:00Z"
  }
}
```

#### PATCH `/api/reservations/{reservationId}`
**설명**: 예약 상태 업데이트
**권한**: 예약 소유자 또는 관리자
**구현 상태**: ✅ 완료

##### 요청 본문
```json
{
  "status": "confirmed"
}
```

##### 성공 응답 (200 OK)
```json
{
  "message": "예약 상태가 성공적으로 업데이트되었습니다.",
  "reservation": {
    "id": "uuid",
    "status": "confirmed",
    "updated_at": "2025-05-26T06:00:00Z"
  }
}
```

#### DELETE `/api/reservations/{reservationId}`
**설명**: 예약 삭제
**권한**: 예약 소유자 또는 관리자
**구현 상태**: ✅ 완료

##### 성공 응답 (200 OK)
```json
{
  "message": "예약이 성공적으로 삭제되었습니다."
}
```

### 4.3 관리자 API

#### POST `/api/admin/customers`
**설명**: 관리자가 새 고객 생성
**권한**: 관리자만
**구현 상태**: ✅ 완료

##### 요청 본문
```json
{
  "email": "user@example.com",
  "password": "password123",
  "nickname": "홍길동",
  "phone": "010-1234-5678",
  "memo": "관리자 메모"
}
```

##### 성공 응답 (201 Created)
```json
{
  "message": "고객이 성공적으로 생성되었습니다.",
  "customer": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "홍길동",
    "phone": "010-1234-5678",
    "role": "customer",
    "is_active": true,
    "accumulated_time_minutes": 0,
    "memo": "관리자 메모",
    "created_at": "2025-05-26T05:30:00Z"
  }
}
```

### 4.4 리뷰 보상 API

#### POST `/api/supabase/functions/review-reward`
**설명**: 리뷰 작성 시 적립시간 부여
**권한**: 시스템 내부 호출
**구현 상태**: ✅ 완료

##### 요청 본문
```json
{
  "customer_id": "uuid",
  "review_id": "uuid",
  "reservation_id": "uuid"
}
```

##### 성공 응답 (200 OK)
```json
{
  "success": true,
  "message": "Successfully rewarded 10 minutes for review",
  "data": {
    "customer_id": "uuid",
    "review_id": "uuid",
    "rewarded_minutes": 10,
    "accumulated_time_minutes": 40,
    "updated_at": "2025-05-26T06:00:00Z"
  }
}
```

### 4.5 디버그 API (개발용)

#### GET `/api/debug/reservations`
**설명**: 사용자 예약 정보 디버깅
**권한**: 인증된 사용자
**구현 상태**: ✅ 완료 (개발용)

#### GET `/api/debug/create-test-reservation`
**설명**: 테스트 예약 데이터 생성
**권한**: 인증된 사용자
**구현 상태**: ✅ 완료 (개발용)

#### GET `/api/debug/create-test-service`
**설명**: 테스트 서비스 데이터 생성
**권한**: 인증된 사용자
**구현 상태**: ✅ 완료 (개발용)

---

## 5. 데이터 모델 (Data Models)

### 5.1 예약 상태 (Reservation Status)
- `pending`: 대기 중
- `confirmed`: 확정
- `canceled`: 취소됨
- `completed`: 완료됨
- `modified`: 변경됨

### 5.2 사용자 역할 (User Roles)
- `customer`: 일반 고객
- `admin`: 관리자

### 5.3 인증 제공자 (Auth Providers)
- `email`: 이메일 로그인
- `kakao`: 카카오 소셜 로그인
- `naver`: 네이버 소셜 로그인

---

## 6. 오류 코드 (Error Codes)

### 일반 오류
- `INVALID_REQUEST`: 잘못된 요청
- `UNAUTHORIZED`: 인증 필요
- `FORBIDDEN`: 권한 없음
- `NOT_FOUND`: 리소스 없음
- `INTERNAL_ERROR`: 서버 내부 오류

### 예약 관련 오류
- `TIME_CONFLICT`: 시간 충돌
- `INVALID_TIME_FORMAT`: 잘못된 시간 형식
- `PAST_TIME_RESERVATION`: 과거 시간 예약 시도
- `SERVICE_NOT_FOUND`: 서비스 없음
- `RESERVATION_NOT_FOUND`: 예약 없음

### 인증 관련 오류
- `INVALID_TOKEN`: 유효하지 않은 토큰
- `TOKEN_EXPIRED`: 토큰 만료
- `INSUFFICIENT_PERMISSIONS`: 권한 부족

---

## 7. 캐싱 정책 (Caching Policy)

### 예약 가능 시간 API
- **오늘 날짜**: 5분 캐싱 (`max-age=300`)
- **미래 날짜**: 15분 캐싱 (`max-age=900`)

### 정적 데이터
- **서비스 정보**: 1시간 캐싱
- **운영시간 정보**: 30분 캐싱

---

## 8. 미구현 API (향후 개발 예정)

다음 API들은 문서에는 정의되어 있지만 아직 구현되지 않았습니다:

### 예약 연장 관련
- `POST /api/reservations/{reservationId}/extend`: 예약 연장
- `GET /api/reservations/{reservationId}/extension-history`: 연장 이력 조회

### 결제 관련
- `POST /api/payments/portone`: PortOne 결제 처리
- `POST /api/payments/webhook`: 결제 웹훅 처리

### 알림 관련
- `POST /api/notifications/kakao`: 카카오 알림톡 발송

### 다중 업체 지원
- `GET /api/businesses`: 업체 목록 조회
- `POST /api/businesses`: 업체 생성
- `GET /api/businesses/{businessId}/members`: 업체 멤버 조회

---

## 9. 버전 관리 및 변경 이력

### v1.4 (2025년 5월 26일)
- 실제 구현된 API 엔드포인트들과 동기화
- 구현 완료된 기능들 상태 반영
- 미구현 API들 명시
- 캐싱 정책 및 오류 코드 정보 추가
- 디버그 API 정보 추가

### v1.3 (2025년 5월 10일)
- 시간 선택 UI UX 상세화에 따른 API 응답 필드 설명 보완

### v1.2 (2025년 5월 9일)
- 예약 연장 및 동시간대 예약 처리를 위한 제약 조건 추가

---

## 10. 개발자 가이드

### API 클라이언트 사용법
```typescript
import { apiRequest } from '@/shared/hooks/useApi';

// 예약 가능 시간 조회
const availableTimes = await apiRequest(
  `/api/services/${serviceId}/available-times?date=2025-05-26`
);

// 새 예약 생성
const newReservation = await apiRequest(
  `/api/services/${serviceId}/reservations`,
  {
    method: 'POST',
    body: JSON.stringify({
      customerId: 'uuid',
      reservationDate: '2025-05-26',
      startTime: '10:00',
      endTime: '12:00',
      totalHours: 2,
      totalPrice: 40000
    })
  }
);
```

### 상수 파일 활용
```typescript
import { API_PATHS } from '@/constants/apiPaths';

// API 경로 상수 사용
const serviceDetailUrl = API_PATHS.SERVICES.DETAIL(serviceId);
const availableTimesUrl = API_PATHS.SERVICES.AVAILABLE_TIMES(serviceId);
```

---

*본 문서는 실제 운영 중인 API를 정확히 반영하며, 향후 기능 추가 시 지속적으로 업데이트됩니다.* 