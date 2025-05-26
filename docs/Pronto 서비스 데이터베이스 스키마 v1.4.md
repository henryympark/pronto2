# Pronto 서비스 데이터베이스 스키마 v1.4 (2025년 5월 26일 업데이트)

*(참고: 본 문서는 PRD v4.23 및 TDD v2.0을 기준으로 작성되었습니다.)*
**(변경 이력: v1.4 - 2025년 5월 26일, 실제 구현된 마이그레이션 파일들과 동기화, 구현 완료된 기능들 반영; v1.3 - 2025년 5월 10일, 시간 선택 UI UX 상세화에 따른 API 응답 필드 설명 보완; v1.2 - 2025년 5월 9일, 예약 연장 및 동시간대 예약 처리를 위한 제약 조건 추가)**

---

## 1. 개요 (Overview)

| 항목         | 내용                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------- |
| **데이터베이스** | PostgreSQL (via Supabase)                                                                     |
| **설계 목표**  | 서비스 요구사항(PRD v4.23)을 충족하며, **데이터 정합성·확장성·성능**을 고려하여 설계합니다. 정규화를 통해 데이터 중복을 최소화하고 관계를 명확히 합니다. |
| **구현 상태**  | 본 문서는 **실제 구현된 마이그레이션 파일들**을 기반으로 작성되었으며, 현재 운영 중인 데이터베이스 스키마를 정확히 반영합니다.  |

---

## 2. 엔티티 및 관계 설명 (Entities & Relationships)

### 주요 엔티티 (구현 완료)

| 엔티티                                  | 설명                                                                         | 구현 상태 |
| ------------------------------------ | -------------------------------------------------------------------------- | ----- |
| **고객 (customers)**                   | 서비스를 이용하는 사용자 정보 *(일반 고객 및 운영자 포함)*. Supabase 인증 시스템(`auth.users`)과 연결됩니다. | ✅ 완료 |
| **서비스 (services)**                   | 예약 대상이 되는 공간 또는 서비스 정보.                                                    | ✅ 완료 |
| **예약 (reservations)**                | 고객이 특정 서비스(공간)를 특정 시간에 예약한 정보.                                             | ✅ 완료 |
| **리뷰 (reviews)**                     | 고객이 이용 완료한 예약에 대해 작성한 후기 *(별점, 텍스트, 이미지 포함)*.                              | ✅ 완료 |
| **리뷰 이미지 (review_images)**           | 리뷰에 첨부된 이미지 정보.                                                           | ✅ 완료 |
| **쿠폰 (customer\_coupons)**           | 운영자가 고객에게 부여한 쿠폰 정보.                                                       | ✅ 완료 |
| **휴무일 (holidays)**                   | 운영자가 설정한 날짜 단위 예약 불가 정보.                                                   | ✅ 완료 |
| **서비스 운영시간 (service_operating_hours)** | 서비스별 요일별 운영 시간 정보.                                                        | ✅ 완료 |
| **차단된 시간 (blocked_times)**           | 특정 날짜의 예약 불가 시간대 정보.                                                       | ✅ 완료 |

### 주요 관계

* **고객(1) : 예약(N)**
* **고객(1) : 리뷰(N)**
* **고객(1) : 쿠폰(N)**
* **서비스(1) : 예약(N)**
* **서비스(1) : 리뷰(N)**
* **서비스(1) : 운영시간(N)**
* **서비스(1) : 차단된 시간(N)**
* **서비스(1) : 휴무일(N)**
* **예약(1) : 리뷰(1)**
* **리뷰(1) : 리뷰 이미지(N)**

---

## 3. 실제 구현된 데이터 모델 (Implemented Data Model)

### 3‑1. 고객 (customers) - ✅ 구현 완료

| 항목        | 내용                                                                                                                                                                                                                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **목적**    | 고객 정보 및 인증 관련 데이터 관리.                                                                                                                                                                                                                                                 |
| **주요 정보** | 고유 식별자 *(Supabase Auth 연동)*, 이메일, 닉네임, 전화번호, **인증 방식**(`email`,`kakao`,`naver`), **역할**(`customer`,`admin`), 활성 상태, `accumulated_time_minutes` (적립 시간 잔액), 관리자 메모, 생성/수정/삭제 시각. |

**실제 구현된 컬럼:**
* `id`: UUID PRIMARY KEY (auth.users와 연결)
* `email`: TEXT
* `nickname`: TEXT
* `phone`: TEXT
* `auth_provider`: TEXT NOT NULL DEFAULT 'email'
* `role`: TEXT NOT NULL DEFAULT 'customer'
* `is_active`: BOOLEAN NOT NULL DEFAULT true
* `accumulated_time_minutes`: INTEGER NOT NULL DEFAULT 0
* `memo`: TEXT (관리자 메모)
* `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
* `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
* `deleted_at`: TIMESTAMPTZ

