import { useAuthStore } from '@/store/auth.store';
import { useAttendanceStore } from '@/store/attendance.store';
import { useOnboardingStore } from '@/store/onboarding.store';

/**
 * 로그아웃 및 브라우저 데이터 캐시 청소를 일괄 처리하는 글로벌 헬퍼 함수
 */
export async function handleGlobalLogout() {
  try {
    // 1. API 로그아웃 엔드포인트 호출
    await fetch('/api/auth/logout', { method: 'POST' }).catch((err) => {
      console.warn('API logout endpoint call failed:', err);
    });
  } finally {
    // 2. 모든 Zustand 스토어 상태 초기화
    useAuthStore.getState().clearAuth();
    
    // Attendance Store 초기화
    useAttendanceStore.getState().setTodayRecord(null);
    useAttendanceStore.getState().setRecords([]);
    useAttendanceStore.getState().setState('before');
    
    // Onboarding Store 초기화
    useOnboardingStore.getState().reset();

    // 3. 브라우저 로컬/세션 저장소 완전 클리어 및 쿠키 제거
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      
      // 쿠키 전체 만료 처리
      try {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
          if (name) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          }
        }
      } catch (e) {
        console.warn('Failed to clear cookies:', e);
      }

      // 4. Next.js App Router 메모리 캐시 및 React 상태를 원천 차단하기 위해 하드 새로고침 리디렉트
      window.location.href = '/login';
    }
  }
}
