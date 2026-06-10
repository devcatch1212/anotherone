import { http, HttpResponse } from 'msw';
import { currentMockUser, mockUsers } from '../data/users';
import { User } from '@/types';

// 토큰에서 사용자 식별을 위한 헬퍼 함수
const getUserFromRequest = (request: Request): User | null => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '').trim();
  let userId = '';
  
  if (token.startsWith('mock-jwt-token-reg-')) {
    const parts = token.replace('mock-jwt-token-reg-', '').split('-');
    if (parts.length >= 2) {
      userId = parts.slice(0, -1).join('-');
    }
  } else if (token.startsWith('mock-jwt-token-')) {
    const parts = token.replace('mock-jwt-token-', '').split('-');
    if (parts.length >= 2) {
      userId = parts.slice(0, -1).join('-');
    }
  }
  
  if (userId) {
    return mockUsers.find(u => u.id === userId) || null;
  }
  return null;
};

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    
    // 동적 가입 유저 또는 기존 mockUsers 리스트에서 이메일 검색
    const foundUser = mockUsers.find(u => u.email === body.email);
    const targetUser = foundUser || currentMockUser;
    
    return HttpResponse.json({
      token: `mock-jwt-token-${targetUser.id}-${Date.now()}`,
      user: targetUser,
    });
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as {
      email: string;
      password?: string;
      name: string;
      position?: string;
    };

    const exists = mockUsers.some(u => u.email === body.email);
    if (exists) {
      return HttpResponse.json({ message: '이미 가입된 이메일 주소입니다.' }, { status: 400 });
    }

    const newUser: User = {
      id: 'user-' + Date.now(),
      name: body.name || '',
      email: body.email,
      onboardingCompleted: false, // 최초 가입이므로 온보딩 미완료
      employments: [],
    };

    mockUsers.push(newUser);

    // 가입 완료 후 즉시 자동 로그인(토큰 발급) 처리
    return HttpResponse.json({
      token: `mock-jwt-token-reg-${newUser.id}-${Date.now()}`,
      user: newUser,
    });
  }),

  http.get('/api/auth/me', ({ request }) => {
    const user = getUserFromRequest(request) || currentMockUser;
    return HttpResponse.json({ user });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/onboarding', async ({ request }) => {
    const user = getUserFromRequest(request);
    const body = await request.json() as Record<string, any>;
    
    if (user) {
      const userIdx = mockUsers.findIndex(u => u.id === user.id);
      if (userIdx !== -1) {
        const newEmployment = {
          id: 'emp-' + Date.now(),
          userId: user.id,
          companyId: 'company-' + Date.now(),
          company: body.company,
          position: '직원',
          wageType: body.wageType || 'hourly',
          hourlyWage: body.hourlyWage,
          dailyWage: body.dailyWage,
          dailyWorkHours: body.dailyWorkHours || 8,
          weeklyWorkDays: body.weeklyWorkDays || 5,
          workStartTime: body.workStartTime || '09:00',
          workEndTime: body.workEndTime || '18:00',
          workDaysOfWeek: body.workDaysOfWeek || [0, 1, 2, 3, 4],
          breakMinutes: body.breakMinutes || 60,
          isPrimary: mockUsers[userIdx].employments.length === 0,
        };
        
        mockUsers[userIdx] = {
          ...mockUsers[userIdx],
          employments: [...(mockUsers[userIdx].employments || []), newEmployment],
          onboardingCompleted: true,
        };
        return HttpResponse.json({ success: true, user: mockUsers[userIdx] });
      }
    }
    
    const newEmployment = {
      id: 'emp-' + Date.now(),
      userId: currentMockUser.id,
      companyId: 'company-' + Date.now(),
      company: body.company,
      position: '직원',
      wageType: body.wageType || 'hourly',
      hourlyWage: body.hourlyWage,
      dailyWage: body.dailyWage,
      dailyWorkHours: body.dailyWorkHours || 8,
      weeklyWorkDays: body.weeklyWorkDays || 5,
      workStartTime: body.workStartTime || '09:00',
      workEndTime: body.workEndTime || '18:00',
      workDaysOfWeek: body.workDaysOfWeek || [0, 1, 2, 3, 4],
      breakMinutes: body.breakMinutes || 60,
      isPrimary: (currentMockUser.employments || []).length === 0,
    };
    
    const updatedFallbackUser = {
      ...currentMockUser,
      employments: [...(currentMockUser.employments || []), newEmployment],
      onboardingCompleted: true
    };
    Object.assign(currentMockUser, updatedFallbackUser);
    return HttpResponse.json({ success: true, user: updatedFallbackUser });
  }),
];
