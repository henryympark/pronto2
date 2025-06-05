# Container 패턴 마이그레이션 상세 가이드

## 📋 작업 순서 개요

1. ContentContainer 컴포넌트 생성
2. globals.css 수정
3. ConditionalWrapper 수정
4. 각 페이지 컴포넌트 수정
5. 컴포넌트 분리 및 리팩토링

---

## 1단계: ContentContainer 컴포넌트 생성

### 📁 파일 생성: `src/components/layout/ContentContainer.tsx`

```tsx
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContentContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'full' | 'wide';
  noPadding?: boolean;
  noGutter?: boolean; // 좌우 padding 제거
}

export function ContentContainer({ 
  children, 
  className,
  size = 'default',
  noPadding = false,
  noGutter = false
}: ContentContainerProps) {
  const sizeClasses = {
    default: 'max-w-[500px]',
    wide: 'max-w-[768px]',
    full: 'max-w-full'
  };

  return (
    <div 
      className={cn(
        "w-full mx-auto",
        sizeClasses[size],
        !noPadding && "py-6",
        !noGutter && "px-4",
        className
      )}
    >
      {children}
    </div>
  );
}
```

---

## 2단계: globals.css 수정

### 📁 파일 수정: `src/app/globals.css`

```css
@layer components {
  /* page-wrapper 클래스 제거 또는 주석 처리 */
  /* .page-wrapper { ... } */
  
  /* 새로운 유틸리티 클래스 추가 */
  .full-width {
    width: 100vw;
    position: relative;
    left: 50%;
    right: 50%;
    margin-left: -50vw;
    margin-right: -50vw;
  }
  
  /* 섹션 배경 스타일 */
  .section-gray {
    @apply bg-gray-50;
  }
  
  .section-primary {
    @apply bg-primary/5;
  }
  
  /* 이미지 오버레이 */
  .hero-overlay {
    @apply absolute inset-0 bg-black/40 flex items-center justify-center;
  }
}

/* body의 그라데이션 배경 제거 */
@layer base {
  body {
    @apply bg-background text-foreground;
    /* background: linear-gradient(...) 제거 */
  }
}
```

---

## 3단계: ConditionalWrapper 수정

### 📁 파일 수정: `src/components/layout/ConditionalWrapper.tsx`

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface ConditionalWrapperProps {
  children: ReactNode;
}

export function ConditionalWrapper({ children }: ConditionalWrapperProps) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');
  
  if (isAdminPage) {
    // 관리자 페이지: 전체 너비 사용
    return <div className="admin-full-width min-h-screen">{children}</div>;
  }
  
  // 일반 페이지: page-wrapper 제거
  return <div className="min-h-screen">{children}</div>;
}
```

---

## 4단계: 각 페이지 수정

### 📁 파일 수정: `src/app/page.tsx` (홈페이지)

```tsx
"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { ContentContainer } from '@/components/layout/ContentContainer';
// 분리된 컴포넌트들
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { CTASection } from '@/components/home/CTASection';

export default function Home() {
  return (
    <>
      {/* 히어로 섹션 - 전체 너비 */}
      <HeroSection />
      
      {/* 기능 섹션 - 제한된 너비 */}
      <ContentContainer>
        <FeaturesSection />
      </ContentContainer>
      
      {/* CTA 섹션 - 전체 너비 배경 */}
      <CTASection />
    </>
  );
}
```

### 📁 새 파일: `src/components/home/HeroSection.tsx`

```tsx
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ContentContainer } from '@/components/layout/ContentContainer';