### 3‑2. 서비스 (services) - ✅ 구현 완료

| 항목        | 내용                                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **목적**    | 제공되는 예약 서비스(공간) 정보 관리.                                                                                                                                  |
| **주요 정보** | 고유 식별자, 서비스 코드(slug), 서비스명, 설명, 시간당 가격, 위치, 대표 이미지 URL, 주의사항/약관, 환불 정책, **평균 별점**, 리뷰 수, 생성/수정 시각 |

**실제 구현된 컬럼:**
* `id`: UUID PRIMARY KEY
* `slug`: TEXT UNIQUE NOT NULL
* `name`: TEXT NOT NULL
* `description`: TEXT
* `price_per_hour`: INTEGER NOT NULL
* `location`: TEXT
* `image_url`: TEXT
* `notice`: TEXT
* `refund_policy`: TEXT
* `average_rating`: FLOAT DEFAULT 0
* `review_count`: INTEGER DEFAULT 0
* `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
* `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### 3‑3. 예약 (reservations) - ✅ 구현 완료

| 항목        | 내용                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **목적**    | 고객의 예약 정보 관리.                                                                                                                                                                                     |
| **주요 정보** | 고유 식별자, **고객 ID**, **서비스 ID**, 예약 날짜, 시작/종료 시간, 총 이용시간, 총 가격, **예약 상태**, 고객명, 회사명, 촬영 목적, 차량번호, 결제 정보, 환불 정보, 가격 변동 정보, 리뷰 작성 여부, 관리자 메모, 생성/수정 시각 |

**실제 구현된 컬럼:**
* `id`: UUID PRIMARY KEY
* `service_id`: UUID NOT NULL REFERENCES services(id)
* `customer_id`: UUID NOT NULL REFERENCES auth.users(id)
* `reservation_date`: DATE NOT NULL
* `start_time`: TEXT NOT NULL (HH:MM 형식)
* `end_time`: TEXT NOT NULL (HH:MM 형식)
* `total_hours`: INTEGER
* `total_price`: INTEGER
* `status`: TEXT NOT NULL DEFAULT 'pending'
* `customer_name`: TEXT NOT NULL
* `company_name`: TEXT
* `shooting_purpose`: TEXT
* `vehicle_number`: TEXT
* `admin_memo`: TEXT
* `payment_id`: TEXT
* `payment_amount`: INTEGER
* `paid_amount`: INTEGER DEFAULT 0
* `refunded`: BOOLEAN DEFAULT false
* `refunded_at`: TIMESTAMPTZ
* `original_total_price`: INTEGER
* `recalculated_total_amount`: INTEGER
* `pending_payment_amount`: INTEGER DEFAULT 0
* `pending_refund_amount`: INTEGER DEFAULT 0
* `has_review`: BOOLEAN NOT NULL DEFAULT false
* `used_accumulated_time_minutes`: INTEGER DEFAULT 0
* `used_coupon_ids`: UUID[] DEFAULT '{}'
* `privacy_agreed`: BOOLEAN DEFAULT false
* `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
* `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### 3‑4. 리뷰 (reviews) - ✅ 구현 완료

| 항목        | 내용                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------- |
| **목적**    | 고객 리뷰 정보 관리.                                                                                             |
| **주요 정보** | 고유 식별자, 작성 고객 ID, 관련 예약 ID, 관련 서비스 ID, 별점, 리뷰 텍스트, 숨김 여부, 생성/수정/삭제 시각 |

**실제 구현된 컬럼:**
* `id`: UUID PRIMARY KEY
* `customer_id`: UUID NOT NULL REFERENCES auth.users(id)
* `service_id`: UUID NOT NULL REFERENCES services(id)
* `reservation_id`: UUID NOT NULL REFERENCES reservations(id)
* `rating`: INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5)
* `content`: TEXT NOT NULL CHECK (char_length(content) BETWEEN 10 AND 1000)
* `is_hidden`: BOOLEAN NOT NULL DEFAULT false
* `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
* `updated_at`: TIMESTAMPTZ
* `deleted_at`: TIMESTAMPTZ

### 3‑5. 리뷰 이미지 (review_images) - ✅ 구현 완료

| 항목        | 내용                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------- |
| **목적**    | 리뷰에 첨부된 이미지 정보 관리.                                                                                             |
| **주요 정보** | 고유 식별자, 리뷰 ID, 이미지 URL, 생성 시각 |

**실제 구현된 컬럼:**
* `id`: UUID PRIMARY KEY
* `review_id`: UUID NOT NULL REFERENCES reviews(id)
* `image_url`: TEXT NOT NULL
* `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### 3‑6. 쿠폰 (customer\_coupons) - ✅ 구현 완료

