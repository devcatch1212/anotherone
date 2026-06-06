import { User } from '@/types';

export let mockUsers: User[] = [
  {
    id: 'user-1',
    name: '김민준',
    employeeId: 'EMP001',
    email: 'minjun@company.com',
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
  },
  {
    id: 'user-2',
    name: '이서연',
    employeeId: 'EMP002',
    email: 'seoyeon@company.com',
    department: '서비스팀',
    position: '일용직',
    wageType: 'daily',
    dailyWage: 130000,
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
  },
];

export const currentMockUser = mockUsers[0];
