import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || !name) {
      return NextResponse.json({ message: '필수 입력 항목이 누락되었습니다.' }, { status: 400 });
    }

    const newUser = {
      id: 'user-' + Date.now(),
      name: body.name || '신규유저',
      email: email,
      position: '직원',
      wageType: 'hourly',
      dailyWorkHours: 8,
      weeklyWorkDays: 5,
      company: {
        name: '',
        address: '',
        latitude: 0,
        longitude: 0,
        radiusMeters: 100,
      },
      onboardingCompleted: false, // 최초 가입이므로 온보딩 미완료
    };

    return NextResponse.json({
      token: `mock-jwt-token-reg-fallback-${newUser.id}-${Date.now()}`,
      user: newUser,
    });
  } catch (error) {
    return NextResponse.json({ message: '회원가입 요청 처리에 실패했습니다.' }, { status: 400 });
  }
}
