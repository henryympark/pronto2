"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Camera, Calendar, Star } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col gap-12">
      {/* 히어로 섹션 */}
      <section className="py-12 md:py-16 lg:py-20 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              스튜디오 예약이<br />더 쉽고 빠르게
            </h1>
            <p className="section-description">
              최고의 장비와 환경을 갖춘 프론토 스튜디오를 간편하게 예약하세요.
              사진, 영상 촬영을 위한 완벽한 공간을 제공합니다.
            </p>
            <Button asChild size="lg" className="gap-2 bg-pronto-primary hover:bg-pronto-primary/90">
              <Link href="/service/pronto-b">
                지금 예약하기
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          <div className="relative w-full h-[300px] md:h-[400px] rounded-lg overflow-hidden shadow-xl">
            <Image 
              src="https://picsum.photos/800/600"
              alt="Pronto Studio"
              fill
              style={{ objectFit: "cover" }}
              className="rounded-lg"
            />
          </div>
        </div>
      </section>

      {/* 서비스 특징 */}
      <section className="py-12 bg-pronto-gray-50 rounded-2xl">
        <div className="text-center mb-12">
          <h2 className="section-title">프론토 서비스의 특징</h2>
          <p className="section-description">
            쉽고 빠른 예약 시스템과 최고의 스튜디오 환경을 경험하세요
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="feature-card">
            <div className="icon-badge">
              <Calendar className="w-6 h-6 text-pronto-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">간편한 예약</h3>
            <p className="text-pronto-gray-600">
              원하는 날짜와 시간을 클릭 몇 번으로 손쉽게 예약할 수 있습니다.
            </p>
          </div>

          <div className="feature-card">
            <div className="icon-badge">
              <Camera className="w-6 h-6 text-pronto-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">최고의 장비</h3>
            <p className="text-pronto-gray-600">
              전문 촬영을 위한 최신 장비와 시설이 모두 갖추어져 있습니다.
            </p>
          </div>

          <div className="feature-card">
            <div className="icon-badge">
              <Star className="w-6 h-6 text-pronto-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">적립 혜택</h3>
            <p className="text-pronto-gray-600">
              리뷰 작성 시 적립 시간을 드려 다음 이용 시 할인 혜택을 제공합니다.
            </p>
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-12 text-center">
        <h2 className="section-title">지금 바로 시작하세요</h2>
        <p className="section-description mb-6">
          프론토와 함께 더 쉽고 효율적인 스튜디오 예약 경험을 만나보세요
        </p>
        <Button asChild size="lg" className="gap-2 bg-pronto-primary hover:bg-pronto-primary/90">
          <Link href="/service/pronto-b">
            스튜디오 둘러보기
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
