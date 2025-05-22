# Pronto 서비스 기술 설계 문서 (TDD) v2.0 (2025년 5월 13일 업데이트)

*(참고: 본 문서는 PRD v4.21, 개발 계획 v8.8, 코드 품질 검토 결과(2025-05-13)를 기준으로 작성되었습니다.)*
**(변경 이력: v2.0 - 2025년 5월 13일, 코드 품질 검토 결과를 반영하여 상수/설정 관리, 데이터 관리, 컴포넌트 아키텍처, 상태 관리, 유틸리티, API 클라이언트, 타입 정의, Tailwind 테마 등 전반적인 코드 구조 및 품질 향상 방안 구체화; v1.9 - 2025년 5월 13일, 커서 코드 품질 검토 결과 반영 (상수/설정 관리, 데이터 관리, 컴포넌트 아키텍처, 상태 관리, 유틸리티, API 클라이언트, 타입 정의, Tailwind 테마 등 전반적인 코드 구조 및 품질 향상 방안 구체화); v1.8 - 2025년 5월 11일, 시간 선택 자동화 기능 추가 (최초 선택 시 1시간 자동 선택, 최소 1시간 남았을 때 전체 취소 기능); v1.7 - 2025년 5월 10일, 시간 선택 UI UX 상세화 (눈금 위치 및 레이블 형식 변경); v1.6 - 2025년 5월 9일, 예약 연장 및 동시간대 예약 처리 기술 설계 추가/구체화)**

---

## 1. 개요 (Overview)

| 항목         | 내용                                                                                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **시스템 목표** | PRD v4.21에 정의된 기능을 구현하여 사용자가 공간을 **예약·결제**하고 **리뷰·적립/쿠폰** 시스템에 참여하며, 운영자가 서비스를 효율적으로 관리할 수 있는 **웹 기반 플랫폼**을 구축합니다. 또한 **외부 자동화 도구**(n8n, Make 등)와의 연동 기반을 마련하여 알림 처리 등의 유연성을 확보하고, **코드 품질, 확장성, 유지보수성**을 고려한 설계를 지향합니다. |
| **시스템 범위** | PRD v4.21의 **모든 기능·비기능 요구사항** + 외부 연동 API·웹훅 메커니즘 + 코드 품질 개선 사항 *(오픈 이슈 제외)* |
| **주요 스택** | - **Front‑end**: Next.js (App Router), React, TypeScript, Tailwind CSS<br>- **Back‑end/BaaS**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)<br>- **Payment**: PortOne API<br>- **Notification**: 카카오 알림톡 (Make/n8n 등 외부 자동화 도구 연동), 이메일(Supabase or 외부)<br>- **Social Login (Phase 8 이후)**: Kakao·Naver OAuth<br>- **State Management**: Zustand |

---

## 2. 시스템 아키텍처 (System Architecture)

### 2.1 전반 구조

클라이언트 ↔ **Next.js (App Router, React Server/Client Components) / Supabase (BaaS)** ↔ PostgreSQL DB
* **프론트엔드 (Next.js):** 사용자 인터페이스, 클라이언트 측 로직, API 라우트 핸들러(일부) 담당.
* **백엔드 (Supabase):** 데이터베이스, 사용자 인증, 서버리스 함수(Edge Functions), 파일 스토리지 제공.
* **외부 연동:** PortOne(결제), 카카오/네이버(소셜 로그인 - Phase 8), Make/n8n(알림 처리 등 자동화).

### 2.2 디렉토리 구조 원칙 (제안)

프로젝트의 가독성, 유지보수성, 확장성을 위해 다음과 같은 디렉토리 구조를 권장합니다.


src/
├── app/                     # Next.js App Router (라우팅, 페이지, 레이아웃)
│   ├── (user)/              # 사용자 영역 레이아웃 그룹
│   │   ├── layout.tsx
│   │   └── ... (페이지 폴더들)
│   ├── (admin)/             # 관리자 영역 레이아웃 그룹
│   │   ├── layout.tsx
│   │   └── ... (페이지 폴더들)
│   ├── (auth)/              # 인증 관련 페이지 레이아웃 그룹 (선택 사항)
│   │   └── ...
│   ├── api/                 # API 라우트 핸들러
│   └── layout.tsx           # 최상위 루트 레이아웃
├── components/              # 공통 UI 컴포넌트 (재사용 가능, 상태 비의존적)
│   └── ui/                  # 원자적 UI 요소 (Button, Card, Input 등)
├── features/                # 기능별 모듈 (도메인 중심)
│   ├── reservation/         # 예약 기능 관련
│   │   ├── components/      # 예약 기능에 특화된 컴포넌트
│   │   │   └── TimeRangeSelector/ # 예: TimeRangeSelector 및 하위 컴포넌트
│   │   ├── hooks/           # 예약 기능 관련 커스텀 훅
│   │   └── stores/          # 예약 기능 관련 Zustand 스토어
│   └── service/             # 서비스 정보 표시 관련
│       ├── components/
│       │   └── ServiceDetail/ # 예: ServiceDetail 및 하위 컴포넌트
│       ├── hooks/
│       └── stores/
├── constants/               # 애플리케이션 전역 상수
│   ├── time.ts
│   ├── apiPaths.ts
│   ├── cache.ts
│   ├── region.ts
│   └── images.ts
├── data/                    # 초기 정적 데이터 또는 목업 데이터 (향후 DB 이전 고려)
│   ├── serviceDefaults.ts
│   └── faqData.ts
├── lib/                     # 공통 유틸리티 함수, 외부 라이브러리 설정
│   ├── supabase.ts          # Supabase 클라이언트 초기화
│   ├── apiClient.ts         # 중앙 API 호출 클라이언트 (선택 사항)
│   ├── date-utils.ts        # 날짜/시간 관련 유틸리티
│   └── utils.ts             # 기타 범용 유틸리티
├── types/                   # 전역 TypeScript 타입 정의
│   ├── index.ts             # 모든 타입 export
│   ├── reservation.ts
│   └── services.ts
└── ... (기타 설정 파일)