| 항목        | 내용                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| **목적**    | 고객에게 부여된 쿠폰 정보 관리.                                                                                           |
| **주요 정보** | 고유 ID, 고객 ID, **쿠폰 값**(30분 고정), 부여 일시, **만료 일시**(발급일+3개월), 사용 일시, 사용된 예약 ID |

**실제 구현된 컬럼:**
* `id`: UUID PRIMARY KEY
* `customer_id`: UUID NOT NULL REFERENCES customers(id)
* `value_minutes`: INTEGER NOT NULL DEFAULT 30
* `granted_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
* `expires_at`: TIMESTAMPTZ NOT NULL
* `used_at`: TIMESTAMPTZ
* `used_reservation_id`: UUID REFERENCES reservations(id)

### 3‑7. 휴무일 (holidays) - ✅ 구현 완료

| 항목        | 내용                                      |
| --------- | --------------------------------------- |
| **목적**    | 운영자가 설정한 특정 날짜의 휴무일 정보 관리.                 |
| **주요 정보** | 고유 ID, 서비스 ID, 휴무 날짜, 설명, 생성/수정 시각 |

**실제 구현된 컬럼:**
* `id`: UUID PRIMARY KEY
* `service_id`: UUID NOT NULL REFERENCES services(id)
* `holiday_date`: DATE NOT NULL
* `description`: TEXT
* `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
* `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### 3‑8. 서비스 운영시간 (service_operating_hours) - ✅ 구현 완료

| 항목        | 내용                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------- |
| **목적**    | 서비스별 요일별 운영 시간 정보 관리.                                                    |
| **주요 정보** | 고유 ID, 서비스 ID, 요일(0-6), 시작/종료 시간, 휴무 여부, 생성/수정 시각 |

**실제 구현된 컬럼:**
* `id`: UUID PRIMARY KEY
* `service_id`: UUID NOT NULL REFERENCES services(id)
* `day_of_week`: SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6)
* `start_time`: TEXT NOT NULL
* `end_time`: TEXT NOT NULL
* `is_closed`: BOOLEAN NOT NULL DEFAULT false
* `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
* `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

### 3‑9. 차단된 시간 (blocked_times) - ✅ 구현 완료

| 항목        | 내용                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------- |
| **목적**    | 특정 날짜의 예약 불가 시간대 정보 관리.                                                    |
| **주요 정보** | 고유 ID, 서비스 ID, 차단 날짜, 시작/종료 시간, 설명, 생성/수정 시각 |

**실제 구현된 컬럼:**
* `id`: UUID PRIMARY KEY
* `service_id`: UUID NOT NULL REFERENCES services(id)
* `blocked_date`: DATE NOT NULL
* `start_time`: TEXT NOT NULL
* `end_time`: TEXT NOT NULL
* `description`: TEXT
* `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
* `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT now()

---

## 4. 구현된 마이그레이션 파일 목록

다음은 실제 구현되어 적용된 마이그레이션 파일들입니다:

### 기본 테이블 생성
- `0001_create_customers_table.sql` - 고객 테이블 생성
- `0002_create_admin_user.sql` - 관리자 사용자 생성
- `0003_create_services_table.sql` - 서비스 테이블 생성
- `0004_create_reservations_table.sql` - 예약 테이블 생성
- `0005_create_operating_hours_blocked_times.sql` - 운영시간 및 차단시간 테이블 생성

### 기능 확장
- `0006_add_reservation_date.sql` - 예약 날짜 필드 추가 및 시간 형식 변경
- `0007_create_services_bucket.sql` - 서비스 이미지 스토리지 버킷 생성
- `0010_add_price_change_fields.sql` - 가격 변동 추적 필드 추가
- `0011_add_refund_fields.sql` - 환불 관련 필드 추가
- `0013_create_reviews_table.sql` - 리뷰 테이블 생성
- `0014_create_customer_coupons_table.sql` - 쿠폰 테이블 생성
- `0015_add_accumulated_time_to_customers.sql` - 적립시간 필드 추가
- `0016_create_holidays_table.sql` - 휴무일 테이블 생성
- `0017_add_memo_to_customers.sql` - 고객 메모 필드 추가

### 권한 및 보안
- `20250514000000_fix_customers_rls.sql` - RLS 정책 수정
- `20250515000000_add_admin_check_functions.sql` - 관리자 권한 확인 함수
- `20250516000000_debug_admin_access.sql` - 관리자 접근 디버깅
- `20250517000000_remove_automatic_admin_assignment.sql` - 자동 관리자 할당 제거
- `20250518000000_add_create_customer_function.sql` - 고객 생성 함수 추가
- `20250519000000_fix_admin_login.sql` - 관리자 로그인 수정
- `20250519000000_fix_customer_mypage.sql` - 고객 마이페이지 수정
- `20250520000000_add_rpc_functions.sql` - RPC 함수 추가
- `20250521000000_add_user_triggers.sql` - 사용자 트리거 추가

---

## 5. 주요 제약 조건 및 인덱스

### 제약 조건
- **예약 중복 방지**: `UNIQUE(service_id, reservation_date, start_time)` WHERE `status` IN ('pending', 'confirmed')
- **리뷰 중복 방지**: `UNIQUE(reservation_id)` - 예약당 하나의 리뷰만 허용
- **쿠폰 유효성**: `CHECK(expires_at > granted_at)`
- **별점 범위**: `CHECK(rating BETWEEN 1 AND 5)`
- **리뷰 길이**: `CHECK(char_length(content) BETWEEN 10 AND 1000)`

### 주요 인덱스
- 고객: `email`, `auth_provider`, `role`, `is_active`
- 예약: `service_id`, `customer_id`, `reservation_date`, `status`
- 리뷰: `service_id`, `customer_id`, `reservation_id`
- 쿠폰: `customer_id`, `expires_at`, `used_at`

---

## 6. RLS (Row Level Security) 정책

모든 테이블에 RLS가 활성화되어 있으며, 다음과 같은 정책이 적용됩니다:

### 고객 (customers)
- 사용자는 자신의 정보만 조회/수정 가능
- 관리자는 모든 고객 정보 조회/수정 가능

### 예약 (reservations)
- 사용자는 자신의 예약만 조회/생성/수정/삭제 가능
- 관리자는 모든 예약 관리 가능

### 리뷰 (reviews)
- 모든 사용자는 공개된 리뷰 조회 가능
- 사용자는 자신의 리뷰만 생성/수정/삭제 가능
- 관리자는 모든 리뷰 관리 가능

### 쿠폰 (customer_coupons)
- 사용자는 자신의 쿠폰만 조회 가능
- 관리자는 모든 쿠폰 관리 가능

---

## 7. 트리거 및 함수

### 자동 업데이트 트리거
- `updated_at` 필드 자동 갱신 트리거가 모든 주요 테이블에 적용됨

### 사용자 관리 함수
- `handle_new_user()`: 새 사용자 생성 시 customers 테이블에 자동 추가
- `sync_missing_customers()`: 기존 사용자를 customers 테이블에 동기화
- `get_user_reservations()`: 사용자 예약 정보 조회 RPC 함수
- `get_user_dashboard_data()`: 사용자 대시보드 데이터 조회 RPC 함수

### 리뷰 관리 함수
- `update_reservation_has_review()`: 리뷰 작성 시 예약의 has_review 필드 업데이트
- `update_reservation_has_review_on_delete()`: 리뷰 삭제 시 예약의 has_review 필드 업데이트

---

## 8. 미구현 기능 (향후 개발 예정)

다음 기능들은 문서에는 정의되어 있지만 아직 구현되지 않았습니다:

### 예약 연장 관련 필드
- `extension_count`: 예약 연장 횟수
- `last_extended_at`: 마지막 연장 시간
- `extended_paid_amount`: 연장으로 추가 결제된 총 금액

### 다중 업체 지원
- `businesses`: 업체 정보 테이블
- `business_members`: 업체 멤버 관계 테이블

---

## 9. 버전 관리 및 변경 이력

### v1.4 (2025년 5월 26일)
- 실제 구현된 마이그레이션 파일들과 동기화
- 구현 완료된 기능들 상태 반영
- 미구현 기능들 명시
- RLS 정책 및 트리거 함수 정보 추가

### v1.3 (2025년 5월 10일)
- 시간 선택 UI UX 상세화에 따른 API 응답 필드 설명 보완

### v1.2 (2025년 5월 9일)
- 예약 연장 및 동시간대 예약 처리를 위한 제약 조건 추가

---

*본 문서는 실제 운영 중인 데이터베이스 스키마를 정확히 반영하며, 향후 기능 추가 시 지속적으로 업데이트됩니다.* 