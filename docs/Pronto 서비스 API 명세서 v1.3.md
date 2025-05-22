# Pronto 서비스 API 명세서 v1.3 (2025년 5월 10일 업데이트)

*(참고: 본 문서는 PRD v4.20, TDD v1.7, 데이터베이스 스키마 v1.3을 기준으로 작성되었습니다.)*
**(변경 이력: v1.3 - 2025년 5월 10일, 시간 선택 UI UX 상세화에 따른 API 응답 필드 설명 보완; v1.2 - 2025년 5월 9일, 예약 연장 및 동시간대 예약 처리 API 추가)**

---

## 1. 개요

본 문서는 Pronto 서비스와 외부 시스템(예: n8n, Make 등 자동화 도구) 간의 연동을 위한 API(Application Programming Interface) 및 웹훅(Webhook)의 명세를 정의합니다. 외부 시스템은 정의된 API를 통해 Pronto의 데이터에 접근하거나 특정 작업을 수행할 수 있으며, 웹훅을 통해 Pronto 내부에서 발생하는 주요 이벤트를 실시간으로 수신할 수 있습니다.

## 2. 인증 (Authentication)

* **방식:** API Key 기반 인증
* **요청 헤더:** 모든 API 요청 시 HTTP 헤더에 `Authorization` 필드를 포함해야 합니다.
* **형식:** `Authorization: Bearer YOUR_API_KEY`

### API Key 발급/관리

* 운영자는 관리 페이지 내 별도 메뉴를 통해 API Key를 생성, 조회, 비활성화, 재발급할 수 있습니다. (해당 관리 기능은 별도 요구사항 정의 필요)
* 생성된 API Key는 외부 시스템 설정 시 안전하게 복사하여 사용해야 하며, 노출되지 않도록 주의해야 합니다.

### 오류 응답

* **401 Unauthorized:** 유효하지 않은 API Key 또는 인증 헤더 누락 시 반환됩니다.

  ```json
  {
    "error": "UNAUTHORIZED",
    "message": "유효한 API Key가 필요합니다."
  }
  ```
* **403 Forbidden:** 해당 API에 접근할 권한이 없는 경우(예: 일반 사용자가 운영자 API 호출 시) 반환됩니다.

  ```json
  {
    "error": "FORBIDDEN",
    "message": "요청을 처리할 권한이 없습니다."
  }
  ```

## 3. API 운영 정책 (API Operation Policies)

### 버전 관리 (Versioning)

* API 엔드포인트 URL에 버전 정보(`/v1`)를 포함합니다.
* 향후 API 변경 시 하위 호환성을 유지하거나, 새로운 버전(`/v2`)의 엔드포인트를 제공합니다.

### 사용량 제한 (Rate Limiting)

* 비정상적인 호출을 방지하기 위해 API Key별로 호출 횟수 제한 정책(예: 분당 60회)을 적용할 수 있습니다. (구체적인 제한 수치는 서비스 운영 상황에 따라 결정)
* 제한 초과 시 `429 Too Many Requests` 상태 코드와 함께 오류 메시지를 반환합니다.

  ```json
  {
    "error": "TOO_MANY_REQUESTS",
    "message": "API 호출 횟수 제한을 초과했습니다. 잠시 후 다시 시도해주세요."
  }
  ```

## 4. API 엔드포인트 (API Endpoints)

*(모든 날짜/시각 정보는 ISO 8601 형식을 따릅니다. 예: 2025-05-04T10:30:00Z)*
*(UUID는 문자열 형식입니다.)*

### 예약 (Reservations)

#### GET `/api/v1/reservations`

* **설명:** 예약 목록을 조회합니다. (페이지네이션 및 필터링 지원)
* **권한:** 운영자(admin)

##### 요청 파라미터 (Query)