### 2.3 컴포넌트별 역할

| 영역                 | 설계 요점                                                                                |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Front‑end (Next.js)** | App Router 기반 라우팅, 서버 컴포넌트 및 클라이언트 컴포넌트 활용, React+Tailwind UI. `src/features` 중심으로 기능 모듈화. |
| **Auth (Supabase)** | 초기 이메일 로그인, JWT 세션, `role='admin'` 제어. (Phase 8 이후 카카오/네이버 소셜 로그인 추가). |
| **DB (Supabase)** | PostgreSQL + **RLS**. `business_id` 등 향후 확장성 고려한 스키마 설계. |
| **Edge Functions (Supabase)** | PortOne 웹훅 처리, **주요 이벤트 발생 시 웹훅 발송(n8n/Make 연동용)**, 적립/쿠폰 부여, 스케줄링(Cron Jobs), 복잡한 백엔드 로직 처리. |
| **Storage (Supabase)** | 서비스/리뷰 이미지 저장, 접근 정책 설정.                                                                       |
| **State Management (Zustand)** | 전역 상태 관리가 필요한 경우 사용 (예: 예약 정보, 사용자 정보, UI 상태 등). `src/features/[featureName]/stores/`에 기능별 스토어 정의. (상세는 4.6절 참조) |
| **Constants & Data** | 변경 가능성이 낮은 설정값은 `src/constants/`에, 초기 정적 데이터는 `src/data/`에 분리하여 관리. (상세는 11절, 12절 참조) |
| **Utilities** | 반복 사용되는 순수 함수들은 `src/lib/`에 중앙화. (상세는 13절 참조) |
| **Types** | 전역적으로 사용되는 타입은 `src/types/`에 정의하여 일관성 및 안정성 확보. (상세는 14절 참조) |
| **API Client** | (선택) `src/lib/apiClient.ts` 또는 각 feature 내 API 호출 함수를 통해 API 요청 중앙화 고려. (상세는 5절 참조) |
| **외부 서비스** | PortOne, 카카오 알림톡 (Make/n8n 경유), 이메일, **n8n/Make** 웹훅 수신·API 호출. (Phase 8 이후 Kakao/Naver OAuth 추가) |

---

## 3. 주요 기술 결정 & 근거

| 기술                           | 채택 이유                                                              |
| ---------------------------- | ------------------------------------------------------------------ |
| **Next.js (App Router)** | 서버·클라이언트 컴포넌트, SSR/SSG, 파일기반 라우팅, 생산성·SEO.                         |
| **Supabase** | Auth·DB·함수·스토리지 통합, 초기 속도, PostgreSQL 확장성, **Edge Fn**으로 API/웹훅 발송 용이. |
| **PortOne** | 국내 결제수단 통합, 안전한 웹훅 검증.                                             |
| **Tailwind CSS** | 유틸리티 기반, 빠른 스타일링·유지보수. `tailwind.config.ts`를 통한 테마 확장. (상세는 15절 참조)                                             |
| **Zustand** | 가볍고 간편한 전역 상태 관리 라이브러리. Boilerplate 최소화. Context API 대비 성능 이점. |
| **Webhook & API (n8n/Make)** | 실시간 외부 알림 + 능동적 데이터 조회/액션. 알림 로직의 유연한 관리 및 다양한 채널 확장 용이. |
| **TypeScript** | 정적 타입 시스템을 통한 코드 안정성 및 가독성 향상, 개발 생산성 증대. |

---

## 4. 핵심 기능 구현 방안 (Core Feature Implementation)

### 4‑1. 인증 (Auth)

* **초기 구현 (Phase 1~2):** Supabase Auth 이메일/비밀번호 인증.
* **Phase 8 이후 확장:** Supabase Auth Providers (Kakao, Naver) 추가.
* `customers` 최초 저장(`role='customer'`, `auth_provider` 명시), 운영자 수동 `role='admin'`.
* 탈퇴 → `is_active=false` + 30일 후 익명화 Edge Fn.
* **API Key**: (필요시) 운영자 발급·관리 → 요청 Header 검증.

