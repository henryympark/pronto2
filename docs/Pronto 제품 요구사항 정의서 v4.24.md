# Pronto 제품 요구사항 정의서 v4.24 (2025년 5월 26일 업데이트)

*(참고: 본 문서는 TDD v2.0, 데이터베이스 스키마 v1.4, API 명세서 v1.4를 기준으로 작성되었습니다.)*
**(변경 이력: v4.24 - 2025년 5월 26일, 실제 구현된 기능들 상태 업데이트, 소셜 로그인 등 완료된 기능들 반영; v4.23 - 2025년 5월 10일, 시간 선택 UI UX 상세화에 따른 요구사항 보완; v4.22 - 2025년 5월 9일, 예약 연장 및 동시간대 예약 처리를 위한 요구사항 추가)**

---

## 1. 개요 (Overview)

| 항목         | 내용                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------- |
| **프로젝트명** | Pronto (프론토) - 스튜디오 예약 서비스                                                                     |
| **버전**     | v4.24                                                                                         |
| **작성일**    | 2025년 5월 26일                                                                                 |
| **목적**     | 스튜디오 공간 예약 및 관리를 위한 웹 서비스의 제품 요구사항 정의                                                        |
| **구현 상태**  | 본 문서는 **실제 구현된 기능들**을 기반으로 작성되었으며, 현재 운영 중인 서비스의 기능을 정확히 반영합니다.                      |

---

## 2. 프로젝트 배경 및 목표 (Project Background & Objectives)

### 2.1 배경
스튜디오 예약 시스템의 디지털화를 통해 고객과 운영자 모두에게 편리한 예약 관리 서비스를 제공합니다.

### 2.2 목표
- **고객**: 직관적이고 편리한 예약 시스템 제공
- **운영자**: 효율적인 예약 및 고객 관리 도구 제공
- **시스템**: 안정적이고 확장 가능한 서비스 구조 구축

---

## 3. 사용자 역할 및 권한 (User Roles & Permissions)

### 3.1 구현 완료된 사용자 역할

| 역할       | 설명                    | 주요 권한                                                                                      | 구현 상태 |
| -------- | --------------------- | ------------------------------------------------------------------------------------------ | ----- |
| **고객**   | 서비스를 이용하는 일반 사용자      | 예약 생성/조회/변경/취소, 리뷰 작성, 마이페이지 이용, 적립시간 사용                                                  | ✅ 완료 |
| **관리자**  | 서비스를 운영하는 관리자         | 모든 예약 관리, 고객 관리, 서비스 설정, 쿠폰 부여, 리뷰 관리, 운영시간/휴무일 설정                                        | ✅ 완료 |

### 3.2 인증 방식 (구현 완료)

| 인증 방식    | 설명                    | 구현 상태 |
| -------- | --------------------- | ----- |
| **이메일 로그인** | 이메일과 비밀번호를 통한 기본 로그인 | ✅ 완료 |
| **카카오 로그인** | 카카오 계정을 통한 소셜 로그인    | ✅ 완료 |
| **네이버 로그인** | 네이버 계정을 통한 소셜 로그인    | ✅ 완료 |

---

## 4. 기능 요구사항 (Functional Requirements)

### 4.1 사용자 인증 (F‑AUTH) - ✅ 구현 완료

* **F‑AUTH‑001**: ✅ **완료** - 사용자는 로그인 페이지(P‑001)에서 **이메일**을 통해 로그인할 수 있다.
* **F‑AUTH‑002**: ✅ **완료** - (카카오 로그인) 사용자는 카카오 로그인 버튼을 통해 카카오 계정으로 서비스에 로그인할 수 있다. (최초 로그인 시 사용자 정보를 기반으로 `customers` 테이블에 신규 레코드 생성)
* **F‑AUTH‑003**: ✅ **완료** - (네이버 로그인) 사용자는 네이버 로그인 버튼을 통해 네이버 계정으로 서비스에 로그인할 수 있다. (최초 로그인 시 사용자 정보를 기반으로 `customers` 테이블에 신규 레코드 생성)
* **F‑AUTH‑004**: ✅ **완료** - (이메일 로그인 – 고객) 일반 고객은 이메일 주소와 비밀번호를 입력하여 서비스에 로그인할 수 있다.
* **F‑AUTH‑005**: ✅ **완료** - (이메일 로그인 – 관리자) 관리자는 이메일 주소와 비밀번호를 입력하여 관리자 페이지에 로그인할 수 있다.
* **F‑AUTH‑006**: ✅ **완료** - 사용자는 회원가입 페이지에서 이메일, 비밀번호, 닉네임, 전화번호를 입력하여 계정을 생성할 수 있다.
* **F‑AUTH‑007**: ✅ **완료** - 사용자는 로그아웃 기능을 통해 현재 세션을 종료할 수 있다.

