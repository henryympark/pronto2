'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
      <Image 
        src="https://picsum.photos/1920/800"
        alt="Pronto Studio"
        fill
        style={{ objectFit: "cover" }}
        priority
      />
      <div className="hero-overlay">
        <div className="text-center text-white px-4">
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
        </div>
      </div>
    </div>
  );
} 