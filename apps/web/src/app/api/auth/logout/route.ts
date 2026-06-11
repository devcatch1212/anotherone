import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // 백엔드 NestJS 로그아웃 API 호출
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch((err) => {
      console.warn('Backend logout failed or unreachable:', err);
    });

    return NextResponse.json({ success: true, message: '성공적으로 로그아웃되었습니다.' });
  } catch (error) {
    return NextResponse.json({ message: '로그아웃 요청 처리에 실패했습니다.' }, { status: 400 });
  }
}
