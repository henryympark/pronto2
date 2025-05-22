import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

/**
 * 특정 예약 상세 조회 API
 * GET /api/reservations/:reservationId
 */
export async function GET(request: NextRequest) {
  try {
    // URL에서 reservationId 추출
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const reservationId = pathParts[pathParts.length - 1];
    
    if (!reservationId) {
      return NextResponse.json(
        { error: "예약 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 예약 정보 조회
    const { data: reservation, error } = await supabaseServer
      .from("reservations")
      .select(`
        *,
        services:service_id (name, price_per_hour, location, image_url),
        customers:customer_id (email, nickname, phone)
      `)
      .eq("id", reservationId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "해당 예약을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: "예약 정보를 조회하는 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reservation });
    
  } catch (error) {
    console.error("예약 조회 중 오류 발생:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 예약 상태 업데이트 API
 * PATCH /api/reservations/:reservationId
 */
export async function PATCH(request: NextRequest) {
  try {
    // URL에서 reservationId 추출
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const reservationId = pathParts[pathParts.length - 1];
    
    if (!reservationId) {
      return NextResponse.json(
        { error: "예약 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { status } = body;

    // 상태 유효성 검사
    if (!status || !["pending", "confirmed", "canceled", "completed"].includes(status)) {
      return NextResponse.json(
        { error: "유효한 예약 상태를 제공해주세요 (pending, confirmed, canceled, completed)." },
        { status: 400 }
      );
    }

    // 예약 존재 확인
    const { data: existingReservation, error: checkError } = await supabaseServer
      .from("reservations")
      .select("id, status")
      .eq("id", reservationId)
      .single();

    if (checkError) {
      if (checkError.code === "PGRST116") {
        return NextResponse.json(
          { error: "해당 예약을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: "예약 정보를 조회하는 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // 이미 취소된 예약은 상태 변경 불가
    if (existingReservation.status === "canceled" && status !== "canceled") {
      return NextResponse.json(
        { error: "이미 취소된 예약은 상태를 변경할 수 없습니다." },
        { status: 409 }
      );
    }

    // 예약 상태 업데이트
    const { data: updatedReservation, error: updateError } = await supabaseServer
      .from("reservations")
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", reservationId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "예약 상태 업데이트 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "예약 상태가 성공적으로 업데이트되었습니다.",
      reservation: updatedReservation
    });
    
  } catch (error) {
    console.error("예약 상태 업데이트 중 오류 발생:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 예약 삭제 API
 * DELETE /api/reservations/:reservationId
 */
export async function DELETE(request: NextRequest) {
  try {
    // URL에서 reservationId 추출
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const reservationId = pathParts[pathParts.length - 1];
    
    if (!reservationId) {
      return NextResponse.json(
        { error: "예약 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 예약 존재 확인
    const { data: existingReservation, error: checkError } = await supabaseServer
      .from("reservations")
      .select("id")
      .eq("id", reservationId)
      .single();

    if (checkError) {
      if (checkError.code === "PGRST116") {
        return NextResponse.json(
          { error: "해당 예약을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: "예약 정보를 조회하는 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // 예약 삭제
    const { error: deleteError } = await supabaseServer
      .from("reservations")
      .delete()
      .eq("id", reservationId);

    if (deleteError) {
      return NextResponse.json(
        { error: "예약 삭제 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "예약이 성공적으로 삭제되었습니다."
    });
    
  } catch (error) {
    console.error("예약 삭제 중 오류 발생:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 