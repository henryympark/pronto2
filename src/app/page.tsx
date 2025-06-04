"use client";

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
