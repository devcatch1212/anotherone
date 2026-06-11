'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useAuthStore } from '@/store/auth.store';
import { StepIndicator } from '@/components/ui';
import { format } from 'date-fns';
import { fetchApi } from '@/lib/api';

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const CURRENT_MIN_WAGE = 10030;

export default function WageTypePage() {
  const router = useRouter();
  const store = useOnboardingStore();
  const { completeOnboarding, updateUser } = useAuthStore();
  const [loadingSkip, setLoadingSkip] = useState(false);

  const handleSkip = async () => {
    setLoadingSkip(true);
    try {
      // 1. 백엔드에 skip API 호출하여 온보딩 상태를 완료로 업데이트
      await fetchApi('/api/onboarding/skip', { method: 'POST' });
      
      // 2. 최신 사용자 정보 동기화
      const meData = await fetchApi('/api/auth/me');
      updateUser(meData);
      
      // 3. Zustand 로컬 상태 업데이트 및 홈 이동
      completeOnboarding();
      store.reset();
      router.replace('/home');
    } catch (e) {
      console.error('Failed to skip onboarding:', e);
      // API 오류 시에도 사용자 경험을 위해 로컬 상태 변경 후 진입
      completeOnboarding();
      store.reset();
      router.replace('/home');
    } finally {
      setLoadingSkip(false);
    }
  };

  const [wageType, setWageType] = useState<'hourly' | 'monthly'>(
    store.wageType === 'daily' ? 'monthly' : 'hourly'
  );
  const [workDays, setWorkDays] = useState<number[]>(store.workDaysOfWeek);
  const [startTime, setStartTime] = useState(store.workStartTime || '09:00');
  const [endTime, setEndTime] = useState(store.workEndTime || '18:00');
  const [wage, setWage] = useState(store.hourlyWage || store.dailyWage || 0);
  const [payDay, setPayDay] = useState(store.payDay || 25);
  const [breakMins, setBreakMins] = useState(store.breakMinutes || 60);
  const [workStartDate, setWorkStartDate] = useState(
    store.workStartDate || format(new Date(), 'yyyy-MM-dd')
  );

  const toggleDay = (idx: number) => {
    setWorkDays(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx].sort()
    );
  };

  // 일 근무시간 계산 (퇴근 - 출근 - 휴게)
  const calcDailyHours = () => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const totalMins = (eh * 60 + em) - (sh * 60 + sm) - breakMins;
    return Math.max(0, totalMins / 60);
  };

  const handleNext = () => {
    const dailyHours = calcDailyHours();
    store.setWageInfo({
      wageType: wageType === 'hourly' ? 'hourly' : 'daily',
      hourlyWage: wageType === 'hourly' ? wage : 0,
      dailyWage: wageType === 'monthly' ? wage : 0,
      dailyWorkHours: dailyHours,
      weeklyWorkDays: workDays.length,
      workDaysOfWeek: workDays,
      workStartTime: startTime,
      workEndTime: endTime,
      breakMinutes: breakMins,
      payDay,
      workStartDate,
    });
    router.push('/onboarding/company');
  };

  const isValid = 
    (wageType === 'hourly' ? wage >= CURRENT_MIN_WAGE : wage > 0) &&
    workDays.length > 0 &&
    startTime &&
    endTime &&
    workStartDate;

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
          <StepIndicator steps={3} current={1} />
          <button
            type="button"
            onClick={handleSkip}
            disabled={loadingSkip}
            style={{
              background: 'none', border: 'none',
              fontSize: 13, fontWeight: 700,
              color: 'var(--color-primary)', cursor: loadingSkip ? 'not-allowed' : 'pointer',
              opacity: 0.8
            }}
            onMouseEnter={e => !loadingSkip && (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => !loadingSkip && (e.currentTarget.style.opacity = '0.8')}
          >
            {loadingSkip ? '처리 중...' : '건너뛰기'}
          </button>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
          어떻게 일하세요?
        </h1>
      </div>

      <div style={{ padding: '20px 20px 140px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* 근무 시작일 */}
        <div 
          className="glass-card" 
          style={{
            borderRadius: 24, padding: '16px 20px',
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            display: 'flex', alignItems: 'center', gap: 12
          }}
        >
          <span style={{ fontSize: 18 }}>📅</span>
          <div className="flex flex-col flex-1">
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 2 }}>근무 시작일</span>
            <input
              type="date"
              value={workStartDate}
              onChange={e => setWorkStartDate(e.target.value)}
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)',
                width: '100%'
              }}
            />
          </div>
        </div>

        {/* 시급 / 월급 전환 탭 */}
        <div 
          style={{
            display: 'flex', background: 'rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 14, padding: 4, gap: 4,
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          {(['hourly', 'monthly'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setWageType(t)}
              style={{
                flex: 1, borderRadius: 10, border: 'none',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: wageType === t ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
                color: wageType === t ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                boxShadow: wageType === t ? '0 4px 12px rgba(0, 0, 0, 0.03)' : 'none',
                padding: '10px 0',
                transition: 'all 0.2s'
              }}
            >
              {t === 'hourly' ? '시급제' : '월급제'}
            </button>
          ))}
        </div>

        {/* 주당 근무요일 선택 */}
        <div 
          className="glass-card" 
          style={{
            borderRadius: 24, padding: '20px',
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 12 }}>주당 근무요일</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
            {DAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleDay(idx)}
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  border: 'none',
                  background: workDays.includes(idx)
                    ? 'linear-gradient(135deg, var(--color-primary) 0%, #6366F1 100%)'
                    : 'rgba(255, 255, 255, 0.25)',
                  color: workDays.includes(idx) ? '#fff' : 'var(--color-text-secondary)',
                  boxShadow: workDays.includes(idx) ? '0 4px 14px rgba(99, 102, 241, 0.3)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 출퇴근 시간 입력 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* 출근 시간 */}
          <div 
            className="glass-card"
            style={{
              borderRadius: 24, padding: '16px 18px',
              background: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>출근시간</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⏰</span>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                style={{
                  border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)',
                  width: '100%', cursor: 'pointer'
                }}
              />
            </div>
          </div>
          
          {/* 퇴근 시간 */}
          <div 
            className="glass-card"
            style={{
              borderRadius: 24, padding: '16px 18px',
              background: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>퇴근시간</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⏰</span>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                style={{
                  border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)',
                  width: '100%', cursor: 'pointer'
                }}
              />
            </div>
          </div>
        </div>

        {/* 급여액 입력 */}
        <div 
          className="glass-card"
          style={{
            borderRadius: 24, padding: '20px',
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            display: 'flex', flexDirection: 'column', gap: 6
          }}
        >
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
            {wageType === 'hourly' ? '시급 입력 (원)' : '월 급여 입력 (원)'}
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 14, fontSize: 15, fontWeight: 700, color: 'var(--color-text-muted)' }}>₩</span>
            <input
              type="number"
              value={wage || ''}
              onChange={e => setWage(Number(e.target.value))}
              placeholder={wageType === 'hourly' ? '시급' : '월급'}
              min={wageType === 'hourly' ? CURRENT_MIN_WAGE : 1}
              style={{
                width: '100%', height: 46, borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.5)',
                background: 'rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '0 14px 0 32px', fontSize: 15, fontWeight: 700,
                color: 'var(--color-text-primary)', outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
              onFocus={e => {
                e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                e.target.style.border = '1px solid var(--color-primary)';
                e.target.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.25)';
              }}
              onBlur={e => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                e.target.style.border = '1px solid rgba(255, 255, 255, 0.5)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '4px 0 0', fontWeight: 500 }}>
            {wageType === 'hourly'
              ? `💡 2025년 최저시급은 ${CURRENT_MIN_WAGE.toLocaleString()}원입니다`
              : '💡 세전 월 급여 기준으로 입력해주세요'}
          </p>
        </div>

        {/* 월급받는 날 (월급제일 때만 표시하도록 개선) */}
        {wageType === 'monthly' && (
          <div 
            className="glass-card"
            style={{
              borderRadius: 24, padding: '16px 20px',
              background: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>🗓</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>월급받는 날 입력</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                value={payDay}
                onChange={e => setPayDay(Math.min(31, Math.max(1, Number(e.target.value))))}
                min={1}
                max={31}
                style={{
                  width: 44, height: 32, borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  background: 'rgba(255, 255, 255, 0.3)',
                  padding: '0 6px', fontSize: 14, fontWeight: 700,
                  color: 'var(--color-text-primary)', outline: 'none',
                  textAlign: 'right'
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>일</span>
            </div>
          </div>
        )}

        {/* 휴게시간 입력 */}
        <div 
          className="glass-card"
          style={{
            borderRadius: 24, padding: '20px',
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            display: 'flex', flexDirection: 'column', gap: 6
          }}
        >
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>휴게시간 설정 (분)</label>
          <input
            type="number"
            value={breakMins || ''}
            onChange={e => setBreakMins(Number(e.target.value))}
            placeholder="휴게시간"
            min={0}
            style={{
              width: '100%', height: 46, borderRadius: 14,
              border: '1px solid rgba(255, 255, 255, 0.5)',
              background: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              padding: '0 14px', fontSize: 14, fontWeight: 700,
              color: 'var(--color-text-primary)', outline: 'none',
              boxSizing: 'border-box',
              transition: 'all 0.2s',
            }}
            onFocus={e => {
              e.target.style.background = 'rgba(255, 255, 255, 0.9)';
              e.target.style.border = '1px solid var(--color-primary)';
              e.target.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.25)';
            }}
            onBlur={e => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              e.target.style.border = '1px solid rgba(255, 255, 255, 0.5)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '4px 0 0', fontWeight: 500 }}>
            💡 분 단위로 입력해주세요. (예: 60분 = 1시간)
          </p>
        </div>

        {/* 일 근무시간 미리보기 */}
        {startTime && endTime && (
          <div 
            style={{
              borderRadius: 18,
              padding: '14px 18px',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>✨</span>
            <span>
              하루 소정근로시간:{' '}
              <span style={{ fontSize: 14, fontWeight: 800 }}>{calcDailyHours().toFixed(1)}시간</span>
              {' '}(휴게 {breakMins}분 제외)
            </span>
          </div>
        )}
      </div>

      {/* 완료 버튼 고정바 */}
      <div 
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '16px 20px 32px',
          background: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.4)',
          maxWidth: 390,
          margin: '0 auto',
          zIndex: 50,
        }}
      >
        <button
          type="button"
          onClick={handleNext}
          disabled={!isValid}
          style={{
            width: '100%', height: 52, borderRadius: 16, border: 'none',
            fontSize: 16, fontWeight: 700, cursor: isValid ? 'pointer' : 'not-allowed',
            background: isValid 
              ? 'linear-gradient(135deg, var(--color-primary) 0%, #6366F1 100%)' 
              : 'rgba(0, 0, 0, 0.05)',
            color: isValid ? '#white' : 'var(--color-text-muted)',
            opacity: isValid ? 1 : 0.6,
            boxShadow: isValid ? '0 6px 20px rgba(99, 102, 241, 0.25)' : 'none',
            transition: 'all 0.2s',
          }}
          onMouseDown={e => {
            if (isValid) {
              e.currentTarget.style.transform = 'scale(0.98)';
              e.currentTarget.style.opacity = '0.95';
            }
          }}
          onMouseUp={e => {
            if (isValid) {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.opacity = '1';
            }
          }}
          onTouchStart={e => {
            if (isValid) {
              e.currentTarget.style.transform = 'scale(0.98)';
              e.currentTarget.style.opacity = '0.95';
            }
          }}
          onTouchEnd={e => {
            if (isValid) {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.opacity = '1';
            }
          }}
        >
          완료
        </button>
      </div>
    </div>
  );
}
