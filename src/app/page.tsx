"use client";

// 분리된 컴포넌트들
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { CTASection } from '@/components/home/CTASection';

export default function Home() {
  return (
    <>
      {/* 히어로 섹션 - 패딩 없음 */}
      <section>
        <HeroSection />
      </section>
      
      {/* 기능 섹션 - 흰색 배경 */}
      <section className="bg-white px-4 py-8">
        <FeaturesSection />
      </section>
      
      {/* CTA 섹션 - 흰색 배경 */}
      <section className="bg-white px-4 py-8">
        <CTASection />
      </section>
    </>
  );
}
