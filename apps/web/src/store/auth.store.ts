import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  setAuth: (token: string, user: User) => void;
  updateUser: (user: Partial<User>) => void;
  clearAuth: () => void;
  completeOnboarding: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      onboardingCompleted: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true, onboardingCompleted: user.onboardingCompleted }),
      updateUser: (partial) => set({ user: get().user ? { ...get().user!, ...partial } : null }),
      clearAuth: () => set({ token: null, user: null, isAuthenticated: false }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
    }),
    { name: 'auth-storage' }
  )
);
