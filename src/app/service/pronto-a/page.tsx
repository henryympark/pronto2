"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProntoAServiceRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/service/pronto-b");
  }, [router]);
  
  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-lg text-pronto-gray-600">
          리디렉션 중입니다...
        </p>
      </div>
    </div>
  );
} 