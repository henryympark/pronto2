"use client";

import Link from "next/link";
import { MobileNavigation } from "@/components/layout/MobileNavigation";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* 모바일에서는 하단 네비게이션으로 대체 */}
      <footer className="hidden md:block border-t bg-white">
        <div className="max-w-[500px] mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <Link href="/" className="inline-flex items-center gap-2 mb-4">
                <span className="text-xl font-bold text-pronto-primary">Pronto</span>
              </Link>
              <p className="text-sm text-pronto-gray-500">
                스튜디오 예약 서비스, 더 쉽게 더 빠르게
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <h3 className="text-sm font-semibold mb-2">서비스</h3>
                <ul className="space-y-1 text-xs">
                  <li>
                    <Link href="/service/pronto-a" className="text-pronto-gray-500 hover:text-pronto-primary">
                      Pronto-A
                    </Link>
                  </li>
                  <li>
                    <Link href="/service/info" className="text-pronto-gray-500 hover:text-pronto-primary">
                      이용 안내
                    </Link>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold mb-2">고객지원</h3>
                <ul className="space-y-1 text-xs">
                  <li>
                    <Link href="/faq" className="text-pronto-gray-500 hover:text-pronto-primary">
                      자주 묻는 질문
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="text-pronto-gray-500 hover:text-pronto-primary">
                      문의하기
                    </Link>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold mb-2">회사</h3>
                <ul className="space-y-1 text-xs">
                  <li>
                    <Link href="/privacy" className="text-pronto-gray-500 hover:text-pronto-primary">
                      개인정보처리방침
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="text-pronto-gray-500 hover:text-pronto-primary">
                      이용약관
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-pronto-gray-400 text-center">
                &copy; {currentYear} Pronto Studio. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
      
      {/* 모바일 하단 네비게이션 추가 */}
      <MobileNavigation />
    </>
  );
} 