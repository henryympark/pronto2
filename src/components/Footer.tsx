"use client";

import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="mb-6 md:mb-0">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="text-xl font-bold text-pronto-primary">Pronto</span>
            </Link>
            <p className="text-sm text-pronto-gray-500">
              스튜디오 예약 서비스, 더 쉽게 더 빠르게
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold mb-4">서비스</h3>
              <ul className="space-y-2 text-sm">
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
              <h3 className="text-sm font-semibold mb-4">고객지원</h3>
              <ul className="space-y-2 text-sm">
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
              <h3 className="text-sm font-semibold mb-4">회사</h3>
              <ul className="space-y-2 text-sm">
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
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-pronto-gray-400 text-center">
            &copy; {currentYear} Pronto Studio. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
} 