### 4.2 예약 관리 (F‑RESERVATION) - ✅ 구현 완료

* **F‑RESERVATION‑001**: ✅ **완료** - 고객은 서비스 상세 페이지에서 날짜와 시간을 선택하여 예약을 생성할 수 있다.
* **F‑RESERVATION‑002**: ✅ **완료** - 고객은 예약 시 고객명, 회사명, 촬영 목적, 차량번호 등의 정보를 입력할 수 있다.
* **F‑RESERVATION‑003**: ✅ **완료** - 고객은 마이페이지에서 자신의 예약 목록을 조회할 수 있다.
* **F‑RESERVATION‑004**: ✅ **완료** - 고객은 예약 상세 페이지에서 예약 정보를 확인할 수 있다.
* **F‑RESERVATION‑005**: ✅ **완료** - 고객은 예약을 변경하거나 취소할 수 있다.
* **F‑RESERVATION‑006**: ✅ **완료** - 관리자는 모든 예약을 조회하고 관리할 수 있다.
* **F‑RESERVATION‑007**: ✅ **완료** - 관리자는 예약 상태를 변경할 수 있다. (pending, confirmed, canceled, completed, modified)
* **F‑RESERVATION‑008**: ✅ **완료** - 시스템은 예약 시간 중복을 방지한다.
* **F‑RESERVATION‑009**: ✅ **완료** - 시스템은 운영시간 외 예약을 방지한다.
* **F‑RESERVATION‑010**: ✅ **완료** - 시스템은 휴무일 예약을 방지한다.

### 4.3 서비스 관리 (F‑SERVICE) - ✅ 구현 완료

* **F‑SERVICE‑001**: ✅ **완료** - 고객은 서비스 목록을 조회할 수 있다.
* **F‑SERVICE‑002**: ✅ **완료** - 고객은 서비스 상세 정보를 확인할 수 있다.
* **F‑SERVICE‑003**: ✅ **완료** - 고객은 특정 날짜의 예약 가능한 시간을 조회할 수 있다.
* **F‑SERVICE‑004**: ✅ **완료** - 관리자는 서비스 정보를 관리할 수 있다.
* **F‑SERVICE‑005**: ✅ **완료** - 관리자는 서비스별 운영시간을 설정할 수 있다.
* **F‑SERVICE‑006**: ✅ **완료** - 관리자는 특정 날짜를 휴무일로 설정할 수 있다.
* **F‑SERVICE‑007**: ✅ **완료** - 관리자는 특정 시간대를 차단할 수 있다.

### 4.4 리뷰 관리 (F‑REVIEW) - ✅ 구현 완료

* **F‑REVIEW‑001**: ✅ **완료** - 고객은 완료된 예약에 대해 리뷰를 작성할 수 있다.
* **F‑REVIEW‑002**: ✅ **완료** - 고객은 리뷰 작성 시 별점(1-5점)과 텍스트를 입력할 수 있다.
* **F‑REVIEW‑003**: ✅ **완료** - 고객은 리뷰에 이미지를 첨부할 수 있다.
* **F‑REVIEW‑004**: ✅ **완료** - 고객은 자신이 작성한 리뷰를 수정하거나 삭제할 수 있다.
* **F‑REVIEW‑005**: ✅ **완료** - 모든 사용자는 공개된 리뷰를 조회할 수 있다.
* **F‑REVIEW‑006**: ✅ **완료** - 관리자는 모든 리뷰를 관리할 수 있다.
* **F‑REVIEW‑007**: ✅ **완료** - 관리자는 부적절한 리뷰를 숨김 처리할 수 있다.
* **F‑REVIEW‑008**: ✅ **완료** - 시스템은 리뷰 작성 시 고객에게 적립시간(10분)을 부여한다.

### 4.5 쿠폰 및 적립시간 관리 (F‑COUPON) - ✅ 구현 완료

