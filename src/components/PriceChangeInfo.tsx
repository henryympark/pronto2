"use client";

interface Reservation {
  id: string;
  service_id: string;
  customer_id?: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  total_price: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PriceChangeInfoProps {
  originalPrice: number;
  newPrice: number;
  showDetails?: boolean;
}

export default function PriceChangeInfo({ originalPrice, newPrice, showDetails = true }: PriceChangeInfoProps) {
  // 가격 차이 계산
  const difference = newPrice - originalPrice;
  const isAdditionalPayment = difference > 0;
  const isRefund = difference < 0;
  const absDifference = Math.abs(difference);

  // 가격 변동이 없으면 아무것도 표시하지 않음
  if (difference === 0) return null;

  return (
    <div className={`p-3 rounded-md ${
      isAdditionalPayment 
        ? 'bg-orange-50 border border-orange-200' 
        : 'bg-blue-50 border border-blue-200'
    }`}>
      {showDetails && (
        <>
          <div className="flex justify-between items-center">
            <span>기존 금액</span>
            <span>{originalPrice.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span>변경 금액</span>
            <span>{newPrice.toLocaleString()}원</span>
          </div>
          <div className="border-t border-gray-200 my-2"></div>
        </>
      )}
      
      <div className="flex justify-between items-center font-medium">
        <span>{isAdditionalPayment ? '추가 결제 금액' : '환불 예정 금액'}</span>
        <span>{absDifference.toLocaleString()}원</span>
      </div>
      
      {isAdditionalPayment && (
        <p className="mt-2 text-sm text-orange-600 font-medium">
          시간 변경으로 인해 추가 결제가 필요합니다.
        </p>
      )}
      
      {isRefund && (
        <p className="mt-2 text-sm text-blue-600 font-medium">
          시간 변경으로 인해 환불이 진행될 예정입니다.
        </p>
      )}
    </div>
  );
} 