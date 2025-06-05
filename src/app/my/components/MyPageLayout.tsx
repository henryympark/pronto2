"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, LogOut, User } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Link from "next/link";

interface MyPageLayoutProps {
  children: ReactNode;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onRefresh?: () => void;
  onSignOut?: () => void;
  showUserActions?: boolean;
}

export function MyPageLayout({
  children,
  isLoading = false,
  hasError = false,
  errorMessage = "",
  onRefresh,
  onSignOut,
  showUserActions = true
}: MyPageLayoutProps) {
  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* 헤더 영역 - showUserActions가 true일 때만 표시 */}
        {showUserActions && (
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">마이페이지</h1>
          </div>
        )}
        
        {/* 로딩 중 표시 */}
        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">데이터를 불러오는 중입니다...</span>
          </div>
        )}

        {/* 오류 메시지 */}
        {hasError && !isLoading && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>예약 정보 조회 실패</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
            {onRefresh && (
              <div className="mt-4">
                <Button onClick={onRefresh} variant="outline" className="flex items-center gap-2">
                  새로고침
                </Button>
              </div>
            )}
          </Alert>
        )}

        {/* 메인 콘텐츠 */}
        {children}

        {/* 내 정보 및 로그아웃 버튼 - showUserActions가 true일 때만 표시 */}
        {showUserActions && onSignOut && (
          <div className="flex flex-col space-y-4 justify-start mb-8">
            <Link href="/my/profile">
              <Button variant="outline" className="flex items-center justify-center w-40">
                <User className="mr-2 h-4 w-4" />
                내 정보
              </Button>
            </Link>
            <Button variant="outline" onClick={onSignOut} className="flex items-center justify-center w-40">
              <LogOut className="h-4 w-4 mr-2" />
              <span>로그아웃</span>
            </Button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
} 