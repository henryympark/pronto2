import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Payment request created webhook received:', {
      reservationId: body.reservationId,
      customerId: body.customerId,
      customerName: body.customerName,
      serviceId: body.serviceId,
      serviceName: body.serviceName,
      startTime: body.startTime,
      endTime: body.endTime,
      totalPrice: body.totalPrice,
      adminMemo: body.adminMemo,
      timestamp: new Date().toISOString()
    });

    // 여기서 Make/n8n으로 웹훅을 전송하거나 
    // 카카오 알림톡 발송 로직을 구현할 수 있습니다.
    // Phase 8에서 실제 카카오 알림톡 연동 예정

    return NextResponse.json({ 
      success: true, 
      message: 'Payment request webhook processed successfully' 
    });
  } catch (error) {
    console.error('Payment request webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
} 