export function HeroSection() {
  return (
    <section className="relative w-full h-[400px] md:h-[500px]">
      <Image 
        src="https://picsum.photos/1920/800"
        alt="Pronto Studio"
        fill
        style={{ objectFit: "cover" }}
        priority
      />
      <div className="hero-overlay">
        <ContentContainer className="text-center text-white">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            스튜디오 예약이<br />더 쉽고 빠르게
          </h1>
          <p className="text-lg md:text-xl mb-6 opacity-90">
            최고의 장비와 환경을 갖춘 프론토 스튜디오를 간편하게 예약하세요.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link href="/service/pronto-b">
              지금 예약하기
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </ContentContainer>
      </div>
    </section>
  );
}
```

### 📁 새 파일: `src/components/home/FeaturesSection.tsx`

```tsx
import { Calendar, Camera, Star } from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: "간편한 예약",
    description: "원하는 날짜와 시간을 클릭 몇 번으로 손쉽게 예약할 수 있습니다."
  },
  {
    icon: Camera,
    title: "최고의 장비",
    description: "전문 촬영을 위한 최신 장비와 시설이 모두 갖추어져 있습니다."
  },
  {
    icon: Star,
    title: "적립 혜택",
    description: "리뷰 작성 시 적립 시간을 드려 다음 이용 시 할인 혜택을 제공합니다."
  }
];

