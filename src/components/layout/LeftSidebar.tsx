'use client';

export function LeftSidebar() {
  return (
    <aside className="hidden lg:block fixed left-0 top-14 bottom-0 w-[calc((100vw-500px)/2)] max-w-xs p-4">
      <div className="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border">
        <h3 className="font-semibold mb-4">퀵 메뉴</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>추후 기능 추가 예정:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>빠른 예약</li>
            <li>최근 이용 내역</li>
            <li>즐겨찾기</li>
            <li>알림 센터</li>
          </ul>
        </div>
      </div>
    </aside>
  );
} 