# Pronto 모바일 최적화 디자인 재설계 계획

## 📋 프로젝트 개요

### 목표
- **500px 가로폭**에서 최적의 모바일 경험 제공
- 웹에서도 모바일처럼 자연스러운 UI/UX 구현
- 기존 반응형 디자인 유지하면서 모바일 우선 접근법 강화
- 터치 인터페이스 최적화 및 가독성 향상

### 현재 상태 분석
- 현재 UI는 **데스크탑 우선 설계** (lg:grid-cols-2, md:py-8 등)
- Tailwind CSS 기반이지만 **500px에 최적화되지 않음**
- 현재 breakpoint: sm(640px), md(768px), lg(1024px), xl(1280px), 2xl(1400px)
- **500px는 sm과 기본(모바일) 사이의 애매한 지점**

---

## 🔍 현재 UI 구조 상세 분석

### 1. 레이아웃 시스템
```typescript
// src/app/layout.tsx
- 기본 구조: flex-col (Header → Main → Footer)
- Header: sticky, h-16 (64px)
- Main: container, py-2 md:py-8
- Footer: border-top 구조
```

### 2. 컨테이너 시스템
```typescript
// tailwind.config.ts
container: {
  center: true,
  padding: {
    DEFAULT: '1rem',    // 500px에서 적용
    md: '2rem',        // 768px 이상에서 적용
  },
  screens: {
    '2xl': '1400px',   // 최대 너비
  },
}
```

### 3. 그리드 시스템 현황
- **메인 페이지**: grid-cols-1 lg:grid-cols-2
- **서비스 상세**: lg:col-span-2 (정보) + lg:col-span-1 (예약)
- **500px에서는 모두 1단 레이아웃**

### 4. 터치 인터페이스 문제점
- 버튼 높이: **h-9 (36px)** → 터치하기에 작음
- 최소 터치 영역: **44px x 44px** (Apple HIG 기준) 미달
- 메뉴 간격: 터치 친화적이지 않음

---

## 🎯 핵심 개선 영역 (우선순위별)

### 🔥 High Priority - 핵심 사용자 경험

#### 1. 예약 플로우 최적화
**현재 문제점:**
- 2단 레이아웃이 500px에서 좁아 보임
- Calendar 컴포넌트가 터치에 최적화되지 않음
- TimeRange selector가 작은 화면에서 사용하기 어려움

**개선 방향:**
- 단계별 진행 방식으로 변경 (캘린더 → 시간 → 할인 → 확인)
- 터치 영역 44px 이상으로 확대
- 시각적 피드백 강화

#### 2. 네비게이션 개선
**현재 문제점:**
- 로고 크기가 500px에서 상대적으로 큼
- 모바일 메뉴 버튼 크기 최적화 필요
- 메뉴 아이템 터치 영역 부족

**개선 방향:**
- 로고 크기 500px 전용 최적화
- 헤더 높이 및 패딩 재조정
- 모바일 메뉴 터치 친화적 개선

#### 3. 폼 인터페이스 터치 최적화
**현재 문제점:**
- 입력 필드 크기가 터치에 적합하지 않음
- 버튼 크기 36px로 터치하기 어려움
- 오류 메시지 표시 최적화 필요

**개선 방향:**
- 모든 입력 요소 최소 44px 높이 보장
- 간격 최소 8px 이상 유지
- 시각적 피드백 강화

### 🟡 Medium Priority - 사용성 개선

#### 4. 카드 레이아웃 최적화
- 패딩과 여백 500px에 맞게 조정
- 터치 영역 확대
- 정보 계층 구조 개선

#### 5. 이미지 갤러리
- 터치 제스처 지원 (스와이프, 확대/축소)
- 500px 너비에 맞는 이미지 크기
- 로딩 성능 최적화

#### 6. 타이포그래피
- 500px에서의 텍스트 크기 체계 정립
- line-height, letter-spacing 모바일 최적화
- 가독성 향상

### 🟢 Low Priority - 폴리시

#### 7. 애니메이션 최적화
- 모바일 성능 고려한 애니메이션
- 터치 피드백 애니메이션

#### 8. 로딩 상태
- 모바일 환경에 적합한 로딩 UI
- 스켈레톤 UI 적용

#### 9. 마이크로 인터랙션
- 터치 피드백 강화
- 상태 변화 시각적 표현

---

## 🛠 기술적 구현 전략

### 1. 브레이크포인트 전략