export function FeaturesSection() {
  return (
    <section className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">프론토 서비스의 특징</h2>
        <p className="text-gray-600">
          쉽고 빠른 예약 시스템과 최고의 스튜디오 환경을 경험하세요
        </p>
      </div>

      <div className="space-y-4">
        {features.map((feature, index) => (
          <div key={index} className="p-6 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold">{feature.title}</h3>
            </div>
            <p className="text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

### 📁 새 파일: `src/components/home/CTASection.tsx`

```tsx
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ContentContainer } from '@/components/layout/ContentContainer';

export function CTASection() {
  return (
    <section className="section-gray py-16">
      <ContentContainer className="text-center space-y-4">
        <h2 className="text-2xl font-bold">지금 바로 시작하세요</h2>
        <p className="text-gray-600">
          프론토와 함께 더 쉽고 효율적인 스튜디오 예약 경험을 만나보세요
        </p>
        <Button asChild size="lg" className="gap-2">
          <Link href="/service/pronto-b">
            스튜디오 둘러보기
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </ContentContainer>
    </section>
  );
}
```

---

### 📁 파일 수정: `src/components/ServiceDetailClient.tsx`

```tsx
"use client";

// ... imports ...
import { ContentContainer } from '@/components/layout/ContentContainer';

export default function ServiceDetailClient({ service }: ServiceDetailClientProps) {
  // ... 기존 로직 유지 ...

  return (
    <>
      {/* 이미지 갤러리 - 전체 너비 */}
      <section className="w-full">
        <StudioImageGallery studio={studioData} />
      </section>
      
      {/* 메인 콘텐츠 - 제한된 너비 */}
      <ContentContainer>
        <div className="space-y-6">
          {/* 기본 정보 카드 */}
          <StudioHeader studio={studioData} />
          
          {/* 탭 네비게이션 */}
          <StudioTabs studio={studioData} />
          
          {/* 날짜 선택 */}
          <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-4">날짜 선택</h3>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate || undefined}
                onSelect={handleDateSelect}
                onMonthChange={handleMonthChange}
                className="rounded-md border"
                disabled={(date) =>
                  date < new Date() || date < new Date("1900-01-01")
                }
              />
            </div>
          </div>

          {/* 예약 시간 선택 */}
          <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-4">시간 선택</h3>
            <TimeRangeSelector 
              serviceId={service.id}
              selectedDate={selectedDate}
              onTimeRangeChange={handleTimeRangeChange}
              pricePerHour={service.price_per_hour}
            />
          </div>
          
          {/* 예약 폼 */}
          <div data-section="reservation" className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-4">예약 정보</h3>
            <BookingForm 
              serviceId={service.id} 
              onReservationComplete={() => {
                console.log('[ServiceDetailClient] 예약 완료 - 시간슬라이더 새로고침');
                refetchAvailableTimes();
              }}
            />
          </div>
        </div>
      </ContentContainer>
    </>
  );
}
```

---

### 📁 파일 수정: `src/app/my/page.tsx`

```tsx
"use client";

// ... imports ...
import { ContentContainer } from '@/components/layout/ContentContainer';

export default function MyPage() {
  // ... 기존 로직 유지 ...

  return (
    <MyPageLayout
      isLoading={reservationsLoading}
      hasError={hasError}
      errorMessage={errorMessage}
      onRefresh={handleRefresh}
      onSignOut={handleSignOut}
    >
      <ContentContainer>
        <StatsSection
          accumulatedTime={accumulatedTime}
          couponsCount={couponsCount}
          reviewsCount={reviewsCount}
          onStatsCardClick={(path) => router.push(path)}
          isLoading={statsLoading}
        />

        <ReservationList
          reservations={filteredReservations}
          isLoading={reservationsLoading}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          onReservationClick={handleReservationClick}
          onExtensionClick={actions.openExtensionModal}
          hasError={hasError}
          errorMessage={errorMessage}
        />
      </ContentContainer>

      {/* 모달들은 Container 밖에 위치 */}
      <ReservationDetailModal
        reservation={selectedReservation}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCancelClick={(reservation) => {
          actions.openCancelModal(reservation);
          setIsModalOpen(false);
        }}
        onExtensionClick={actions.openExtensionModal}
        userName={user?.user_metadata?.name}
      />

      <CancelConfirmModal
        isOpen={cancelState.isCancelModalOpen}
        isCancelling={cancelState.isCancelling}
        onClose={actions.closeCancelModal}
        onConfirm={actions.confirmCancel}
      />

      {extensionState.extendingReservation && (
        <ExtensionModal
          reservation={extensionState.extendingReservation}
          open={extensionState.isExtensionModalOpen}
          onOpenChange={(open) => !open && actions.closeExtensionModal()}
          onSuccess={handleExtensionSuccess}
        />
      )}
    </MyPageLayout>
  );
}
```

---

### 📁 파일 수정: `src/components/Header.tsx`

```tsx
import { ContentContainer } from '@/components/layout/ContentContainer';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <ContentContainer noPadding className="py-4">
        <div className="flex items-center justify-between">
          {/* 헤더 콘텐츠 */}
        </div>
      </ContentContainer>
    </header>
  );
}
```

### 📁 파일 수정: `src/components/Footer.tsx`

```tsx
import { ContentContainer } from '@/components/layout/ContentContainer';

export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <ContentContainer className="py-8">
        {/* 푸터 콘텐츠 */}
      </ContentContainer>
    </footer>
  );
}
```

---

## 5단계: 특별한 레이아웃 패턴

### 전체 너비 배경 + 제한된 콘텐츠
```tsx
<section className="bg-gray-100 py-16">
  <ContentContainer>
    {/* 콘텐츠 */}
  </ContentContainer>
</section>
```

### 혼합 레이아웃 (이미지는 전체, 텍스트는 제한)
```tsx
<>
  <div className="w-full h-[400px]">
    <Image fill ... />
  </div>
  <ContentContainer>
    <p>설명 텍스트</p>
  </ContentContainer>
</>
```

### 사이드바가 있는 레이아웃
```tsx
<ContentContainer size="wide">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <aside className="md:col-span-1">
      {/* 사이드바 */}
    </aside>
    <main className="md:col-span-2">
      {/* 메인 콘텐츠 */}
    </main>
  </div>
</ContentContainer>
```

---

## ⚠️ 주의사항

1. **모달은 Container 밖에**: 모달 컴포넌트들은 ContentContainer 밖에 위치
2. **로딩/에러 상태**: Container 안에서 처리
3. **반응형**: 모바일에서는 자동으로 전체 너비 - padding
4. **중첩 금지**: ContentContainer 안에 또 다른 ContentContainer 사용 금지

---

## 🧪 테스트 체크리스트

- [ ] 홈페이지 레이아웃 정상 작동
- [ ] 서비스 상세 페이지 정상 작동
- [ ] 마이페이지 정상 작동
- [ ] 모달 위치 및 작동 확인
- [ ] 반응형 디자인 확인
- [ ] 관리자 페이지 영향 없음 확인

---

## 📊 마이그레이션 우선순위

1. **1단계**: ContentContainer 컴포넌트 생성
2. **2단계**: globals.css 수정
3. **3단계**: ConditionalWrapper 수정
4. **4단계**: 홈페이지부터 순차적으로 적용
5. **5단계**: 서비스 페이지, 마이페이지 순으로 진행

이렇게 단계별로 진행하면 오류를 최소화하면서 안전하게 마이그레이션할 수 있습니다.




----

## 🎯 근본적인 해결 방안

### 1. ServiceDetailClient.tsx 수정 - 이미지를 Container 밖으로

```tsx
"use client";

// ... imports ...

export default function ServiceDetailClient({ service }: ServiceDetailClientProps) {
  // ... 기존 로직 유지 ...

  return (
    <>
      {/* 이미지 캐러셀 - 전체 너비, Container 밖에 배치 */}
      <StudioImageGallery studio={studioData} />
      
      {/* 메인 콘텐츠 - 500px 제한 */}
      <ContentContainer>
        <div className="space-y-6">
          {/* 나머지 콘텐츠 */}
        </div>
      </ContentContainer>
    </>
  );
}
```

### 2. StudioImageGallery 개선 - 진짜 캐러셀로 업그레이드

```tsx
/**
 * 개선된 StudioImageGallery - 전체 너비 캐러셀
 * src/domains/studio/components/StudioImageGallery.tsx
 */

"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { getStudioImageUrl } from '../services/studioUtils';
import type { Studio } from '../types';

interface StudioImageGalleryProps {
  studio: Studio;
  maxImages?: number;
}

export const StudioImageGallery = React.memo(({ 
  studio, 
  maxImages = 8 
}: StudioImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 기본 플레이스홀더 이미지 URL
  const getPlaceholderImage = (width: number = 600) => 
    `https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=${width}&h=${Math.floor(width * 0.6)}&fit=crop&crop=center`;

  const images = React.useMemo(() => {
    if (!studio.images || studio.images.length === 0) {
      // 데모용 여러 이미지
      return [
        getPlaceholderImage(800),
        getPlaceholderImage(801),
        getPlaceholderImage(802),
        getPlaceholderImage(803),
        getPlaceholderImage(804),
      ];
    }
    
    return studio.images
      .slice(0, maxImages)
      .map(imageId => {
        const imageUrl = getStudioImageUrl(studio.id, imageId, 'large');
        return failedImages.has(imageUrl) ? getPlaceholderImage(1200) : imageUrl;
      });
  }, [studio.id, studio.images, maxImages, failedImages]);

  // 스크롤 위치로 이동
  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const itemWidth = container.offsetWidth;
      container.scrollTo({
        left: itemWidth * index,
        behavior: 'smooth'
      });
      setCurrentIndex(index);
    }
  };

  // 이전/다음 버튼
  const handlePrev = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    scrollToIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = Math.min(images.length - 1, currentIndex + 1);
    scrollToIndex(newIndex);
  };

  // 스크롤 이벤트로 현재 인덱스 업데이트
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollPosition = container.scrollLeft;
      const itemWidth = container.offsetWidth;
      const newIndex = Math.round(scrollPosition / itemWidth);
      setCurrentIndex(newIndex);
    }
  };

  // 마우스 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current!.offsetLeft);
    setScrollLeft(scrollContainerRef.current!.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current!.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current!.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 터치 이벤트 (모바일)
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].pageX - scrollContainerRef.current!.offsetLeft);
    setScrollLeft(scrollContainerRef.current!.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const x = e.touches[0].pageX - scrollContainerRef.current!.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current!.scrollLeft = scrollLeft - walk;
  };

  if (images.length === 0) return null;

  return (
    <>
      {/* 메인 캐러셀 - 전체 너비 */}
      <div className="relative w-full bg-gray-900">
        {/* 스크롤 컨테이너 */}
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth"
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {images.map((image, index) => (
            <div
              key={index}
              className="w-full flex-shrink-0 snap-center"
            >
              <div className="relative aspect-video md:aspect-[16/10]">
                <img
                  src={image}
                  alt={`${studio.name} - 이미지 ${index + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('unsplash.com')) {
                      setFailedImages(prev => new Set(prev).add(target.src));
                      target.src = getPlaceholderImage(800);
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 좌우 네비게이션 버튼 */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all ${
                currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={currentIndex === 0}
              aria-label="이전 이미지"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button
              onClick={handleNext}
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all ${
                currentIndex === images.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={currentIndex === images.length - 1}
              aria-label="다음 이미지"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* 인디케이터 */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToIndex(index)}
                className={`transition-all ${
                  index === currentIndex 
                    ? 'w-8 h-2 bg-white' 
                    : 'w-2 h-2 bg-white/50 hover:bg-white/70'
                } rounded-full`}
                aria-label={`이미지 ${index + 1}번으로 이동`}
              />
            ))}
          </div>
        )}

        {/* 확대 버튼 */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
          aria-label="이미지 확대"
        >
          <Expand className="h-5 w-5" />
        </button>

        {/* 이미지 카운터 */}
        <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 text-white rounded-lg text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* 썸네일 리스트 (옵션) */}
      {images.length > 3 && (
        <div className="w-full bg-gray-100 py-4">
          <div className="max-w-[500px] mx-auto px-4">
            <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => scrollToIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex 
                      ? 'border-blue-500 shadow-lg scale-105' 
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img
                    src={image}
                    alt={`썸네일 ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('unsplash.com')) {
                        target.src = getPlaceholderImage(200);
                      }
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 전체화면 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors z-10"
            aria-label="닫기"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={images[currentIndex]}
              alt={`${studio.name} - 이미지 ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* 모달 네비게이션 */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-4 p-3 bg-white/10 text-white rounded-lg hover:bg-white/20"
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                
                <button
                  onClick={handleNext}
                  className="absolute right-4 p-3 bg-white/10 text-white rounded-lg hover:bg-white/20"
                  disabled={currentIndex === images.length - 1}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
});

StudioImageGallery.displayName = 'StudioImageGallery';
```

### 3. 스크롤바 숨기기 CSS 추가 (globals.css)

```css
@layer utilities {
  /* 스크롤바 숨기기 */
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }
}
```

## 🎯 이 솔루션의 장점

1. **전체 너비 활용**: 이미지가 화면 전체 너비 사용
2. **스크롤 가능**: 좌우 스크롤로 이미지 탐색
3. **터치 지원**: 모바일에서 스와이프 가능
4. **마우스 드래그**: 데스크톱에서도 드래그로 이동
5. **스냅 스크롤**: 이미지가 중앙에 정확히 정렬
6. **인디케이터**: 현재 위치 표시
7. **썸네일 옵션**: 빠른 이미지 선택

## 🔧 추가 개선 사항

### 1. 자동 재생 기능 추가
```tsx
useEffect(() => {
  if (autoPlay && images.length > 1) {
    const interval = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(interval);
  }
}, [currentIndex, autoPlay]);
```

### 2. 무한 스크롤
```tsx
const handleNext = () => {
  const newIndex = (currentIndex + 1) % images.length;
  scrollToIndex(newIndex);
};
```

### 3. 이미지 로딩 최적화
```tsx
<img
  src={image}
  loading={index === 0 ? "eager" : "lazy"}
  // ...
/>
```

이렇게 하면 이미지 영역이 전체 화면 너비를 활용하면서도 나머지 콘텐츠는 500px 제약을 유지할 수 있습니다!