* **F‑COUPON‑001**: ✅ **완료** - 관리자는 고객에게 쿠폰(30분)을 부여할 수 있다.
* **F‑COUPON‑002**: ✅ **완료** - 고객은 보유한 쿠폰을 조회할 수 있다.
* **F‑COUPON‑003**: ✅ **완료** - 고객은 예약 시 쿠폰을 사용할 수 있다.
* **F‑COUPON‑004**: ✅ **완료** - 쿠폰은 발급일로부터 3개월 후 만료된다.
* **F‑COUPON‑005**: ✅ **완료** - 고객은 적립시간을 예약 시 사용할 수 있다.
* **F‑COUPON‑006**: ✅ **완료** - 시스템은 리뷰 작성 시 자동으로 적립시간을 부여한다.

### 4.6 관리자 기능 (F‑ADMIN) - ✅ 구현 완료

* **F‑ADMIN‑001**: ✅ **완료** - 관리자는 고객 목록을 조회할 수 있다.
* **F‑ADMIN‑002**: ✅ **완료** - 관리자는 고객 정보를 수정할 수 있다.
* **F‑ADMIN‑003**: ✅ **완료** - 관리자는 새로운 고객을 등록할 수 있다.
* **F‑ADMIN‑004**: ✅ **완료** - 관리자는 고객에게 메모를 추가할 수 있다.
* **F‑ADMIN‑005**: ✅ **완료** - 관리자는 예약 현황을 대시보드에서 확인할 수 있다.
* **F‑ADMIN‑006**: ✅ **완료** - 관리자는 고객을 대신하여 예약을 생성할 수 있다.

### 4.7 미구현 기능 (향후 개발 예정)

#### 예약 연장 (F‑EXTENSION) - 🔄 미구현
* **F‑EXTENSION‑001**: 고객은 진행 중인 예약을 연장할 수 있다.
* **F‑EXTENSION‑002**: 예약 연장 시 추가 요금이 계산된다.
* **F‑EXTENSION‑003**: 연장 이력이 기록된다.

#### 결제 연동 (F‑PAYMENT) - 🔄 미구현
* **F‑PAYMENT‑001**: 고객은 PortOne을 통해 결제할 수 있다.
* **F‑PAYMENT‑002**: 시스템은 결제 상태를 추적한다.
* **F‑PAYMENT‑003**: 환불 처리가 가능하다.

#### 알림 시스템 (F‑NOTIFICATION) - 🔄 미구현
* **F‑NOTIFICATION‑001**: 예약 확정 시 카카오 알림톡이 발송된다.
* **F‑NOTIFICATION‑002**: 예약 변경/취소 시 알림이 발송된다.
* **F‑NOTIFICATION‑003**: 결제 완료 시 알림이 발송된다.

---

## 5. 페이지 구조 및 기능 (Page Structure & Features)

### 5.1 구현 완료된 페이지

| 페이지 코드    | 페이지명           | 주요 기능                                                                                      | 구현 상태 |
| --------- | -------------- | ------------------------------------------------------------------------------------------ | ----- |
| **P‑001** | 로그인 페이지        | 이메일 로그인, 카카오 로그인, 네이버 로그인, 회원가입 링크                                                        | ✅ 완료 |
| **P‑002** | 서비스 상세 페이지     | 서비스 정보 표시, 날짜/시간 선택, 예약 생성                                                               | ✅ 완료 |
| **P‑101** | 관리자 예약 관리      | 예약 목록 조회, 예약 상세 확인, 상태 변경, 대리 예약                                                         | ✅ 완료 |
| **P‑103** | 관리자 고객 관리      | 고객 목록 조회, 고객 정보 수정, 신규 고객 등록, 쿠폰 부여                                                     | ✅ 완료 |
| **P‑104** | 관리자 고객 상세      | 고객 상세 정보, 예약 이력, 리뷰 이력, 쿠폰 이력                                                           | ✅ 완료 |
| **P‑107** | 관리자 리뷰 관리      | 리뷰 목록 조회, 리뷰 숨김/삭제 처리                                                                   | ✅ 완료 |
| **P‑201** | 마이페이지 예약 내역    | 사용자 예약 목록, 예약 상세 확인, 예약 변경/취소                                                           | ✅ 완료 |
| **P‑202** | 마이페이지 리뷰 관리    | 사용자 리뷰 목록, 리뷰 작성/수정/삭제                                                                  | ✅ 완료 |
| **P‑203** | 예약 변경 페이지      | 기존 예약 정보 표시, 새로운 날짜/시간 선택, 가격 변동 표시                                                     | ✅ 완료 |

### 5.2 관리자 기능 요약