#### Option A: xs 브레이크포인트 추가 (권장)
```typescript
// tailwind.config.ts
screens: {
  'xs': '500px',      // 새로 추가
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1400px',
}
```

**장점:**
- 500px 전용 스타일링 가능
- 기존 코드와 호환성 유지
- 명확한 타겟팅

**단점:**
- 전체 시스템에 영향
- 기존 컴포넌트 수정 필요

#### Option B: 커스텀 클래스 활용
```css
/* globals.css */
@media (max-width: 499px) {
  .mobile-optimized {
    /* 500px 미만 스타일 */
  }
}

@media (min-width: 500px) and (max-width: 639px) {
  .mobile-500 {
    /* 500px~640px 전용 스타일 */
  }
}
```

**장점:**
- 기존 시스템에 영향 없음
- 점진적 적용 가능

**단점:**
- 클래스명 복잡화
- 일관성 부족 가능성

### 2. 컨테이너 최적화
```typescript
// tailwind.config.ts
container: {
  center: true,
  padding: {
    DEFAULT: '0.75rem',  // 500px에서 12px
    xs: '1rem',          // 500px 이상에서 16px
    md: '2rem',          // 768px 이상에서 32px
  },
  screens: {
    xs: '500px',
    '2xl': '1400px',
  },
}
```

### 3. 터치 인터페이스 개선
```css
/* globals.css - 모바일 최적화 */
@layer components {
  /* 터치 친화적 버튼 */
  .btn-touch {
    @apply min-h-11 px-4 py-3 text-base;
  }
  
  /* 500px 전용 타이포그래피 */
  .text-hero-mobile {
    @apply text-2xl xs:text-3xl sm:text-4xl;
  }
  
  /* 터치 영역 확대 */
  .touch-target {
    @apply min-h-11 min-w-11 flex items-center justify-center;
  }
}
```

---

## 📋 상세 구현 계획

### Phase 1: 기반 설정 (4시간)

#### Task 1-1: 브레이크포인트 전략 수립
```typescript
// tailwind.config.ts 수정
export default {
  theme: {
    screens: {
      'xs': '500px',    // 새로 추가
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1400px',
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '0.75rem',
        xs: '1rem',
        md: '2rem',
      },
      screens: {
        xs: '500px',
        '2xl': '1400px',
      },
    },
  }
}
```

#### Task 1-2: 기본 스타일 추가
```css
/* globals.css 추가 */
@layer components {
  /* 모바일 최적화 기본 클래스 */
  .mobile-container {
    @apply px-3 xs:px-4 sm:px-6;
  }
  
  .mobile-text-hero {
    @apply text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl;
  }
  
  .mobile-btn {
    @apply h-11 xs:h-10 px-4 text-base;
  }
  
  .mobile-input {
    @apply h-11 xs:h-10 px-3 text-base;
  }
}
```

### Phase 2: Header/Navigation 최적화 (4시간)

#### Task 2-1: Header 컴포넌트 수정
```typescript
// src/components/styles.ts
export const headerStyles = {
  container: "sticky top-0 z-50 w-full bg-white shadow-sm",
  innerContainer: "container flex h-14 xs:h-16 items-center mobile-container",
  
  // 로고 영역 - 500px 최적화
  logoContainer: "flex items-center",
  logo: "flex items-center mr-4 xs:mr-6",
  logoText: "text-lg xs:text-xl sm:text-2xl font-bold tracking-tighter text-black",
  
  // 네비게이션 - 터치 영역 확대
  desktopNav: "flex lg:flex-1 lg:items-center lg:justify-end lg:space-x-4 max-lg:hidden",
  mobileMenuButtonContainer: "flex flex-1 items-center justify-end lg:hidden",
  mobileNavContainer: "container lg:hidden",
  mobileNav: "flex flex-col space-y-3 p-4",
};

export const menuItemStyles = {
  // 터치 친화적 버튼
  baseButton: "touch-target",
  mobileButton: "w-full h-12 justify-start text-left",
  
  // 간격 조정
  icon: "mr-3 h-5 w-5 xs:h-4 xs:w-4",
};
```

#### Task 2-2: HeaderMenuItems 최적화
```typescript
// src/components/HeaderMenuItems.tsx 수정 부분
{isMobile ? (
  <Button 
    variant="ghost" 
    className="mobile-btn w-full justify-start"
    onClick={handleSignOut}
  >
    {/* 아이콘 크기 조정 */}
  </Button>
) : (
  <Button 
    variant="ghost" 
    size="sm"
    className="touch-target"
    onClick={handleSignOut}
  >
    {/* 데스크탑 버전 */}
  </Button>
)}
```