* `page` (integer, optional, default=1, min=1): 페이지 번호
* `limit` (integer, optional, default=20, min=1, max=100): 페이지당 항목 수
* `status` (string, optional, enum: `'confirmed', 'modified', 'cancelled', 'pending_payment', 'completed', 'no-show'`): 예약 상태 필터
* `startDate` (string, optional, format: `YYYY-MM-DD`): 조회 시작 날짜 (해당 날짜 포함)
* `endDate` (string, optional, format: `YYYY-MM-DD`): 조회 종료 날짜 (해당 날짜 포함)
* `customerId` (UUID, optional): 특정 고객 ID 필터
* `serviceId` (UUID, optional): 특정 서비스 ID 필터

##### 성공 응답 (200 OK)

```json
{
  "data": [
    {
      "id": "UUID",
      "customerId": "UUID",
      "serviceId": "UUID",
      "startTime": "string (ISO 8601)",
      "endTime": "string (ISO 8601)",
      "status": "string",
      "customerName": "string",
      "paidAmount": "number",
      "createdAt": "string (ISO 8601)"
    }
  ],
  "pagination": {
    "currentPage": "integer",
    "totalPages": "integer",
    "totalItems": "integer",
    "limit": "integer"
  }
}
```

##### 오류 응답

* **400 Bad Request:** 잘못된 파라미터 값 또는 형식 오류

  ```json
  { "error": "INVALID_PARAMETER", "message": "잘못된 요청 파라미터입니다: [파라미터명]" }
  ```
* **401 Unauthorized**
* **403 Forbidden**
* **500 Internal Server Error:** 서버 내부 오류

  ```json
  { "error": "INTERNAL_SERVER_ERROR", "message": "서버 내부 오류가 발생했습니다." }
  ```

#### GET `/api/v1/reservations/{id}`

* **설명:** 특정 예약의 상세 정보를 조회합니다.
* **권한:** 운영자(admin)

##### 요청 파라미터 (Path)

* `id` (UUID, required): 조회할 예약의 고유 ID

##### 성공 응답 (200 OK)

```json
{
  "id": "UUID",
  "customerId": "UUID",
  "serviceId": "UUID",
  "startTime": "string (ISO 8601)",
  "endTime": "string (ISO 8601)",
  "status": "string",
  "customerName": "string",
  "customerPhone": "string | null",
  "requests": "string | null",
  "vehicleNumber": "string | null",
  "usedCouponIds": ["UUID", "..."],
  "usedAccumulatedTimeMinutes": "integer | null",
  "paidAmount": "number",
  "adminMemo": "string | null",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```

##### 오류 응답

* **401 Unauthorized**
* **403 Forbidden**
* **404 Not Found:** 해당 ID의 예약을 찾을 수 없음

  ```json
  { "error": "RESERVATION_NOT_FOUND", "message": "예약 정보를 찾을 수 없습니다." }
  ```
* **500 Internal Server Error**

#### PUT `/api/v1/reservations/{id}/status`

* **설명:** (주의) 운영자 권한으로 특정 예약의 상태를 변경합니다. (예: 'no-show', 'completed' 처리 등)
* **권한:** 운영자(admin)

##### 요청 파라미터 (Path)

* `id` (UUID, required): 상태를 변경할 예약의 고유 ID

##### 요청 본문 (Body)

```json
{
  "status": "string (required, enum: ['confirmed', 'modified', 'cancelled', 'pending_payment', 'completed', 'no-show'])"
}
```

##### 성공 응답 (200 OK)

```json
{
  "message": "예약 상태가 성공적으로 변경되었습니다.",
  "updatedReservation": {
    "id": "UUID",
    "status": "변경된 상태값"
  }
}
```

##### 오류 응답

* **400 Bad Request:** 잘못된 상태 값 또는 필수 필드 누락

  ```json
  { "error": "INVALID_STATUS", "message": "유효하지 않은 예약 상태 값입니다." }
  ```
* **401 Unauthorized**
* **403 Forbidden**
* **404 Not Found**
* **500 Internal Server Error**

---

### 고객 (Customers)

#### GET `/api/v1/customers`