| 기능 분류    | 페이지 코드        | 주요 기능                                                                                      | 구현 상태 |
| -------- | -------------- | ------------------------------------------------------------------------------------------ | ----- |
| 예약 관리    | **P‑101**      | 예약 목록·상세(결제·요청사항·변경 이력·메모) 확인, **직접 변경/취소** 가능                                           | ✅ 완료 |
| 고객 관리    | **P‑103/104** | 고객 목록(가입 방식·적립/쿠폰) 조회, 신규 등록, **쿠폰 30분 부여**                                             | ✅ 완료 |
| 리뷰 관리    | **P‑107**      | 리뷰 목록(별점) 확인, **숨김/삭제**                                                                 | ✅ 완료 |
| 대리 예약    | **P‑101/105** | 고객 선택/등록 → 날짜·시간 선택 → 메모 입력 → 예약 생성                                                     | ✅ 완료 |
| 알림 수신    | –             | 신규 예약·결제 완료·고객 변경/취소 등 **카카오톡 알림**                                                     | 🔄 미구현 |

---

## 6. 비기능 요구사항 (Non-Functional Requirements)

### 6.1 성능 요구사항 (Performance)
- **응답 시간**: API 응답 시간 3초 이내
- **동시 사용자**: 최대 100명 동시 접속 지원
- **가용성**: 99.9% 서비스 가용성 목표

### 6.2 보안 요구사항 (Security)
- **인증**: Supabase Auth 기반 JWT 토큰 인증
- **권한**: RLS(Row Level Security) 정책 적용
- **데이터 보호**: HTTPS 통신 필수
- **개인정보**: 개인정보보호법 준수

### 6.3 호환성 요구사항 (Compatibility)
- **브라우저**: Chrome, Safari, Firefox, Edge 최신 버전
- **모바일**: 반응형 웹 디자인 지원
- **접근성**: WCAG 2.1 AA 수준 준수

---

## 7. 기술 스택 (Technology Stack)

### 7.1 구현된 기술 스택

| 분류        | 기술                                    | 버전      | 용도                    |
| --------- | ------------------------------------- | ------- | --------------------- |
| **프론트엔드** | Next.js                               | 15.3.2  | React 기반 풀스택 프레임워크   |
| **언어**     | TypeScript                            | 5.x     | 타입 안전성 보장           |
| **스타일링**   | Tailwind CSS                          | 3.x     | 유틸리티 기반 CSS 프레임워크  |
| **UI 컴포넌트** | shadcn/ui                             | 최신      | 재사용 가능한 UI 컴포넌트     |
| **백엔드**    | Supabase                              | 최신      | BaaS (인증, 데이터베이스, API) |
| **데이터베이스** | PostgreSQL (via Supabase)             | 15.x    | 관계형 데이터베이스          |
| **인증**     | Supabase Auth                         | 최신      | 사용자 인증 및 권한 관리      |
| **상태 관리**  | React Context API                     | 18.x    | 전역 상태 관리            |
| **폼 관리**   | React Hook Form                       | 7.x     | 폼 상태 및 유효성 검사       |
| **날짜 처리**  | date-fns                              | 3.x     | 날짜 및 시간 유틸리티        |
| **아이콘**    | Lucide React                          | 최신      | 아이콘 라이브러리           |
| **배포**     | Vercel                                | 최신      | 프론트엔드 배포 플랫폼        |

### 7.2 미구현 기술 스택 (향후 추가 예정)

| 분류      | 기술           | 용도              |
| ------- | ------------ | --------------- |
| **결제**   | PortOne      | 결제 처리          |
| **알림**   | 카카오 알림톡 API  | 푸시 알림 발송       |
| **이미지**  | Cloudinary   | 이미지 업로드 및 최적화  |
| **모니터링** | Sentry       | 에러 추적 및 모니터링   |

---

## 8. 데이터 모델 (Data Model)

### 8.1 구현된 주요 엔티티

