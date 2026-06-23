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
        // isActive=true인 계약을 우선 선택. 퇴사 처리된 계약이 isPrimary여도 건너뜀.
        const activeEmployments = user.employments?.filter(e => e.isActive) ?? [];
        const primaryEmployment =
          activeEmployments.find(e => e.isPrimary) ||
          activeEmployments[0] ||
          user.employments?.[0]; // 모두 퇴사한 경우는 마지막 계약 표시
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
        // isActive인 계약을 우선, 없으면 비활성 계약도 허용 (이력 조회 목적)
        const employment =
          user?.employments?.find(e => e.companyId === companyId && e.isActive) ||
          user?.employments?.find(e => e.companyId === companyId);
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
        const updatedState: Partial<AuthState> = { user: { ...user, employments: newEmployments } };

        // 퇴사 처리(isActive=false)된 계약이 현재 선택된 계약이면 다른 활성 계약으로 자동 전환
        if (data.isActive === false && get().currentCompanyId === companyId) {
          const nextActive = newEmployments.find(e => e.isActive && e.companyId !== companyId);
          updatedState.currentCompanyId = nextActive?.companyId ?? null;
          updatedState.currentEmploymentId = nextActive?.id ?? null;
        }

        set(updatedState);
      },
      clearAuth: () => set({
        token: null,
        user: null,
        isAuthenticated: false,
        onboardingCompleted: false,
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
          return window.localStorage.getItem(name);
        },
        setItem: (name: string, value: string) => {
          if (typeof window === 'undefined') return;
          window.localStorage.setItem(name, value);
          window.sessionStorage.removeItem(name);
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