### 4‑2. 예약 (Booking)

| 단계    | 구현 포인트                                                |
| ----- | ----------------------------------------------------- |
| 시간 선택 UI (TimeRangeSelector) | **컴포넌트 분리:** `TimeSlotGrid`, `TimeSlotHeader`, `TimeSlotControls`, `TimeRangeInfo`, `TimeSlotLegend` 등으로 세분화 (상세는 9.1절 참조). UI는 00:00-23:30 범위의 30분 단위 슬롯을 기본 표시. 눈금과 시간 레이블로 시간 인지. |
| 운영 시간 | DB에서 서비스별 운영 시간 및 휴무 패턴 조회 (`services`, `holidays` 테이블, `service_operating_hours` 테이블 등). 관련 설정은 `src/constants/time.ts` 및 환경 변수 활용. |
| 가용성 확인 (API) | `/api/services/[serviceId]/available-times` (GET): Edge Function/DB를 통해 특정 서비스의 해당 날짜 KST 기준 실제 `operatingStartTime`, `operatingEndTime`, `unavailableSlots`, `isClosed`, `message`, `currentTime` 정보 반환. 캐싱 적용 (`src/constants/cache.ts` 값 사용). 타임존은 `src/constants/region.ts` 값 사용. |
| 선택 규칙 | FE에서 30분 단위 스냅, 최소 1시간 강제 (PRD v4.21 시간 선택 자동화 기능 반영), BE에서 최종 검증. 시간 관련 로직은 `src/lib/date-utils.ts` 및 `src/constants/time.ts` 활용. |
| 실시간 피드백 | 슬롯 선택 시 선택한 시간 범위, 총 이용 시간, 예상 가격 실시간 계산 및 표시. Zustand 스토어(`reservationStore`) 활용. |
| 동시성   | `reservations(service_id, start_time)` UNIQUE (`WHERE status = 'confirmed'`) + DB 트랜잭션. |
| 예약 변경 시 요금 처리 | Phase 3-3에서 요금 변동 안내 및 데이터 준비, Phase 7-6에서 실제 추가 결제/부분 환불 처리. |

### 4‑3. 결제 (Payment)

1. FE PortOne SDK 호출.
2. Edge Fn 웹훅 수신 (`handle-payment-webhook`) → 검증 → DB 업데이트 (예약 확정, 사용 시간 차감 등).
3. **예약 확정 후 `booking.confirmed` 웹훅 발송 (Make/n8n 연동용).**
4. **동시 예약 실패 시 자동 환불 처리 후 `booking.failed.concurrent` 웹훅 발송.**
5. 예약 취소/변경에 따른 환불/추가 결제 시 PortOne API 호출 및 관련 웹훅 발송.

* **PortOne 결제 성공 웹훅 수신 시 (Edge Function: `handle-payment-webhook`):**
    1.  웹훅 요청 유효성 검증.
    2.  PortOne API를 통해 `imp_uid`로 실제 결제 내역 재확인.
    3.  **DB 트랜잭션 시작.**
    4.  예약 정보 확인 및 `reservations` 테이블에 `status = 'confirmed'`로 업데이트 시도.
    5.  UNIQUE 제약 조건 위반 시 (중복 예약): 트랜잭션 롤백, PortOne 환불 API 호출, `booking.failed.concurrent` 웹훅 발송.
    6.  성공 시: 사용된 쿠폰/적립금 차감, DB 트랜잭션 커밋, `booking.confirmed` 웹훅 발송.
    7.  PortOne에 최종 처리 결과 응답.

### 4‑4. 리뷰·적립/쿠폰 (Time System)

* 리뷰 저장 (`reviews` 테이블) + 이미지 업로드(Supabase Storage) + 적립 시간 부여 (`customers` 테이블 업데이트, 트랜잭션) + `review.submitted.successful` 웹훅 (선택적, Phase 8 연동).
* 운영자 쿠폰 부여 (`customer_coupons` 테이블 저장) + `coupon.granted` 웹훅 (선택적, Phase 8 연동).
* 예약 시/결제 완료 시 쿠폰 상태 변경·적립 차감 (4-3단계 웹훅 처리 로직 내 포함).
* `reviews` 테이블 변경 시 `services` 테이블의 평균 별점 및 리뷰 수 비동기 업데이트 (DB 트리거 또는 Edge Function).

### 4‑5. 알림 & 외부 연동 (Make/n8n 기반)

