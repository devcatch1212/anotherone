'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useAuthStore } from '@/store/auth.store';
import { StepIndicator } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { fetchApi } from '@/lib/api';

export default function OnboardingCompletePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const store = useOnboardingStore();
  const { completeOnboarding, updateUser } = useAuthStore();

  const handleComplete = async () => {
    setLoading(true);
    setServerError('');
    try {
      const resData = await fetchApi('/api/onboarding/company', {
        method: 'POST',
        body: JSON.stringify({
          wageType: store.wageType,
          hourlyWage: store.hourlyWage,
          dailyWage: store.dailyWage,
          dailyWorkHours: store.dailyWorkHours,
          weeklyWorkDays: store.weeklyWorkDays,
          workStartTime: store.workStartTime,
          workEndTime: store.workEndTime,
          workDaysOfWeek: store.workDaysOfWeek,
          breakMinutes: store.breakMinutes,
          companyName: store.companyName,
          address: store.companyAddress,
          latitude: store.companyLat,
          longitude: store.companyLng,
          radiusMeters: store.radiusMeters,
        }),
      });
      
      // The API returns { company, employment }, but we also need updated User data
      // For now, we will fetch me
      const meData = await fetchApi('/api/auth/me');
      updateUser(meData);
      
      completeOnboarding();
      store.reset();
      router.replace('/home');
    } catch (e: any) {
      setServerError(e.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const wageLabel =
    store.wageType === 'hourly'
      ? `시급 ${formatCurrency(store.hourlyWage)}`
      : `일급 ${formatCurrency(store.dailyWage)}`;

  const items = [
    {
      label: '급여 유형',
      value: store.wageType === 'hourly' ? '시급제 계약직' : '일급제 계약직',
    },
    { label: '급여', value: wageLabel },
    {
      label: '소정 근로시간',
      value: `일 ${store.dailyWorkHours}시간 / 주 ${store.weeklyWorkDays}일`,
    },
    { label: '회사명', value: store.companyName },
    { label: '근무지 주소', value: store.companyAddress },
    { label: '인증 반경', value: `${store.radiusMeters}m 이내` },
  ];

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'transparent' }}>
      
      {/* 상단 반투명 헤더 */}
      <div 
        style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
          padding: '48px 20px 16px',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <StepIndicator steps={3} current={3} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)' }}>3/3</span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
          설정 완료 확인
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, fontWeight: 500 }}>
          입력하신 정보를 확인해주세요
        </p>
      </div>

      <div style={{ padding: '20px 20px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* 입력 정보 요약 카드 */}
        <div 
          className="glass-card"
          style={{
            borderRadius: 24, padding: '24px 20px',
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            display: 'flex', flexDirection: 'column', gap: 16
          }}
        >
          {items.map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                {item.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'right' }}>
                {item.value || '-'}
              </span>
            </div>
          ))}
        </div>

        {/* 안내 배너 */}
        <div 
          style={{
            borderRadius: 18, padding: '14px 18px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            fontSize: 13, fontWeight: 700, color: 'var(--color-primary)',
          }}
        >
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            <span>ℹ</span>
            <span>안내</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
            설정 완료 후에도 환경설정 메뉴에서 언제든지 내용을 수정하실 수 있습니다.
          </p>
        </div>

        {serverError && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            borderRadius: 14,
            padding: '12px 16px',
            fontSize: 13, color: 'var(--color-danger)', fontWeight: 600
          }}>
            ⚠ {serverError}
          </div>
        )}

        {/* 이전 / 시작하기 버튼 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              height: 50, borderRadius: 16, border: 'none',
              background: 'rgba(0, 0, 0, 0.05)',
              color: 'var(--color-text-secondary)', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'none'}
          >
            ← 수정
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={loading}
            style={{
              height: 50, borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #6366F1 100%)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 6px 16px rgba(99, 102, 241, 0.2)',
              transition: 'all 0.2s', opacity: loading ? 0.7 : 1
            }}
            onMouseDown={e => {
              if (!loading) {
                e.currentTarget.style.transform = 'scale(0.97)';
                e.currentTarget.style.opacity = '0.95';
              }
            }}
            onMouseUp={e => {
              if (!loading) {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.opacity = '1';
              }
            }}
          >
            {loading ? '저장 중...' : '시작하기 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
}
