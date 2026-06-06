'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function SplashPage() {
  const router = useRouter();
  const { isAuthenticated, onboardingCompleted } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (!onboardingCompleted) {
        router.replace('/onboarding/wage-type');
      } else {
        router.replace('/home');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, onboardingCompleted, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}>
      <div className="flex flex-col items-center gap-4">
        {/* 앱 아이콘 */}
        <div style={{
          width: 80, height: 80,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.3)',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="white"/>
          </svg>
        </div>
        <h1 style={{ color: 'white', fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>근무관리</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>출퇴근 · 급여 · 휴가 한 번에</p>
      </div>
      {/* 로딩 인디케이터 */}
      <div style={{ position: 'absolute', bottom: 60, display: 'flex', gap: 8 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: i === 0 ? 'white' : 'rgba(255,255,255,0.4)',
          }} />
        ))}
      </div>
    </div>
  );
}