| 종류          | 방식                                               |
| ----------- | ------------------------------------------------ |
| **카카오 알림톡** | **Make/n8n 등 외부 자동화 도구를 통해 발송.** Supabase Edge Function에서 특정 이벤트 발생 시 해당 정보를 담은 웹훅을 외부 자동화 도구로 전송. 외부 자동화 도구에서 카카오 알림톡 API 호출. (Phase 8에서 전체 연동) |
| **이메일** | Supabase Auth (인증 메일) 또는 외부 서비스 (Make/n8n 경유 가능).                                  |
| **웹훅 (발신)** | 주요 이벤트 발생 시 (예: `booking.confirmed`, `booking.changed`, `booking.cancelled`, `payment.request.created`, `booking.extended`, `booking.failed.concurrent` 등) Edge Fn에서 표준화된 JSON Payload로 외부 시스템(n8n/Make 등)에 POST. API 명세서 참조. |
| **웹훅 (수신)** | PortOne 결제 웹훅 등 외부 시스템으로부터의 웹훅을 Supabase Edge Function에서 수신 및 처리. |
| **공개 API (필요시)** | Edge Fn REST, API Key 인증.                        |

### 4.6 상태 관리 (State Management - Zustand)

* **목적:** 복잡한 컴포넌트 간 상태 공유 및 props drilling 문제를 해결하고, 상태 로직을 UI로부터 분리하여 테스트 용이성 및 유지보수성을 향상시킵니다.
* **적용 범위:**
    * 예약 관련 상태 (`src/features/reservation/stores/reservationStore.ts`): 선택된 날짜, 시간 범위, 예약 가능 슬롯 목록 등.
    * 예약 폼 데이터 (`src/features/reservation/stores/bookingFormStore.ts`): 고객명, 회사명, 촬영 목적, 차량번호, 개인정보 동의 여부, 제출 중 상태 등.
    * 서비스 상세 정보 상태 (`src/features/service/stores/serviceDetailStore.ts`): 현재 조회 중인 서비스 정보, 로딩 상태, 에러 상태, 활성 탭 정보 등.
    * 사용자 인증 상태 (`src/features/auth/stores/authStore.ts` 또는 `AuthContext` 확장): 로그인된 사용자 정보, 인증 로딩 상태 등 (기존 `AuthContext`와 역할 분담 또는 통합 고려).
* **구현 예시 (`reservationStore.ts`):**
    ```typescript
    // src/features/reservation/stores/reservationStore.ts
    import { create } from 'zustand';
    import { TimeSlot } from '@/types/reservation'; // 중앙 타입 정의 사용

    interface SelectedTimeRange {
      start: string | null;
      end: string | null;
      duration: number; // 분 단위
      price: number; // 예상 가격
    }

    interface ReservationState {
      selectedDate: Date | null;
      availableSlots: TimeSlot[];
      selectedTimeRange: SelectedTimeRange;
      isLoadingSlots: boolean;
      slotError: string | null;
      setSelectedDate: (date: Date | null) => void;
      setAvailableSlots: (slots: TimeSlot[]) => void;
      setSelectedTimeRange: (range: SelectedTimeRange) => void;
      setLoadingSlots: (loading: boolean) => void;
      setSlotError: (error: string | null) => void;
    }

    export const useReservationStore = create<ReservationState>((set) => ({
      selectedDate: null,
      availableSlots: [],
      selectedTimeRange: { start: null, end: null, duration: 0, price: 0 },
      isLoadingSlots: false,
      slotError: null,
      setSelectedDate: (date) => set({ selectedDate: date }),
      setAvailableSlots: (slots) => set({ availableSlots: slots }),
      setSelectedTimeRange: (range) => set({ selectedTimeRange: range }),
      setLoadingSlots: (loading) => set({ isLoadingSlots: loading }),
      setSlotError: (error) => set({ slotError: error }),
    }));
    ```

---

## 5. API 설계 원칙

* **Supabase API**: 기본 CRUD는 Supabase 클라이언트 라이브러리 직접 사용.
* **Custom API (Edge Functions)**: 복잡한 비즈니스 로직, 외부 서비스 연동, 공개 API, 웹훅 발신/수신 등에 활용.
* **RESTful 원칙 준수**: 명확한 HTTP 메소드(GET, POST, PUT, DELETE 등) 사용, 일관된 URL 구조.
* **요청/응답 형식**: `JSON` 사용.
* **오류 처리**: HTTP 상태 코드와 함께 명확한 오류 메시지(`code`, `message`) 반환. (TDD 6. 오류 처리 전략 참조)
* **API 클라이언트 추상화:** `src/lib/apiClient.ts` 또는 각 `src/features/[featureName]/api/` 내에 API 호출 함수를 중앙화하여 관리. API 경로는 `src/constants/apiPaths.ts`를 참조.
    ```typescript
    // 예시: src/features/reservation/api/reservationApi.ts
    import { API_PATHS } from '@/constants/apiPaths';
    import { AvailableTimesResponse } from '@/types/api'; // API 응답 타입 정의

    // 기본 fetch 래퍼 또는 axios 인스턴스 사용 가능
    async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
      const response = await fetch(url, options);
      if (!response.ok) {
        // 여기서 표준화된 오류 처리 로직 추가 가능 (예: AppError 사용)
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }
      return response.json();
    }

    export const getAvailableTimes = (serviceId: string, date: string): Promise<AvailableTimesResponse> => {
      const queryParams = new URLSearchParams({ date });
      return fetchAPI<AvailableTimesResponse>(`${API_PATHS.AVAILABLE_TIMES(serviceId)}?${queryParams}`);
    };
    ```
