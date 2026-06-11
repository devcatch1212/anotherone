import { User } from '@/types';

export let mockUsers: User[] = [
  {
    id: 'user-1',
    name: '김토스',
    email: 'test@example.com',
    onboardingCompleted: true,
    employments: [
      {
        id: 'emp-1',
        userId: 'user-1',
        companyId: 'company-1',
        company: {
          id: 'company-1',
          name: '토스(주)',
          address: '서울시 강남구 테헤란로 142',
          latitude: 37.4999,
          longitude: 127.0374,
          radiusMeters: 50,
        },
        position: '매니저',
        wageType: 'hourly',
        hourlyWage: 12000,
        dailyWorkHours: 8,
        weeklyWorkDays: 5,
        workStartTime: '09:00',
        workEndTime: '18:00',
        workDaysOfWeek: [0, 1, 2, 3, 4],
        breakMinutes: 60,
        isPrimary: true,
        isActive: true,
      }
    ],
  },
  {
    id: 'user-2',
    name: '이당근',
    email: 'test2@example.com',
    onboardingCompleted: false,
    employments: [
      {
        id: 'emp-2',
        userId: 'user-2',
        companyId: 'company-2',
        company: {
          id: 'company-2',
          name: '당근(주)',
          address: '서울시 서초구 강남대로 123',
          latitude: 37.4922,
          longitude: 127.0286,
          radiusMeters: 100,
        },
        position: '스태프',
        wageType: 'daily',
        dailyWage: 130000,
        dailyWorkHours: 8,
        weeklyWorkDays: 6,
        workStartTime: '10:00',
        workEndTime: '19:00',
        workDaysOfWeek: [0, 1, 2, 3, 4, 5],
        breakMinutes: 60,
        isPrimary: true,
        isActive: true,
      }
    ],
  },
];

export const currentMockUser = mockUsers[0];
