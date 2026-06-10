import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 온보딩 완료 시 전달되는 데이터를 기반으로 최종 유저 객체를 모의 생성 및 응답
    const updatedUser = {
      id: 'user-1',
      name: '김토스',
      email: 'test@example.com',
      position: '매니저',
      wageType: body.wageType || 'hourly',
      hourlyWage: body.hourlyWage || 12000,
      dailyWage: body.dailyWage,
      dailyWorkHours: body.dailyWorkHours || 8,
      weeklyWorkDays: body.weeklyWorkDays || 5,
      company: body.company || {
        name: '(주)예시건설',
        address: '서울특별시 강남구 테헤란로 152',
        latitude: 37.5004,
        longitude: 127.0368,
        radiusMeters: 100,
      },
      onboardingCompleted: true,
    };

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    return NextResponse.json({ message: '온보딩 정보 처리에 실패했습니다.' }, { status: 400 });
  }
}