* 상세 명세 → *API Spec v1.3* 별도 문서.

---

## 6. 보안 고려 사항 및 오류 처리 전략

### 6.1 보안 고려 사항

* **입력 검증 (Input Validation):** 프론트엔드 및 백엔드(Edge Functions, API 라우트) 양쪽에서 모든 사용자 입력값 검증 (XSS, SQL Injection 등 방지). Zod 등 라이브러리 활용 고려.
* **RLS (Row Level Security):** Supabase DB 테이블에 RLS 정책을 적용하여 사용자 역할 및 소유권에 따른 데이터 접근 제어.
* **비밀번호 관리:** Supabase Auth의 해싱 메커니즘 사용.
* **API Key 및 민감 정보 관리:** 모든 API 키, 비밀 값 등은 환경 변수(.env 파일, Vercel 환경 변수)를 통해 안전하게 관리. 코드에 직접 노출 금지.
* **파일 업로드 보안:** Supabase Storage 사용 시 파일 타입, 크기 제한 및 악성 파일 검사 고려.
* **적립/쿠폰 시스템 보안:** 서버 측에서 모든 적립/차감 로직 검증.
* **개인정보 보호:** 회원 탈퇴 시 개인 식별 정보 익명화 처리 (스케줄링된 Edge Function).
* **웹훅 보안:** 수신하는 웹훅에 대해 서명(signature) 검증 (예: PortOne 웹훅). 발신하는 웹훅에도 필요시 HMAC 서명 등 추가 고려.

### 6.2 오류 처리 전략 (Error Handling Strategy)

* **목표:** 일관되고 예측 가능한 오류 처리, 사용자 친화적인 메시지 제공, 효과적인 디버깅 및 모니터링.
* **에러 타입 정의 (`src/types/index.ts` 또는 `src/types/error.ts`):**
    ```typescript
    export enum ErrorCode {
      // 인증 관련
      UNAUTHENTICATED = 'AUTH_001',
      PERMISSION_DENIED = 'AUTH_002',
      // 유효성 검사 관련
      VALIDATION_FAILED = 'VALID_001',
      // DB 관련
      DB_QUERY_FAILED = 'DB_001',
      DB_CONNECTION_ERROR = 'DB_002',
      // 예약 관련
      RESERVATION_SLOT_UNAVAILABLE = 'RESV_001',
      RESERVATION_CONCURRENCY_ISSUE = 'RESV_002',
      // API 관련
      API_REQUEST_FAILED = 'API_001',
      EXTERNAL_API_ERROR = 'API_002',
      // 일반
      UNKNOWN_ERROR = 'GEN_001',
    }

    export enum ErrorSeverity {
      INFO = 'info',
      WARNING = 'warning',
      ERROR = 'error',
      CRITICAL = 'critical',
    }

    export class AppError extends Error {
      public readonly code: ErrorCode;
      public readonly severity: ErrorSeverity;
      public readonly statusCode: number; // HTTP 상태 코드
      public readonly context?: Record<string, any>; // 추가 컨텍스트 정보

      constructor(
        message: string,
        code: ErrorCode,
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        statusCode: number = 500,
        context?: Record<string, any>
      ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.severity = severity;
        this.statusCode = statusCode;
        this.context = context;
        Error.captureStackTrace(this, this.constructor);
      }
    }
    ```
* **에러 처리 유틸리티 (`src/lib/errorUtils.ts` 또는 `src/lib/utils.ts`에 통합):**
    * `handleError(error: unknown, defaultCode?: ErrorCode, defaultMessage?: string): AppError`: 다양한 타입의 에러(Error 객체, API 응답 에러, 문자열 등)를 `AppError` 인스턴스로 변환하거나 래핑.
    * `logError(error: AppError, additionalContext?: Record<string, any>): void`: 에러 심각도 및 환경(개발/운영)에 따라 콘솔 또는 Sentry 등 외부 로깅 서비스로 에러 정보 전송.
    * `getUserFriendlyErrorMessage(error: AppError): string`: `AppError`의 `code`나 `message`를 기반으로 사용자에게 보여줄 친화적인 메시지 반환. (국제화 고려 시 i18n 라이브러리와 연동)
* **React 에러 경계 (`src/components/ui/ErrorBoundary.tsx`):**
    * UI 렌더링 중 발생하는 JavaScript 에러를 잡아내어 전체 애플리케이션의 중단을 방지하고, 대체 UI(Fallback UI)를 보여줍니다.
    * `componentDidCatch` 내에서 `logError` 유틸리티를 사용하여 Sentry 등으로 에러를 보고합니다.
    * `withErrorBoundary` HOC (Higher-Order Component)를 제공하여 함수형 컴포넌트에도 쉽게 적용할 수 있도록 합니다.
