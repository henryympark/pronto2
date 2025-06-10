'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <div className="text-center space-y-4">
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
    </div>
  );
} 