### Phase 3: 메인 페이지 최적화 (4시간)

#### Task 3-1: Hero Section 수정
```typescript
// src/app/page.tsx
<section className="py-8 xs:py-12 md:py-16 lg:py-20 -mt-6 xs:-mt-8">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xs:gap-8 items-center">
    <div className="space-y-4 xs:space-y-6">
      <h1 className="mobile-text-hero font-bold tracking-tight">
        스튜디오 예약이<br />더 쉽고 빠르게
      </h1>
      <p className="text-sm xs:text-base text-gray-600 max-w-lg mx-auto lg:mx-0">
        최고의 장비와 환경을 갖춘 프론토 스튜디오를 간편하게 예약하세요.
        사진, 영상 촬영을 위한 완벽한 공간을 제공합니다.
      </p>
      <Button 
        asChild 
        size="lg" 
        className="mobile-btn gap-2 bg-pronto-primary hover:bg-pronto-primary/90"
      >
        <Link href="/service/pronto-b">
          지금 예약하기
          <ArrowRight className="w-4 h-4" />
        </Link>
      </Button>
    </div>
    <div className="relative w-full h-[250px] xs:h-[300px] md:h-[400px] rounded-lg overflow-hidden shadow-xl">
      {/* 이미지 최적화 */}
    </div>
  </div>
</section>
```

#### Task 3-2: Feature Cards 최적화
```typescript
// Feature cards 섹션
<section className="py-8 xs:py-12 bg-pronto-gray-50 rounded-2xl">
  <div className="text-center mb-8 xs:mb-12">
    <h2 className="text-2xl xs:text-3xl font-bold mb-4">프론토 서비스의 특징</h2>
    <p className="text-sm xs:text-base text-gray-600 max-w-lg mx-auto">
      쉽고 빠른 예약 시스템과 최고의 스튜디오 환경을 경험하세요
    </p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xs:gap-8">
    <div className="bg-white p-4 xs:p-6 rounded-xl shadow-sm">
      {/* 카드 내용 최적화 */}
    </div>
  </div>
</section>
```

### Phase 4: 서비스 상세 페이지 최적화 (8시간)

#### Task 4-1: 레이아웃 개선
```typescript
// src/components/ServiceDetailClient.tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xs:gap-6 lg:gap-8">
  {/* 왼쪽 영역 (정보) */}
  <div className="lg:col-span-2 space-y-4 xs:space-y-6">
    {/* 컨텐츠 */}
  </div>
  
  {/* 오른쪽 영역 (예약) */}
  <div className="lg:col-span-1">
    <div className="lg:sticky lg:top-6 space-y-3 xs:space-y-4 lg:space-y-6">
      {/* 예약 폼 최적화 */}
    </div>
  </div>
</div>
```

#### Task 4-2: Calendar 최적화
```typescript
// Calendar 컴포넌트 터치 최적화
<div className="p-3 xs:p-4 lg:p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
  <h3 className="text-base xs:text-lg font-semibold mb-3 xs:mb-4">날짜 선택</h3>
  <div className="flex justify-center">
    <Calendar
      mode="single"
      selected={selectedDate || undefined}
      onSelect={handleDateSelect}
      className="rounded-md w-full max-w-sm"
      classNames={{
        day: "h-10 w-10 text-center text-sm rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
      }}
    />
  </div>
</div>
```

### Phase 5: UI 컴포넌트 최적화 (4시간)

#### Task 5-1: Button 컴포넌트 수정
```typescript
// src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        touch: "h-11 px-4 py-3", // 새로 추가
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

#### Task 5-2: Input 컴포넌트 수정
```typescript
// src/components/ui/input.tsx
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 xs:h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
```

### Phase 6: 폼 인터페이스 최적화 (4시간)

#### Task 6-1: BookingForm 최적화
```typescript
// src/domains/booking/components/BookingForm.tsx
// 모든 입력 필드에 터치 친화적 크기 적용
<Input 
  className="h-11 text-base"
  placeholder="연락처를 입력해주세요"
/>

<Button 
  type="submit" 
  size="touch"
  className="w-full gap-2"
>
  {isLoading ? "예약 중..." : `${finalPrice.toLocaleString()}원 결제하기`}