* **API 호출 래퍼 (`src/hooks/useApi.ts` 또는 `src/lib/apiClient.ts` 내):**
    * `fetch` 또는 `axios`를 래핑하여 API 요청/응답을 처리하고, HTTP 에러 발생 시 `AppError`를 throw 하거나 반환하여 일관된 오류 객체를 사용하도록 합니다.
    * 로딩 상태, 데이터, 에러 상태를 관리하는 커스텀 훅(`useApi`)을 제공하여 컴포넌트에서 API 호출 로직을 단순화합니다.

---

## 7. 성능 고려 사항

* **데이터베이스 최적화:** 적절한 인덱스 생성, 쿼리 튜닝, 페이지네이션 적용.
* **이미지 최적화:** Next/image 컴포넌트 활용 (WebP 형식, 사이즈 최적화, lazy loading), Supabase Storage 이미지 변환 기능 활용.
* **프론트엔드 성능:**
    * React 컴포넌트 리렌더링 최적화 (memo, useCallback, useMemo).
    * 코드 스플리팅 (Next.js 기본 지원 활용).
    * 지연 로딩 (Lazy Loading) 컴포넌트 및 이미지.
    * 번들 사이즈 분석 및 최적화 (Webpack Bundle Analyzer 등).
* **API 및 웹훅 성능:** 비동기 처리, 최소한의 응답 페이로드, 적절한 캐싱 전략 적용 (`src/constants/cache.ts` 값 활용).
* **서버리스 함수 최적화:** Edge Functions 콜드 스타트 최소화 방안 고려 (예: 함수 유지).

---

## 8. 배포 & 운영

| 항목       | 내용                                              |
| -------- | ----------------------------------------------- |
| **배포** | Vercel + Supabase. GitHub 연동을 통한 자동 배포 (프로덕션/미리보기). |
| **환경 변수 관리** | Vercel 대시보드 및 Supabase 프로젝트 설정에서 관리 (API 키, DB 연결 정보, 외부 서비스 인증 정보, Sentry DSN 등). `.env.local`은 로컬 개발용. |
| **모니터링** | Sentry (오류 추적), Supabase Dashboard (DB, Auth, Functions 모니터링), Vercel Analytics, **웹훅/API 성공률** 모니터 (Make/n8n 대시보드 포함). |
| **로깅** | Edge Fn 로그 (Supabase), API 접근 로그, 웹훅 발송/수신 로그 (Make/n8n 로그 포함), Sentry를 통한 클라이언트/서버 오류 로깅. |

---

## 9. 프론트엔드 컴포넌트 구현 상세 (주요 컴포넌트 예시)

### 9.1. 시간 선택기 (`TimeRangeSelector` 및 하위 컴포넌트)

* **디렉토리 구조 (제안):** `src/features/reservation/components/TimeRangeSelector/`
* **주요 하위 컴포넌트:**
    * `index.tsx`: `TimeRangeSelector` 메인 컴포넌트 (외부 노출 및 상태 조합).
    * `TimeSlotGrid.tsx`: 실제 시간 슬롯들을 그리드로 표시하는 UI 컴포넌트.
    * `TimeSlotHeader.tsx`: 시간대 눈금(00:00, 00:30 등)과 레이블을 표시하는 컴포넌트.
    * `TimeSlotControls.tsx`: (필요시) 시간 그리드 좌우 스크롤 버튼 등 컨트롤 요소.
    * `TimeRangeInfo.tsx`: 현재 선택된 시간 범위, 총 이용 시간, 예상 가격 등을 표시하는 컴포넌트.
    * `TimeSlotLegend.tsx`: (필요시) 슬롯 상태별 색상 범례 표시.
* **상태 관리:** `useReservationStore` (Zustand)에서 선택된 날짜, 시간 범위 등 관리.
* **로직:** `src/features/reservation/hooks/useTimeSlots.ts` (커스텀 훅)에서 API 호출, 슬롯 상태 계산, 선택 로직 등 처리.
* **UI 특징:** PRD v4.21의 시간 선택 자동화 기능(최초 1시간 자동 선택 등) 및 상세 UI/UX(눈금, 레이블) 구현.

### 9.2. 서비스 상세 정보 (`ServiceDetailClient` 대체 구조)

* **디렉토리 구조 (제안):** `src/features/service/components/ServiceDetail/`
* **Container/Presentation 패턴 적용 (예시):**
    * `ServiceDetailContainer.tsx` (클라이언트 컴포넌트): 데이터 페칭(Supabase 클라이언트 또는 API 클라이언트 사용), 상태 관리(`useServiceDetailStore`, `useReservationStore`, `useBookingFormStore` 연동), 이벤트 핸들러 정의.
    * `ServiceDetailPresentation.tsx` (클라이언트 컴포넌트): `Container`로부터 props를 받아 순수하게 UI만 렌더링. 하위 Presentational 컴포넌트들 조합.
