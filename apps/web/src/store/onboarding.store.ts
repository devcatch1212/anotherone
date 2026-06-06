import { create } from 'zustand';
import { WageType } from '@/types';

interface OnboardingState {
  wageType: WageType | null;
  hourlyWage: number;
  dailyWage: number;
  dailyWorkHours: number;
  weeklyWorkDays: number;
  workDaysOfWeek: number[]; // 0=월 1=화 2=수 3=목 4=금 5=토 6=일
  workStartTime: string; // "HH:mm"
  workEndTime: string;   // "HH:mm"
  breakMinutes: number;
  payDay: number; // 1~31
  workStartDate: string; // "YYYY-MM-DD"
  companyName: string;
  companyAddress: string;
  companyLat: number;
  companyLng: number;
  radiusMeters: number;
  setWageInfo: (data: Partial<OnboardingState>) => void;
  setCompanyInfo: (data: Pick<OnboardingState, 'companyName' | 'companyAddress' | 'companyLat' | 'companyLng'>) => void;
  reset: () => void;
}

const defaults = {
  wageType: null as WageType | null,
  hourlyWage: 0,
  dailyWage: 0,
  dailyWorkHours: 8,
  weeklyWorkDays: 5,
  workDaysOfWeek: [0, 1, 2, 3, 4],
  workStartTime: '09:00',
  workEndTime: '18:00',
  breakMinutes: 60,
  payDay: 25,
  workStartDate: '',
  companyName: '',
  companyAddress: '',
  companyLat: 0,
  companyLng: 0,
  radiusMeters: 100,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...defaults,
  setWageInfo: (data) => set(data),
  setCompanyInfo: (data) => set(data),
  reset: () => set(defaults),
}));
