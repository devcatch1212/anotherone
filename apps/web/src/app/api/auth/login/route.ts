import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email || 'minjun@company.com';
    
    // 기본 모의 유저 데이터 반환
    const user = {
      id: 'user-1',
      name: '김민준',
      employeeId: 'EMP001',
      email: email,
      department: '현장팀',
      position: '계약직',
      wageType: 'hourly',
      hourlyWage: 12000,
      dailyWorkHours: 8,
      weeklyWorkDays: 5,
      company: {
        name: '(주)예시건설',
        address: '서울특별시 강남구 테헤란로 152',
        latitude: 37.5004,
        longitude: 127.0368,
        radiusMeters: 100,
      },
      onboardingCompleted: true,
    };

    return NextResponse.json({
      token: `mock-jwt-token-fallback-${Date.now()}`,
      user,
    });
  } catch (error) {
    return NextResponse.json({ message: '로그인 요청 처리에 실패했습니다.' }, { status: 400 });
  }
}