* **주요 하위 컴포넌트 (Presentational):**
    * `ServiceHeader.tsx`: 서비스명, 카테고리 등 기본 정보.
    * `ServiceImageGallery.tsx`: 대표 이미지 및 추가 이미지 표시.
    * `ServicePriceInfo.tsx`: 시간당 가격, 할인 정보 등.
    * `ServiceLocation.tsx`: 위치 정보, 지도 연동 (선택 사항).
    * `ServiceRating.tsx`: 평균 별점, 리뷰 수.
    * `ServiceTabs/index.tsx`: 탭 네비게이션 컨테이너.
        * `FacilityTab.tsx`, `MapTab.tsx`, `NoticeTab.tsx`, `RefundTab.tsx`, `ParkingTab.tsx`, `QnaTab.tsx`, `ReviewsTab.tsx`: 각 탭별 콘텐츠 표시.
    * `BookingSection.tsx`: 예약 관련 UI(캘린더, `TimeRangeSelector`, 예약 폼)를 포함하는 섹션.
        * `BookingCalendar.tsx`: 날짜 선택 캘린더.
        * `BookingForm/index.tsx`: 예약자 정보 입력 폼.
            * `CustomerInfoForm.tsx`
            * `PrivacyAgreement.tsx`
* **상태 관리:** `useServiceDetailStore` (서비스 정보, 활성 탭 등), `useReservationStore` (날짜/시간 선택), `useBookingFormStore` (예약 폼 데이터) 활용.
* **로직:** `src/features/service/hooks/useServiceDetail.ts` (커스텀 훅)에서 서비스 상세 정보 조회 로직 등 처리.

### 9.3. 공통 UI 컴포넌트 (`src/components/ui/`)

커서가 제안한 `Card.tsx`, `InfoItem.tsx`, `TabPanel.tsx`, `FormField.tsx` 등과 같이 프로젝트 전반에서 재사용될 수 있는 원자적 UI 컴포넌트들을 이곳에 정의합니다. Tailwind CSS 클래스 조합 및 `cn` 유틸리티 활용.

---

## 10. 코드 스타일 및 컨벤션

* **ESLint 및 Prettier 사용:** 일관된 코드 스타일 유지 및 잠재적 오류 방지를 위해 ESLint와 Prettier를 설정하고 사용합니다. (설정 파일은 프로젝트 루트에 위치)
* **네이밍 컨벤션:**
    * 컴포넌트: PascalCase (예: `TimeSlotGrid.tsx`)
    * 함수/변수: camelCase (예: `calculateTotalPrice`)
    * 상수: SCREAMING_SNAKE_CASE (예: `OPERATION_START_TIME`)
    * 타입/인터페이스: PascalCase (예: `TimeSlot`)
* **주석:** JSDoc 형식을 권장하며, 복잡한 로직이나 공개 API, 주요 함수/컴포넌트에 대해 명확하고 충분한 설명을 제공합니다.

---

## 11. 상수 및 설정 관리 (`src/constants/`, `src/config/`, 환경 변수)

* **`src/constants/` 디렉토리:** 애플리케이션 전체에서 사용되는 변경되지 않는 값들을 정의합니다.
    * `time.ts`: 운영 시간, 시간 슬롯 간격, 기본 타임존 등 시간 관련 상수. (예: `export const OPERATION_START_TIME = "06:00";`)
    * `apiPaths.ts`: API 엔드포인트 경로를 함수 또는 객체 형태로 중앙 관리. (예: `export const API_PATHS = { AVAILABLE_TIMES: (serviceId: string) => \`/api/services/${serviceId}/available-times\`, ... };`)
    * `cache.ts`: API 응답 캐싱 시간 등 캐시 관련 상수. (예: `export const CACHE_DURATIONS = { AVAILABLE_TIMES: { TODAY: 300, FUTURE: 900 }, ... };`)
    * `region.ts`: 지역 및 타임존 관련 상수. (예: `export const DEFAULT_TIMEZONE = "Asia/Seoul";`)
    * `images.ts`: 기본 이미지 URL 등 이미지 관련 상수. (예: `export const DEFAULT_SERVICE_IMAGE = "...";`)
* **`src/config/` 디렉토리 (선택 사항):** 환경별로 달라지지 않지만, 프로젝트의 주요 설정을 담는 파일. (예: `operation.config.ts` - 운영 관련 설정)
* **환경 변수 (`.env.local`, Vercel 환경 변수):**
    * **관리 대상:** API 키, DB 접속 정보, 외부 서비스 인증 정보, Sentry DSN, 운영 시간 등 배포 환경별로 달라지거나 민감한 정보.
    * **Next.js 접두사:** 브라우저에서 접근해야 하는 환경 변수는 `NEXT_PUBLIC_` 접두사를 사용합니다. (예: `NEXT_PUBLIC_SUPABASE_URL`)

---

## 12. 데이터 관리 (초기 정적 데이터 - `src/data/`)

