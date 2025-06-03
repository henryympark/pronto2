export default function ServicePage() {
  return (
    <div className="py-6 space-y-6">
      <h1 className="text-2xl font-bold">서비스</h1>
      <div className="grid gap-4">
        {/* 서비스 목록 */}
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold">스튜디오 예약</h3>
          <p className="text-sm text-muted-foreground mt-1">
            원하는 스튜디오를 쉽고 빠르게 예약하세요
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold">장비 대여</h3>
          <p className="text-sm text-muted-foreground mt-1">
            전문적인 촬영 장비를 합리적인 가격에 이용하세요
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold">촬영 서비스</h3>
          <p className="text-sm text-muted-foreground mt-1">
            전문 사진작가와 함께하는 프리미엄 촬영 서비스
          </p>
        </div>
      </div>
    </div>
  );
} 