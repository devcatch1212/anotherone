import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Employment } from '@/types';

interface AuthState {
  token: string | null;
  user: User | null;
  currentCompanyId: string | null;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  setAuth: (token: string, user: User) => void;
  updateUser: (user: Partial<User>) => void;
  setCurrentCompany: (companyId: string) => void;
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
      isAuthenticated: false,
      onboardingCompleted: false,
      setAuth: (token, user) => set({ 
        token, user, isAuthenticated: true, onboardingCompleted: user.onboardingCompleted,
        currentCompanyId: user.employments?.find(e => e.isPrimary)?.companyId || user.employments?.[0]?.companyId || null
      }),
      updateUser: (partial) => set({ user: get().user ? { ...get().user!, ...partial } : null }),
      setCurrentCompany: (companyId) => set({ currentCompanyId: companyId }),
      updateEmployment: (companyId, data) => {
        const user = get().user;
        if (!user) return;
        const newEmployments = user.employments.map(e => e.companyId === companyId ? { ...e, ...data } : e);
        set({ user: { ...user, employments: newEmployments } });
      },
      clearAuth: () => set({ token: null, user: null, isAuthenticated: false, currentCompanyId: null }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
    }),
    { name: 'auth-storage' }
  )
);
