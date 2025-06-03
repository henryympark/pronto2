"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Camera, Calendar, Star } from 'lucide-react';

export default function Home() {
  return (
    <div className="w-full max-w-[500px] mx-auto px-4 py-6">
      {/* 단일 열 레이아웃 - 모바일 친화적 */}
      <div className="space-y-8">
        {/* 히어로 섹션 */}
        <section className="text-center space-y-6">
          <div className="relative w-full h-[250px] rounded-lg overflow-hidden shadow-xl mb-6">
            <Image 
              src="https://picsum.photos/800/600"
              alt="Pronto Studio"
              fill
              style={{ objectFit: "cover" }}
              className="rounded-lg"
            />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              스튜디오 예약이<br />더 쉽고 빠르게
            </h1>
            <p className="text-gray-600 leading-relaxed">
              최고의 장비와 환경을 갖춘 프론토 스튜디오를 간편하게 예약하세요.
              사진, 영상 촬영을 위한 완벽한 공간을 제공합니다.
            </p>
            <Button asChild size="lg" className="gap-2 bg-primary hover:bg-primary/90">
              <Link href="/service/pronto-b">
                지금 예약하기
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* 서비스 특징 */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">프론토 서비스의 특징</h2>
            <p className="text-gray-600">
              쉽고 빠른 예약 시스템과 최고의 스튜디오 환경을 경험하세요
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold">간편한 예약</h3>
              </div>
              <p className="text-gray-600">
                원하는 날짜와 시간을 클릭 몇 번으로 손쉽게 예약할 수 있습니다.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Camera className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold">최고의 장비</h3>
              </div>
              <p className="text-gray-600">
                전문 촬영을 위한 최신 장비와 시설이 모두 갖추어져 있습니다.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold">적립 혜택</h3>
              </div>
              <p className="text-gray-600">
                리뷰 작성 시 적립 시간을 드려 다음 이용 시 할인 혜택을 제공합니다.
              </p>
            </div>
          </div>
        </section>

        {/* CTA 섹션 */}
        <section className="text-center space-y-4 py-6">
          <h2 className="text-2xl font-bold">지금 바로 시작하세요</h2>
          <p className="text-gray-600">
            프론토와 함께 더 쉽고 효율적인 스튜디오 예약 경험을 만나보세요
          </p>
          <Button asChild size="lg" className="gap-2 bg-primary hover:bg-primary/90">
            <Link href="/service/pronto-b">
              스튜디오 둘러보기
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
