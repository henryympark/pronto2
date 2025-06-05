"use client";

import { ContentContainer } from '@/components/layout/ContentContainer';
// 분리된 컴포넌트들
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { CTASection } from '@/components/home/CTASection';

export default function Home() {
  return (
    <ContentContainer noGutter={true} className="pt-0">
      <div className="space-y-8">
        {/* 히어로 섹션 */}
        <HeroSection />
        
        {/* 기능 섹션 */}
        <FeaturesSection />
        
        {/* CTA 섹션 */}
        <CTASection />
      </div>
    </ContentContainer>
  );
}