</Button>
```

#### Task 6-2: TimeUsageSelector 최적화
```typescript
// src/domains/booking/components/TimeUsageSelector.tsx
// 터치 영역 확대 및 간격 조정
<div className="space-y-3 xs:space-y-4">
  {availableCoupons.map((coupon) => (
    <div 
      key={coupon.id} 
      className="p-3 xs:p-4 border rounded-lg cursor-pointer hover:bg-gray-50 min-h-12"
      onClick={() => handleCouponToggle(coupon.id)}
    >
      {/* 쿠폰 내용 */}
    </div>
  ))}
</div>
```

---

## 📱 터치 인터페이스 가이드라인

### 1. 최소 터치 영역
- **모든 터치 가능 요소**: 최소 44px x 44px
- **버튼 높이**: h-11 (44px) 이상
- **아이콘 버튼**: 44px x 44px 최소

### 2. 간격 및 여백
- **터치 요소 간 간격**: 최소 8px
- **카드 내부 패딩**: 12px (모바일), 16px (500px+)
- **섹션 간 여백**: 32px (모바일), 48px (500px+)

### 3. 텍스트 크기
```css
/* 모바일 타이포그래피 스케일 */
.text-hero-mobile { font-size: 1.5rem; } /* 24px */
.text-title-mobile { font-size: 1.25rem; } /* 20px */
.text-body-mobile { font-size: 1rem; } /* 16px */
.text-caption-mobile { font-size: 0.875rem; } /* 14px */
```

---

## 🎯 성능 최적화 계획

### 1. 이미지 최적화
```typescript
// Next.js Image 컴포넌트 최적화
<Image
  src="https://picsum.photos/800/600"
  alt="Pronto Studio"
  width={800}
  height={600}
  sizes="(max-width: 500px) 100vw, (max-width: 640px) 90vw, 50vw"
  className="rounded-lg object-cover"
  priority={isAboveFold}
/>
```

### 2. 폰트 최적화
```css
/* 폰트 로딩 최적화 */
@font-face {
  font-family: 'Geist';
  font-display: swap;
  /* 모바일 환경에서 빠른 로딩 */
}
```

### 3. 번들 최적화
- 모바일 전용 컴포넌트 lazy loading
- 불필요한 데스크탑 스타일 tree-shaking
- Critical CSS 우선 로딩

---

## 📊 테스트 계획

### 1. 시각적 테스트
- **500px 가로폭**에서 모든 페이지 확인
- 터치 요소 크기 및 간격 검증
- 텍스트 가독성 확인

### 2. 사용성 테스트
- 터치 인터페이스 반응성
- 스크롤 및 네비게이션 매끄러움
- 폼 입력 편의성

### 3. 성능 테스트
- 모바일 환경 로딩 속도
- 터치 반응 지연시간
- 메모리 사용량

---

## 📅 구현 일정

### Week 1: 기반 설정 및 핵심 기능
- **Day 1**: Task 1 (브레이크포인트 전략) + Task 2 (Header 최적화)
- **Day 2**: Task 4 (서비스 상세 페이지 최적화)

### Week 2: 사용성 개선
- **Day 3**: Task 3 (메인 페이지) + Task 6 (폼 인터페이스)
- **Day 4**: Task 5 (UI 컴포넌트) + 성능 최적화

### Week 3: 폴리시 및 테스트
- **Day 5**: 타이포그래피, 이미지 최적화, 테스트

**총 예상 소요 시간: 5일 (40시간)**

---

## ✅ 체크리스트

### 기술적 준비
- [ ] xs 브레이크포인트 추가
- [ ] container 설정 최적화
- [ ] 기본 CSS 클래스 생성

### 컴포넌트 최적화
- [ ] Header/Navigation 터치 최적화
- [ ] Button 컴포넌트 터치 사이즈 추가
- [ ] Input 컴포넌트 모바일 최적화
- [ ] Calendar 터치 인터페이스 개선

### 페이지 최적화
- [ ] 메인 페이지 500px 최적화
- [ ] 서비스 상세 페이지 레이아웃 개선
- [ ] 예약 플로우 터치 최적화

### 성능 및 테스트
- [ ] 이미지 최적화 적용
- [ ] 폰트 로딩 최적화
- [ ] 500px 환경 테스트 완료
- [ ] 터치 인터페이스 검증 완료

---

## 🚀 다음 단계

1. **Executor 모드 전환**: 실제 구현 시작
2. **Phase 1 우선 진행**: 브레이크포인트 설정 및 Header 최적화
3. **점진적 적용**: 각 Phase별로 구현 후 테스트
4. **사용자 피드백 수집**: 실제 500px 환경에서 사용성 검증

**이제 실제 구현을 시작할 준비가 완료되었습니다!** 🎯
