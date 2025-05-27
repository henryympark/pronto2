"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/contexts/SupabaseContext";

export default function TestReviewsPage() {
  const supabase = useSupabase();
  const [reviews, setReviews] = useState<any[]>([]);
  const [joinedReviews, setJoinedReviews] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. 리뷰 테이블 직접 조회
        const { data: reviewsData, error: reviewsError } = await supabase
          .from("reviews")
          .select("*")
          .order("created_at", { ascending: false });

        // 1-2. 조인 쿼리 테스트 (customer_id는 auth.users를 참조하므로 수동 조인 필요)
        const { data: joinedReviewsData, error: joinedReviewsError } = await supabase
          .from("reviews")
          .select(`
            *,
            service:services(id, name),
            images:review_images(id, image_url)
          `)
          .order("created_at", { ascending: false });

        if (joinedReviewsError) {
          console.error("조인 리뷰 조회 오류:", joinedReviewsError);
          setError(`조인 리뷰 조회 오류: ${joinedReviewsError.message}`);
          return;
        }

        if (reviewsError) {
          console.error("리뷰 조회 오류:", reviewsError);
          setError(`리뷰 조회 오류: ${reviewsError.message}`);
          return;
        }

        // 2. 고객 테이블 조회
        const { data: customersData, error: customersError } = await supabase
          .from("customers")
          .select("*");

        if (customersError) {
          console.error("고객 조회 오류:", customersError);
          setError(`고객 조회 오류: ${customersError.message}`);
          return;
        }

        // 3. 서비스 테이블 조회
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select("*");

        if (servicesError) {
          console.error("서비스 조회 오류:", servicesError);
          setError(`서비스 조회 오류: ${servicesError.message}`);
          return;
        }

        // 수동으로 고객 정보 조인
        const reviewsWithCustomers = (joinedReviewsData || []).map(review => {
          const customer = (customersData || []).find(c => c.id === review.customer_id);
          return {
            ...review,
            customer: customer ? {
              id: customer.id,
              nickname: customer.nickname,
              email: customer.email
            } : null
          };
        });

        setReviews(reviewsData || []);
        setJoinedReviews(reviewsWithCustomers);
        setCustomers(customersData || []);
        setServices(servicesData || []);

        console.log("리뷰 데이터:", reviewsData);
        console.log("조인된 리뷰 데이터:", joinedReviewsData);
        console.log("고객 데이터:", customersData);
        console.log("서비스 데이터:", servicesData);

      } catch (err) {
        console.error("데이터 조회 오류:", err);
        setError(`데이터 조회 오류: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">리뷰 데이터 테스트</h1>
        <p>데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">리뷰 데이터 테스트</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>오류:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">리뷰 데이터 테스트</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">리뷰 데이터 ({reviews.length}개)</h2>
          <div className="bg-gray-100 p-4 rounded">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(reviews, null, 2)}
            </pre>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">조인된 리뷰 데이터 ({joinedReviews.length}개)</h2>
          <div className="bg-blue-100 p-4 rounded">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(joinedReviews, null, 2)}
            </pre>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">고객 데이터 ({customers.length}개)</h2>
          <div className="bg-gray-100 p-4 rounded">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(customers, null, 2)}
            </pre>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">서비스 데이터 ({services.length}개)</h2>
          <div className="bg-gray-100 p-4 rounded">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(services, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
} 