* **목적:** 서비스 초기 단계에서 DB 연동 전에 사용될 정적 데이터 또는 목업 데이터를 관리합니다. 장기적으로는 DB 또는 CMS를 통해 관리될 수 있습니다.
* **디렉토리 구조:** `src/data/`
* **파일 예시:**
    * `serviceDefaults.ts`: 기본 서비스 정보(시설 안내, 주차 정보), 환불 정책 등을 객체 형태로 정의.
        ```typescript
        export const DEFAULT_SERVICE_INFO = {
          facility: `스튜디오 면적: ...`,
          parking: `건물 내 지하주차장...`,
          refundPolicy: { days7: { rate: 100, description: "..." }, ... }
        };
        ```
    * `faqData.ts`: FAQ 목록을 배열 형태로 정의.
        ```typescript
        export const SERVICE_FAQS = [ { question: "...", answer: "..." }, ... ];
        ```

---

## 13. 유틸리티 함수 (`src/lib/`)

* **목적:** 프로젝트 전반에서 재사용되는 순수 함수들을 모아 관리합니다.
* **파일 예시:**
    * `date-utils.ts`: 날짜 및 시간 관련 유틸리티 함수 중앙화. (예: `timeToMinutes`, `formatMinutesToTime`, `formatTimeString` 등 커서 제안 함수 포함)
    * `utils.ts`: 기타 범용 유틸리티 함수 (예: `cn` 함수 - Tailwind CSS 클래스 병합).
    * `apiClient.ts` (선택 사항): 중앙 API 호출 로직 래핑.

---

## 14. 타입 정의 (`src/types/`)

* **목적:** TypeScript 타입을 중앙에서 관리하여 타입 일관성 및 코드 안정성을 확보합니다.
* **디렉토리 구조:** `src/types/`
* **파일 예시:**
    * `index.ts`: 모든 타입을 re-export하여 다른 모듈에서 쉽게 임포트할 수 있도록 합니다. (예: `export * from './reservation';`)
    * `reservation.ts`: 예약 관련 타입 정의. (커서가 제안한 통합된 `TimeSlot` 타입 포함)
        ```typescript
        /**
         * 타임 슬롯 타입
         * @property time - "HH:MM" 형식의 시간 문자열
         * @property status - 슬롯의 상태 (가용, 불가, 선택됨, 예약됨)
         * @property isBlocked - 관리자에 의해 차단된 슬롯인지 여부 (선택 사항)
         * @property blockedReason - 차단된 이유 (선택 사항)
         */
        export type TimeSlot = {
          time: string;
          status: 'available' | 'unavailable' | 'selected' | 'reserved';
          isBlocked?: boolean;
          blockedReason?: string | null;
        };
        // ... 기타 예약 관련 타입
        ```
    * `services.ts`: 서비스 관련 타입 정의.
    * `user.ts`: 사용자/고객 관련 타입 정의.
    * `api.ts`: API 요청/응답 관련 공통 타입 정의.
* **가이드라인:**
    * `any` 타입 사용을 최대한 지양하고 구체적인 타입을 정의합니다.
    * 인터페이스(Interface)보다 타입 별칭(Type Alias) 사용을 권장할 수 있으나, 프로젝트 컨벤션에 따릅니다.
    * JSDoc 주석을 활용하여 타입 및 속성에 대한 설명을 추가합니다.

---

## 15. Tailwind CSS 테마 설정 (`tailwind.config.ts`)

* **목적:** 프로젝트의 디자인 시스템(색상, 폰트, 간격 등)을 Tailwind CSS 테마로 정의하여 일관된 UI를 구축하고 유지보수성을 높입니다.
* **설정 파일:** `tailwind.config.ts` (또는 `.js`)
* **커스텀 색상 정의 예시 (커서 제안 기반):**
    ```typescript
    // tailwind.config.ts
    import type { Config } from "tailwindcss";

    const config: Config = {
      // ... (content, darkMode 등 기존 설정)
      theme: {
        extend: {
          colors: {
            pronto: {
              primary: "#0070F3", // 예시 주 색상
              secondary: "#FF6B6B", // 예시 보조 색상
              gray: { // 기존 pronto-gray-XXX 와 유사한 스케일
                50: "#F9FAFB",
                100: "#F3F4F6",
                200: "#E5E7EB", // 예: pronto-gray-200
                300: "#D1D5DB",
                400: "#9CA3AF",
                500: "#6B7280", // 예: pronto-gray-500
                600: "#4B5563", // 예: pronto-gray-600
                700: "#374151",
                800: "#1F2937",
                900: "#111827",
              },
              success: "#10B981",
              warning: "#FBBF24",
              error: "#EF4444",
              info: "#3B82F6",
            },
          },
          // ... (폰트, 간격 등 다른 테마 확장)
        },
      },
      plugins: [],
    };
    export default config;
    ```
* **사용법:** HTML/JSX에서 `className="bg-pronto-primary text-pronto-gray-700"` 와 같이 사용합니다.

---
end of document