* **설명:** 고객 목록을 조회합니다. (페이지네이션 및 검색 지원)
* **권한:** 운영자(admin)

##### 요청 파라미터 (Query)

* `page` (integer, optional, default=1, min=1): 페이지 번호
* `limit` (integer, optional, default=20, min=1, max=100): 페이지당 항목 수
* `search` (string, optional): 이름 또는 연락처 검색어
* `isActive` (boolean, optional): 활성/비활성 상태 필터

##### 성공 응답 (200 OK)

```json
{
  "data": [
    {
      "id": "UUID",
      "name": "string",
      "email": "string (email format)",
      "phoneNumber": "string | null",
      "authProvider": "string",
      "accumulatedTimeMinutes": "integer",
      "activeCouponCount": "integer",
      "isActive": "boolean",
      "createdAt": "string (ISO 8601)"
    }
  ],
  "pagination": { ... }
}
```

##### 오류 응답

* **400 Bad Request**
* **401 Unauthorized**
* **403 Forbidden**
* **500 Internal Server Error**

#### GET `/api/v1/customers/{id}`

* **설명:** 특정 고객의 상세 정보를 조회합니다.
* **권한:** 운영자(admin)

##### 요청 파라미터 (Path)

* `id` (UUID, required): 조회할 고객의 고유 ID

##### 성공 응답 (200 OK)

```json
{
  "id": "UUID",
  "name": "string",
  "email": "string (email format)",
  "phoneNumber": "string | null",
  "authProvider": "string",
  "accumulatedTimeMinutes": "integer",
  "coupons": [
    {
      "id": "UUID",
      "valueMinutes": 30,
      "grantedAt": "string (ISO 8601)",
      "expiresAt": "string (ISO 8601)"
    }
  ],
  "isActive": "boolean",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```

##### 오류 응답

* **401 Unauthorized**
* **403 Forbidden**
* **404 Not Found:** 해당 ID의 고객을 찾을 수 없음

  ```json
  { "error": "CUSTOMER_NOT_FOUND", "message": "고객 정보를 찾을 수 없습니다." }
  ```
* **500 Internal Server Error**

#### POST `/api/v1/admin/customers/{id}/grant-coupon`

* **설명:** (운영자 전용) 특정 고객에게 30분 쿠폰을 부여합니다.
* **권한:** 운영자(admin)

##### 요청 파라미터 (Path)

* `id` (UUID, required): 쿠폰을 부여할 고객의 고유 ID

##### 요청 본문 (Body)

```json
{
  "count": "integer (required, min=1, default=1)"
}
```

##### 성공 응답 (201 Created)

```json
{
  "message": "고객에게 30분 쿠폰 X개가 성공적으로 부여되었습니다.",
  "grantedCoupons": [
    {
      "id": "UUID",
      "valueMinutes": 30,
      "grantedAt": "string (ISO 8601)",
      "expiresAt": "string (ISO 8601)"
    }
  ]
}
```

##### 오류 응답

* **400 Bad Request:** 잘못된 count 값

  ```json
  { "error": "INVALID_PARAMETER", "message": "쿠폰 개수는 1 이상이어야 합니다." }
  ```
* **401 Unauthorized**
* **403 Forbidden**
* **404 Not Found**
* **500 Internal Server Error**

---

### 리뷰 (Reviews)

#### GET `/api/v1/reviews`

* **설명:** 리뷰 목록을 조회합니다. (페이지네이션 및 필터링 지원)
* **권한:** 누구나 접근 가능 (단, `isHidden` 필터는 운영자만)

##### 요청 파라미터 (Query)

* `page` (integer, optional, default=1, min=1): 페이지 번호
* `limit` (integer, optional, default=20, min=1, max=100): 페이지당 항목 수
* `serviceId` (UUID, optional): 특정 서비스의 리뷰만 필터링
* `rating` (integer, optional, min=1, max=5): 특정 별점 필터링
* `isHidden` (boolean, optional): 숨김 처리된 리뷰 필터링 (운영자 전용)

