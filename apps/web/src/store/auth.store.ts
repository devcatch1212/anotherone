import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, Employment } from '@/types';

interface AuthState {
  token: string | null;
  user: User | null;
  currentCompanyId: string | null;
  currentEmploymentId: string | null;  // 추가: 현재 고용계약 ID
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  setAuth: (token: string, user: User) => void;
  updateUser: (user: Partial<User>) => void;
  setCurrentCompany: (companyId: string) => void;
  setCurrentEmployment: (employmentId: string) => void;
  updateEmployment: (companyId: string, data: Partial<Employment>) => void;
  clearAuth: () => void;
  completeOnboarding: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      currentCompanyId: null,
      currentEmploymentId: null,
      isAuthenticated: false,
      onboardingCompleted: false,
      setAuth: (token, user) => {
        const primaryEmployment = user.employments?.find(e => e.isPrimary) || user.employments?.[0];
        set({
          token,
          user,
          isAuthenticated: true,
          onboardingCompleted: user.onboardingCompleted,
          currentCompanyId: primaryEmployment?.companyId || null,
          currentEmploymentId: primaryEmployment?.id || null,
        });
      },
      updateUser: (partial) => set({ user: get().user ? { ...get().user!, ...partial } : null }),
      setCurrentCompany: (companyId) => {
        const user = get().user;
        const employment = user?.employments?.find(e => e.companyId === companyId);
        set({
          currentCompanyId: companyId,
          currentEmploymentId: employment?.id || null,
        });
      },
      setCurrentEmployment: (employmentId) => set({ currentEmploymentId: employmentId }),
      updateEmployment: (companyId, data) => {
        const user = get().user;
        if (!user) return;
        const newEmployments = user.employments.map(e => e.companyId === companyId ? { ...e, ...data } : e);
        set({ user: { ...user, employments: newEmployments } });
      },
      clearAuth: () => set({
        token: null,
        user: null,
        isAuthenticated: false,
        currentCompanyId: null,
        currentEmploymentId: null,
      }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
    }),
    {
      name: 'auth-storage',
      version: 2, // 스키마 불일치 에러를 방지하기 위해 버전 업그레이드
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // 구버전 캐시가 감지되면 데이터를 비워서 런타임 에러 차단
          return {
            token: null,
            user: null,
            currentCompanyId: null,
            currentEmploymentId: null,
            isAuthenticated: false,
            onboardingCompleted: false,
          };
        }
        return persistedState as any;
      },
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          if (typeof window === 'undefined') return null;
          if (window.localStorage.getItem('remember-me') === 'true') {
            return window.localStorage.getItem(name);
          }
          return window.sessionStorage.getItem(name);
        },
        setItem: (name: string, value: string) => {
          if (typeof window === 'undefined') return;
          if (window.localStorage.getItem('remember-me') === 'true') {
            window.localStorage.setItem(name, value);
            window.sessionStorage.removeItem(name);
          } else {
            window.sessionStorage.setItem(name, value);
            window.localStorage.removeItem(name);
          }
        },
        removeItem: (name: string) => {
          if (typeof window === 'undefined') return;
          window.localStorage.removeItem(name);
          window.sessionStorage.removeItem(name);
        },
      })),
    }
  )
);
