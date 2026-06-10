import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Authorization 헤더가 있으면 이를 복원하고 없으면 디폴트 김민준 유저를 반환
  const authHeader = request.headers.get('Authorization') || '';
  let name = '김민준';
  let email = 'minjun@company.com';
  let onboardingCompleted = true;

  // 만약 회원가입 완료 후 발급된 토큰이라면 온보딩 상태를 false로 지정
  if (authHeader.includes('mock-jwt-token-reg-fallback-')) {
    onboardingCompleted = false;
  }

  const user = {
    id: 'user-1',
    name: '김토스',
    email: 'test@example.com',
    position: '매니저',
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
    onboardingCompleted,
  };

  return NextResponse.json({ user });
}
