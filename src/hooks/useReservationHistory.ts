import { useState, useEffect } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { ReservationHistory } from '@/types/reservation';

export function useReservationHistory(reservationId: string | null) {
  const [history, setHistory] = useState<ReservationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabase();

  useEffect(() => {
    if (!reservationId) {
      setHistory([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[예약 이력] 조회 시작:', { reservationId });

        const { data, error: fetchError } = await supabase
          .from('reservation_history')
          .select('*')
          .eq('reservation_id', reservationId)
          .order('created_at', { ascending: false }); // 최신 순으로 정렬

        console.log('[예약 이력] 조회 결과:', { 
          data, 
          error: fetchError,
          dataLength: data?.length || 0 
        });

        if (fetchError) {
          console.error('예약 이력 조회 실패:', {
            error: fetchError,
            message: fetchError.message,
            details: fetchError.details,
            hint: fetchError.hint,
            code: fetchError.code
          });
          
          // 더 자세한 에러 메시지 생성
          let errorMessage = '예약 이력을 불러오는데 실패했습니다.';
          if (fetchError.message) {
            errorMessage += ` (${fetchError.message})`;
          }
          if (fetchError.code) {
            errorMessage += ` [코드: ${fetchError.code}]`;
          }
          
          setError(errorMessage);
          return;
        }

        console.log('[예약 이력] 성공적으로 조회됨:', data?.length || 0, '건');
        setHistory(data || []);
      } catch (err) {
        console.error('예약 이력 조회 중 예외 발생:', err);
        const errorMessage = err instanceof Error 
          ? `예약 이력을 불러오는 중 오류가 발생했습니다: ${err.message}`
          : '예약 이력을 불러오는 중 알 수 없는 오류가 발생했습니다.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [reservationId, supabase]);

  return { history, loading, error };
} 