##### 성공 응답 (200 OK)

```json
{
  "data": [
    {
      "id": "UUID",
      "customerId": "UUID",
      "customerName": "string",
      "profileImageUrl": "string | null",
      "serviceId": "UUID",
      "rating": "integer",
      "text": "string",
      "imageUrls": ["string", "..."],
      "isHidden": "boolean",
      "createdAt": "string (ISO 8601)"
    }
  ],
  "pagination": { ... }
}
```

##### 오류 응답

* **400 Bad Request**
* **401 Unauthorized** (`isHidden` 사용 시)
* **403 Forbidden** (`isHidden` 사용 시)
* **500 Internal Server Error**

---

## 5. 웹훅 이벤트 (Webhook Events)

Pronto 서비스 내에서 주요 이벤트 발생 시, 설정된 외부 URL(n8n/Make 등)로 실시간 알림(HTTP POST 요청)을 보냅니다. 요청 본문은 JSON 형식입니다.

* **웹훅 보안:** (선택 사항) 각 웹훅 요청 헤더에 `X-Pronto-Signature`와 같이 HMAC-SHA256 서명을 포함하여 수신 측에서 검증할 수 있도록 구현할 수 있습니다. (서명 생성/검증 로직 및 비밀 키 공유 필요)
* **재시도 정책:** 웹훅 발송 실패 시, 시스템은 최대 3회, 지수 백오프(Exponential Backoff) 방식으로 재시도를 시도할 수 있습니다. (구체적인 재시도 로직은 구현 시 결정)

### `payment.failed`

**트리거:** PortOne 결제 실패 또는 웹훅 검증 실패 시.
**페이로드:**

```json
{
  "event": "payment.failed",
  "timestamp": "string (ISO 8601)",
  "data": {
    "reservationId": "UUID | null",
    "customerId": "UUID | null",
    "amount": "number",
    "reason": "string",
    "portoneImpUid": "string | null",
    "portoneMerchantUid": "string"
  }
}
```

### `refund.failed`

**트리거:** PortOne 환불 API 호출 실패 시.
**페이로드:**

```json
{
  "event": "refund.failed",
  "timestamp": "string (ISO 8601)",
  "data": {
    "reservationId": "UUID",
    "customerId": "UUID",
    "amount": "number",
    "reason": "string",
    "portoneImpUid": "string"
  }
}
```

### `booking.create.failed`

**트리거:** 예약 정보 DB 저장 실패 시 (결제 성공 후 또는 결제 시뮬레이션 시).
**페이로드:**

```json
{
  "event": "booking.create.failed",
  "timestamp": "string (ISO 8601)",
  "data": {
    "customerId": "UUID",
    "serviceId": "UUID",
    "startTime": "string (ISO 8601)",
    "errorDetails": "string"
  }
}
```

### `booking.change.failed`

**트리거:** 예약 변경 처리 중 DB 업데이트 실패 시.
**페이로드:**

```json
{
  "event": "booking.change.failed",
  "timestamp": "string (ISO 8601)",
  "data": {
    "reservationId": "UUID",
    "customerId": "UUID",
    "newStartTime": "string (ISO 8601)",
    "errorDetails": "string"
  }
}
```

### `booking.cancel.failed`

**트리거:** 예약 취소 처리 중 DB 업데이트 실패 시 (환불 성공 후).
**페이로드:**

```json
{
  "event": "booking.cancel.failed",
  "timestamp": "string (ISO 8601)",
  "data": {
    "reservationId": "UUID",
    "customerId": "UUID",
    "errorDetails": "string"
  }
}
```

### `review.submit.failed`

**트리거:** 리뷰 정보 DB 저장 실패 시.
**페이로드:**

```json
{
  "event": "review.submit.failed",
  "timestamp": "string (ISO 8601)",
  "data": {
    "customerId": "UUID",
    "reservationId": "UUID",
    "errorDetails": "string"
  }
}
```