| 엔티티                | 설명                    | 주요 필드                                                                                      | 구현 상태 |
| ------------------ | --------------------- | ------------------------------------------------------------------------------------------ | ----- |
| **customers**      | 고객 정보                | id, email, nickname, phone, auth_provider, role, is_active, accumulated_time_minutes      | ✅ 완료 |
| **services**       | 서비스(스튜디오) 정보         | id, slug, name, description, price_per_hour, location, image_url                          | ✅ 완료 |
| **reservations**   | 예약 정보                | id, service_id, customer_id, reservation_date, start_time, end_time, status, total_price  | ✅ 완료 |
| **reviews**        | 리뷰 정보                | id, customer_id, service_id, reservation_id, rating, content, is_hidden                   | ✅ 완료 |
| **review_images**  | 리뷰 이미지              | id, review_id, image_url                                                                   | ✅ 완료 |
| **customer_coupons** | 고객 쿠폰               | id, customer_id, value_minutes, granted_at, expires_at, used_at                           | ✅ 완료 |
| **holidays**       | 휴무일 정보              | id, service_id, holiday_date, description                                                  | ✅ 완료 |
| **service_operating_hours** | 서비스 운영시간     | id, service_id, day_of_week, start_time, end_time, is_closed                              | ✅ 완료 |
| **blocked_times**  | 차단된 시간              | id, service_id, blocked_date, start_time, end_time, description                           | ✅ 완료 |

### 8.2 예약 상태 (Reservation Status)

| 상태          | 설명      | 구현 상태 |
| ----------- | ------- | ----- |
| **pending** | 대기 중    | ✅ 완료 |
| **confirmed** | 확정됨    | ✅ 완료 |
| **canceled** | 취소됨    | ✅ 완료 |
| **completed** | 완료됨    | ✅ 완료 |
| **modified** | 변경됨    | ✅ 완료 |

---

## 9. 개발 단계 및 우선순위 (Development Phases & Priorities)

### 9.1 완료된 단계

#### Phase 1: 기본 기능 ✅ 완료
- 사용자 인증 (이메일, 소셜 로그인)
- 기본 예약 시스템
- 서비스 상세 페이지
- 관리자 기본 기능

#### Phase 2: 고급 기능 ✅ 완료
- 리뷰 시스템
- 쿠폰 및 적립시간 시스템
- 예약 변경 기능
- 관리자 고급 기능

#### Phase 3: 운영 기능 ✅ 완료
- 운영시간 관리
- 휴무일 설정
- 차단 시간 관리
- 고객 관리 고도화

### 9.2 향후 개발 예정

#### Phase 4: 결제 연동 🔄 계획 중
- PortOne 결제 시스템 연동
- 결제 상태 관리
- 환불 처리 시스템

#### Phase 5: 알림 시스템 🔄 계획 중
- 카카오 알림톡 연동
- 예약 관련 자동 알림
- 관리자 알림 시스템

#### Phase 6: 예약 연장 🔄 계획 중
- 실시간 예약 연장 기능
- 연장 요금 계산
- 연장 이력 관리

---

## 10. 품질 보증 (Quality Assurance)

### 10.1 테스트 전략
- **단위 테스트**: 핵심 비즈니스 로직
- **통합 테스트**: API 엔드포인트
- **E2E 테스트**: 주요 사용자 플로우
- **수동 테스트**: UI/UX 검증

### 10.2 코드 품질
- **TypeScript**: 타입 안전성 보장
- **ESLint**: 코드 스타일 일관성
- **Prettier**: 코드 포맷팅
- **Husky**: Git 훅을 통한 품질 검사

---

## 11. 버전 관리 및 변경 이력

### v4.24 (2025년 5월 26일)
- 실제 구현된 기능들 상태 업데이트
- 소셜 로그인 (카카오, 네이버) 완료 상태 반영
- 리뷰 시스템 및 적립시간 부여 기능 완료 상태 반영
- 쿠폰 시스템 완료 상태 반영
- 관리자 기능 완료 상태 반영
- 미구현 기능들 명시 및 향후 계획 정리

### v4.23 (2025년 5월 10일)
- 시간 선택 UI UX 상세화에 따른 요구사항 보완

### v4.22 (2025년 5월 9일)
- 예약 연장 및 동시간대 예약 처리를 위한 요구사항 추가

---

## 12. 결론 (Conclusion)

Pronto 서비스는 현재 **핵심 기능들이 모두 구현 완료**된 상태입니다. 사용자 인증, 예약 관리, 리뷰 시스템, 쿠폰 시스템, 관리자 기능 등 주요 기능들이 안정적으로 운영되고 있으며, 향후 결제 연동, 알림 시스템, 예약 연장 기능 등을 추가하여 서비스를 더욱 고도화할 예정입니다.

본 문서는 실제 구현된 기능들을 정확히 반영하고 있으며, 향후 기능 추가 시 지속적으로 업데이트될 예정입니다.

---

*본 문서는 실제 운영 중인 서비스의 기능을 정확히 반영하며, 개발팀과 운영팀 간의 명확한 소통을 위해 작성되었습니다.* 