"use client";

import { AccountIcon } from '@/components/account';

export default function TestAccountIconPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">AccountIcon 컴포넌트 테스트</h1>
          <p className="text-muted-foreground">
            다양한 크기와 상태의 계정 아이콘을 테스트해볼 수 있습니다.
          </p>
        </div>

        {/* 크기별 테스트 */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">크기 옵션</h2>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <AccountIcon size="sm" />
              <span className="text-sm text-muted-foreground">Small (sm)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <AccountIcon size="md" />
              <span className="text-sm text-muted-foreground">Medium (md)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <AccountIcon size="lg" />
              <span className="text-sm text-muted-foreground">Large (lg)</span>
            </div>
          </div>
        </div>

        {/* 툴팁 테스트 */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">툴팁 테스트</h2>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <AccountIcon showTooltip={true} />
              <span className="text-sm text-muted-foreground">툴팁 있음</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <AccountIcon showTooltip={false} />
              <span className="text-sm text-muted-foreground">툴팁 없음</span>
            </div>
          </div>
        </div>

        {/* 접근성 테스트 */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">접근성 테스트</h2>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              • Tab 키로 포커스 이동 테스트<br/>
              • Enter 또는 Space 키로 클릭 테스트<br/>
              • 스크린 리더 aria-label 확인
            </p>
            <AccountIcon />
          </div>
        </div>

        {/* 사용 안내 */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">테스트 방법</h2>
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm">
              <strong>로그인 상태 테스트:</strong> 현재 인증 상태에 따라 아이콘 색상이 변경됩니다.
            </p>
            <p className="text-sm">
              <strong>네비게이션 테스트:</strong> 아이콘을 클릭하면 로그인/마이페이지로 이동합니다.
            </p>
            <p className="text-sm">
              <strong>로딩 테스트:</strong> 페이지 새로고침 직후 로딩 스피너를 확인할 수 있습니다.
            </p>
            <p className="text-sm">
              <strong>툴팁 테스트:</strong> 아이콘에 마우스를 올려서 툴팁을 확인하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 