### `time.grant.failed` (적립 시간 부여 실패)

**트리거:** 리뷰 작성 후 적립 시간 부여(DB 업데이트) 실패 시.
**페이로드:**

```json
{
  "event": "time.grant.failed",
  "timestamp": "string (ISO 8601)",
  "data": {
    "customerId": "UUID",
    "reviewId": "UUID",
    "amountMinutes": 10,
    "errorDetails": "string"
  }
}
```

### `time.deduction.failed` (적립/쿠폰 시간 차감 실패)

**트리거:** 결제 성공 후 사용 시간 차감(DB 업데이트) 실패 시.
**페이로드:**

```json
{
  "event": "time.deduction.failed",
  "timestamp": "string (ISO 8601)",
  "data": {
    "customerId": "UUID",
    "reservationId": "UUID",
    "usedCouponIds": ["UUID", "..."],
    "usedAccumulatedTimeMinutes": "integer",
    "errorDetails": "string"
  }
}
```

### `system.function.error`

**트리거:** Supabase Edge Function 실행 중 예상치 못한 오류 발생 시.
**페이로드:**

```json
{
  "event": "system.function.error",
  "timestamp": "string (ISO 8601)",
  "data": {
    "functionName": "string",
    "errorMessage": "string",
    "stackTrace": "string | null"
  }
}
```

---

### (선택적 성공 이벤트)

#### `booking.confirmed`

예약(결제) 확정 시

```json
{
  "event": "booking.confirmed",
  "timestamp": "string (ISO 8601)",
  "data": {
    "id": "UUID",
    "customerId": "UUID",
    "serviceId": "UUID",
    "startTime": "string (ISO 8601)",
    "endTime": "string (ISO 8601)",
    "paidAmount": "number",
    "usedCouponIds": ["UUID", "..."],
    "usedAccumulatedTimeMinutes": "integer | null"
  }
}
```

#### `review.submitted.successful`

리뷰 제출 성공 시

```json
{
  "event": "review.submitted.successful",
  "timestamp": "string (ISO 8601)",
  "data": {
    "id": "UUID",
    "customerId": "UUID",
    "serviceId": "UUID",
    "rating": "integer",
    "text": "string",
    "imageUrls": ["string", "..."]
  }
}
```

#### `coupon.granted`

운영자가 쿠폰 부여 성공 시

```json
{
  "event": "coupon.granted",
  "timestamp": "string (ISO 8601)",
  "data": {
    "customerId": "UUID",
    "grantedCoupons": [
      {
        "id": "UUID",
        "valueMinutes": 30,
        "grantedAt": "string (ISO 8601)",
        "expiresAt": "string (ISO 8601)"
      }
    ]
  }
}
```

---

### 서비스 (Services)

#### GET `/api/v1/services/{serviceId}/available-times`

* **설명:** 특정 날짜의 예약 가능 시간 정보를 조회합니다. 24시간 기준 시간 슬롯 UI 표시에 필요한 모든 정보를 포함합니다.
* **권한:** 누구나 접근 가능

##### 요청 파라미터 (Path)
* `serviceId` (UUID, required): 조회할 서비스의 고유 ID

##### 요청 파라미터 (Query)
* `date` (string, required, format: `YYYY-MM-DD`): 조회할 날짜

##### 성공 응답 (200 OK)

```json
{
  "date": "YYYY-MM-DD",
  "operatingStartTime": "HH:MM",
  "operatingEndTime": "HH:MM",
  "minDurationMinutes": 60,
  "maxDurationMinutes": 1440,
  "timeStepMinutes": 30,
  "unavailableSlots": [
    { "start": "HH:MM", "end": "HH:MM" },
    { "start": "HH:MM", "end": "HH:MM" }
  ],
  "isClosed": false,
  "message": "휴무일인 경우 이유 메시지가 표시됩니다.",
  "currentTime": "HH:MM"
}
```

##### 응답 필드 설명
* `date`: 조회 대상 날짜
* `operatingStartTime`: 해당 날짜의 서비스 운영 시작 시간 (예: "06:00", KST 기준, HH:MM 형식). 휴무 시 `null` 또는 빈 값 가능.
* `operatingEndTime`: 해당 날짜의 서비스 운영 종료 시간 (예: "23:59", KST 기준, HH:MM 형식). 휴무 시 `null` 또는 빈 값 가능. 익일 00:00은 "24:00" 또는 "00:00"으로 표현 가능.
* `minDurationMinutes`: 최소 예약 가능 시간 (분 단위, 고정값: 60)
* `maxDurationMinutes`: 최대 예약 가능 시간 (분 단위, 예: 1440)
* `timeStepMinutes`: 시간 선택 단위 (분 단위, 고정값: 30)
* `unavailableSlots`: 해당 날짜의 **운영 시간 내에서** 예약 불가능한 시간 슬롯 목록 (KST 기준). 클라이언트에서는 이 정보를 활용하여 30분 단위 슬롯 UI에서 비활성화할 슬롯을 결정합니다.
  * `start`: 예약 불가 시작 시간 (HH:MM 형식, 30분 단위)
  * `end`: 예약 불가 종료 시간 (HH:MM 형식, 30분 단위)
  * 참고: 운영 시간 외 슬롯은 이 목록에 포함되지 않고, 클라이언트에서 `operatingStartTime`/`operatingEndTime`을 기준으로 자동으로 비활성화 처리합니다.
* `isClosed`: 해당 날짜의 휴무 여부 (boolean, true인 경우 전체 시간 예약 불가)
* `message`: 휴무일인 경우 표시할 메시지 (예: "정기 휴무일입니다", "특별 휴무일입니다")
* `currentTime`: 오늘(KST 기준)인 경우 현재 KST 시간 (HH:MM), 다른 날짜인 경우 null

##### 오류 응답
* **400 Bad Request:** 잘못된 날짜 형식

  ```json
  { "error": "INVALID_DATE_FORMAT", "message": "날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요." }
  ```
* **404 Not Found:** 해당 ID의 서비스를 찾을 수 없음

  ```json
  { "error": "SERVICE_NOT_FOUND", "message": "서비스 정보를 찾을 수 없습니다." }
  ```
* **500 Internal Server Error**

---

### 예약 연장 관련 API

#### 예약 연장 가능 여부 확인 API

* **URL:** `/api/reservations/:id/check-extension`
* **Method:** `GET`
* **권한:** 인증된 사용자 (예약 소유자)
* **기능:** 특정 예약에 대한 연장 가능 여부와 관련 정보를 확인
* **파라미터:**
  * **Path:**
    * `id`: 예약 ID (UUID)
  * **Query:**
    * `extension_minutes`: 연장하려는 시간(분) (기본값: 30)
* **요청 예시:**
```
GET /api/reservations/550e8400-e29b-41d4-a716-446655440000/check-extension?extension_minutes=30
```
* **응답:**
  * **성공 (200):**
```json
{
  "can_extend": true,
  "maximum_extension_minutes": 60,
  "estimated_price": 5000,
  "available_accumulated_time": 20,
  "available_coupons": [{
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "time_minutes": 30,
    "expires_at": "2025-06-01T00:00:00Z"
  }],
  "estimated_price_after_time_usage": 0,
  "grace_period_minutes": 10,
  "grace_period_ends_at": "2025-05-09T15:10:00Z",
  "reason": null
}
```
  * **실패 (400):**
```json
{
  "can_extend": false,
  "reason": "NEXT_SLOT_BOOKED" | "GRACE_PERIOD_EXCEEDED" | "SERVICE_CLOSED" | "INVALID_RESERVATION_STATUS"
}
```

#### 예약 연장 API

* **URL:** `/api/reservations/:id/extend`
* **Method:** `POST`
* **권한:** 인증된 사용자 (예약 소유자)
* **기능:** 기존 예약 시간을 연장하고 추가 요금 결제 처리
* **파라미터:**
  * **Path:**
    * `id`: 예약 ID (UUID)
  * **Body:**
```json
{
  "extension_minutes": 30,
  "use_accumulated_time": true,
  "coupon_ids": ["550e8400-e29b-41d4-a716-446655440001"],
  "payment_info": {
    "imp_uid": "imp_123456789",
    "merchant_uid": "order_ext_123456789"
  }
}
```
* **요청 예시:**
```
POST /api/reservations/550e8400-e29b-41d4-a716-446655440000/extend
Content-Type: application/json

{
  "extension_minutes": 30,
  "use_accumulated_time": true,
  "coupon_ids": ["550e8400-e29b-41d4-a716-446655440001"],
  "payment_info": {
    "imp_uid": "imp_123456789",
    "merchant_uid": "order_ext_123456789"
  }
}
```
* **응답:**
  * **성공 (200):**
```json
{
  "success": true,
  "reservation": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "service_id": "550e8400-e29b-41d4-a716-446655440000",
    "start_time": "2025-05-09T13:00:00Z",
    "end_time": "2025-05-09T15:30:00Z",
    "status": "confirmed",
    "paid_amount": 15000,
    "extended_paid_amount": 5000,
    "extension_count": 1,
    "last_extended_at": "2025-05-09T14:55:00Z"
  }
}
```
  * **실패 (400/409):**
```json
{
  "success": false,
  "code": "EXTENSION_FAILED",
  "message": "예약 연장에 실패했습니다.",
  "reason": "NEXT_SLOT_BOOKED" | "GRACE_PERIOD_EXCEEDED" | "SERVICE_CLOSED" | "INVALID_RESERVATION_STATUS" | "PAYMENT_VERIFICATION_FAILED" | "CONCURRENT_EXTENSION"
}
```

## 6. 웹훅 & 콜백 엔드포인트

### PortOne 웹훅 - 동시 예약 처리

* **URL:** `/api/payments/portone-webhook`
* **Method:** `POST`
* **기능:** PortOne 결제 웹훅 처리 및 동시 예약 충돌 시 자동 환불
* **파라미터:**
  * **Body:** (PortOne 웹훅 요청 형식 - 문서 참조)
* **응답:**
  * **성공 (200):** 성공적으로 처리 완료 (웹훅 처리는 응답 코드로만 확인)
* **세부 처리 로직 요약:**
  1. PortOne 웹훅 유효성 검증
  2. `DB 트랜잭션 시작`
  3. 예약 정보 조회 및 확인
  4. 해당 시간대 중복 예약 여부 최종 확인 (UNIQUE 제약 조건 활용)
  5. 중복 감지 시: 트랜잭션 롤백 → 자동 환불 API 호출 → 사용자에게 알림톡 발송
  6. 정상 처리 시: 예약 확정 처리 → 트랜잭션 커밋 → 예약 확정 알림톡 발송
* **특이사항:**
  * 이 API는 Frontend에서 직접 호출하지 않으며, PortOne 서버에서만 요청 수신
  * 동시 예약 충돌 시 자동 환불 처리 로직은 서버 사이드에서만 처리

### 자동 알림 - 예약 만료 임박 및 연장 안내

* **URL:** `/api/internal/send-renewal-reminders`
* **Method:** `POST`
* **권한:** 서비스 롤 토큰 (내부적으로만 호출)
* **기능:** 예약 종료 15분 전 고객에게 퇴실 안내 및 연장 가능 여부 알림
* **파라미터:** 없음 (Cron Job에서 주기적 호출)
* **응답:**
  * **성공 (200):**
```json
{
  "success": true,
  "sent_count": 5,
  "failed_count": 0
}
```
* **특이사항:**
  * 이 API는 Supabase pg_cron을 통해 1분 간격으로 자동 호출
  * 연장 가능 조건 확인 후 분기하여 적절한 알림톡 템플릿 선택 발송

*end of document*
