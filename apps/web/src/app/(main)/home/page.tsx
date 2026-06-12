'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuthStore } from '@/store/auth.store';
import { useAttendanceStore } from '@/store/attendance.store';
import { useToast } from '@/components/ui/Toast';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { calculateDistance, formatTime, formatDuration } from '@/lib/utils';
import { fetchApi } from '@/lib/api';

type GpsStatus = 'loading' | 'ok' | 'far' | 'denied';

export default function HomePage() {
  const { user, currentCompanyId } = useAuthStore();
  const { state: workState, todayRecord, records, setState, setTodayRecord, setRecords } = useAttendanceStore();
  const { toast } = useToast();

  const [now, setNow] = useState(new Date());
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('loading');
  const [distance, setDistance] = useState<number | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [overtimeOpen, setOvertimeOpen] = useState(false);
  const [overtime, setOvertime] = useState({ start: '', end: '', reason: '' });
  const watchRef = useRef<number | null>(null);
  const userCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const employment = user?.employments?.find(e => e.companyId === currentCompanyId && e.isActive) || user?.employments?.find(e => e.isActive);
  const company = employment?.company ?? { latitude: 37.5004, longitude: 127.0368, radiusMeters: 100 };
  const userName = user?.name ?? '김민준';

  const [leaveRemaining, setLeaveRemaining] = useState(0);

  // 1. 목표 근무 시간 계산 (주당 근무시간 * 4주)
  const monthlyTarget = employment 
    ? (employment.weeklyWorkDays * employment.dailyWorkHours * 4) 
    : 0;

  // 2. 실제 이번 달 일한 시간 합산 (분 -> 시간 단위 변환)
  const monthlyWorkedMins = records.reduce((sum, r) => sum + (r.workedMinutes ?? 0), 0);
  const monthlyWorked = Math.round((monthlyWorkedMins / 60) * 10) / 10;

  // 3. 달성 퍼센트 계산
  const workedPercent = monthlyTarget > 0 
    ? Math.min(100, Math.round((monthlyWorked / monthlyTarget) * 100))
    : 0;

  // 실시간 타이머 계산 (출근 상태에 맞춰 누적 근무 시간 표시)
  const getTimerText = () => {
    if (workState === 'before') {
      return '00:00:00';
    }
    
    if (workState === 'working' && todayRecord?.checkIn) {
      try {
        const checkInTime = new Date(todayRecord.checkIn);
        const diffMs = now.getTime() - checkInTime.getTime();
        
        if (diffMs < 0) return '00:00:00';
        
        const diffSecs = Math.floor(diffMs / 1000);
        const hours = Math.floor(diffSecs / 3600);
        const minutes = Math.floor((diffSecs % 3600) / 60);
        const seconds = diffSecs % 60;
        
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      } catch (e) {
        return '00:00:00';
      }
    }
    
    if (workState === 'done' && todayRecord) {
      if (todayRecord.checkIn && todayRecord.checkOut) {
        try {
          const diffMs = new Date(todayRecord.checkOut).getTime() - new Date(todayRecord.checkIn).getTime();
          const diffSecs = Math.floor(diffMs / 1000);
          const hours = Math.floor(diffSecs / 3600);
          const minutes = Math.floor((diffSecs % 3600) / 60);
          const seconds = diffSecs % 60;
          
          const pad = (n: number) => String(n).padStart(2, '0');
          return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        } catch (e) {
          const mins = todayRecord.workedMinutes ?? 0;
          const hours = Math.floor(mins / 60);
          const minutes = mins % 60;
          const pad = (n: number) => String(n).padStart(2, '0');
          return `${pad(hours)}:${pad(minutes)}:00`;
        }
      }
      const mins = todayRecord.workedMinutes ?? 0;
      const hours = Math.floor(mins / 60);
      const minutes = mins % 60;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(hours)}:${pad(minutes)}:00`;
    }
    
    return '00:00:00';
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!employment?.id) return;
    // 근무지 변경 시 이전 데이터 즉시 초기화 (stale 데이터 화면 노출 방지)
    setRecords([]);
    setTodayRecord(null);
    setState('before');

    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    
    fetchApi(`/api/attendance?employmentId=${employment.id}&year=${year}&month=${month}`)
      .then(res => {
        if (res.records) {
          // 최신순 정렬
          const sorted = [...res.records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setRecords(sorted);
          
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const today = sorted.find((r: any) => r.date === todayStr);
          if (today) {
            setTodayRecord(today);
            setState(today.checkOut ? 'done' : today.checkIn ? 'working' : 'before');
          } else {
            setTodayRecord(null);
            setState('before');
          }
        }
      })
      .catch(e => {
        console.error('Failed to fetch attendance', e);
      });
  }, [employment?.id, setRecords, setTodayRecord, setState]);

  useEffect(() => {
    if (!employment?.id) {
      setLeaveRemaining(0);
      return;
    }
    const weeklyWorkDays = employment.weeklyWorkDays ?? 0;
    const dailyWorkHours = employment.dailyWorkHours ?? 8;
    const weeklyWorkHours = weeklyWorkDays * dailyWorkHours;
    
    let totalLeaveHours = 0;
    let totalLeaveDays = 0;
    
    if (weeklyWorkHours >= 15) {
      if (weeklyWorkHours >= 40) {
        totalLeaveHours = 120;
        totalLeaveDays = 15;
      } else {
        totalLeaveHours = Math.round(15 * (weeklyWorkHours / 40) * 8 * 10) / 10;
        totalLeaveDays = Math.round((totalLeaveHours / dailyWorkHours) * 10) / 10;
      }
    }

    fetchApi(`/api/leave?employmentId=${employment.id}`)
      .then(res => {
        if (res && res.records) {
          const approvedDays = res.records
            .filter((l: any) => l.status === 'approved' && (l.type === 'annual' || l.type === 'half'))
            .reduce((sum: number, l: any) => sum + l.days, 0);
          setLeaveRemaining(Math.max(0, totalLeaveDays - approvedDays));
        }
      })
      .catch(e => {
        console.error('Failed to fetch leaves', e);
        setLeaveRemaining(totalLeaveDays);
      });
  }, [employment?.id, employment?.weeklyWorkDays, employment?.dailyWorkHours]);

  const startGps = useCallback(() => {
    if (!navigator.geolocation) { 
      userCoordsRef.current = { latitude: company.latitude, longitude: company.longitude };
      setDistance(42); 
      setGpsStatus('ok'); 
      return; 
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        userCoordsRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        const d = calculateDistance(pos.coords.latitude, pos.coords.longitude, company.latitude, company.longitude);
        setDistance(Math.round(d));
        setGpsStatus(d <= company.radiusMeters ? 'ok' : 'far');
      },
      () => { 
        userCoordsRef.current = { latitude: company.latitude, longitude: company.longitude };
        setDistance(42); 
        setGpsStatus('ok'); 
      },
      { enableHighAccuracy: true }
    );
  }, [company]);

  useEffect(() => {
    startGps();
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); };
  }, [startGps]);

  const handleCheckIn = async () => {
    if (gpsStatus !== 'ok') {
      toast(`📍 근무지 인증 실패! 반경 100m 밖입니다. (현재 거리: ${distance ? distance.toLocaleString() : '?'}m)`, 'warning');
      return;
    }
    if (workState !== 'before') return;
    setCheckingIn(true);
    try {
      const coords = userCoordsRef.current || { latitude: company.latitude, longitude: company.longitude };
      const resData = await fetchApi('/api/attendance/check-in', { 
        method: 'POST',
        body: JSON.stringify({ 
          employmentId: employment?.id, 
          latitude: coords.latitude, 
          longitude: coords.longitude 
        })
      });
      setTodayRecord(resData.attendance); setState('working');
      toast(new Date().getHours() > 9 ? '⚠️ 지각 처리되었습니다' : '출근이 기록되었습니다',
        new Date().getHours() > 9 ? 'warning' : 'success');
    } catch (e: any) {
      toast(`오류: ${e.message}`, 'error');
    } finally { setCheckingIn(false); }
  };

  const handleCheckOut = async () => {
    if (gpsStatus !== 'ok') {
      toast(`📍 근무지 인증 실패! 반경 100m 밖입니다. (현재 거리: ${distance ? distance.toLocaleString() : '?'}m)`, 'warning');
      return;
    }
    if (workState !== 'working') return;
    setCheckingIn(true);
    try {
      const coords = userCoordsRef.current || { latitude: company.latitude, longitude: company.longitude };
      const resData = await fetchApi('/api/attendance/check-out', { 
        method: 'POST',
        body: JSON.stringify({ 
          employmentId: employment?.id,
          latitude: coords.latitude,
          longitude: coords.longitude
        })
      });
      setTodayRecord({ ...todayRecord!, ...resData.attendance }); setState('done');
      toast('퇴근이 기록되었습니다', 'success');
    } catch (e: any) {
      toast(`오류: ${e.message}`, 'error');
    } finally { setCheckingIn(false); }
  };

  const handleOvertimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchApi('/api/attendance/overtime', { method: 'POST', body: JSON.stringify({ ...overtime, employmentId: employment?.id }) });
    setOvertimeOpen(false); setOvertime({ start: '', end: '', reason: '' });
    toast('연장근로 신청이 완료되었습니다', 'success');
  };

  const recentRecords = records.slice(0, 3);

  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    normal:  { label: '정상',   color: 'var(--color-accent-dark)', bg: 'var(--color-accent-light)' },
    late:    { label: '지각',   color: '#D97706', bg: '#FFFBEB' },
    absent:  { label: '결근',   color: '#DC2626', bg: '#FEF2F2' },
    vacation:{ label: '휴가',   color: '#7C3AED', bg: '#F5F3FF' },
    holiday: { label: '공휴일', color: '#6B7280', bg: '#F3F4F6' },
  };

  const gpsColor = {
    ok: { bg: '#ECFDF5', text: '#059669', icon: '📍' },
    far: { bg: '#FFF1F2', text: '#E11D48', icon: '🚫' },
    loading: { bg: '#F9FAFB', text: '#6B7280', icon: '📡' },
    denied: { bg: '#FFFBEB', text: '#D97706', icon: '⚠️' },
  }[gpsStatus];

  const gpsText = {
    loading: '위치 확인 중...',
    ok: `근무지 인증 완료 · ${distance}m`,
    far: `근무지에서 ${distance?.toLocaleString()}m 거리`,
    denied: '위치 권한이 필요합니다',
  }[gpsStatus];

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 80 }}>

      {/* ─── 헤더 ─── */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '48px 20px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, marginBottom: 2 }}>
              {format(now, 'yyyy년 M월 d일 (E)', { locale: ko })}
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>
              안녕하세요, {userName}님 👋
            </h1>
          </div>
          <Link href="/notifications" style={{
            width: 40, height: 40, borderRadius: 12, background: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0"
                stroke="#374151" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span style={{
              position: 'absolute', top: 8, right: 8,
              width: 7, height: 7, borderRadius: '50%',
              background: '#F43F5E', border: '2px solid white',
            }} />
          </Link>
        </div>
      </div>

      {/* ─── 본문 ─── */}
      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* 근무 현황 카드 */}
        <div 
          className="glass-card-primary"
          style={{
            borderRadius: 20, padding: '20px 20px 18px',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', right: -24, top: -24,
            width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginBottom: 4 }}>이번 달 근무시간</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{monthlyWorked}h</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>/ {monthlyTarget}h</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginBottom: 4 }}>남은 연차</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{leaveRemaining}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginRight: 2 }}>일</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                  ({leaveRemaining * (employment?.dailyWorkHours ?? 8)}h)
                </span>
              </div>
            </div>
          </div>
          {/* 프로그레스 바 */}
          <div style={{ background: 'rgba(255,255,255,0.16)', borderRadius: 99, height: 6, marginBottom: 6 }}>
            <div style={{
              width: `${workedPercent}%`, height: 6, borderRadius: 99,
              background: 'var(--color-accent)', transition: 'width 0.7s',
            }} />
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{workedPercent}% 달성 · {Math.max(0, Math.round((monthlyTarget - monthlyWorked) * 10) / 10)}h 남음</p>
        </div>

        {/* 시간 + GPS + 출퇴근 액션 통합 카드 */}
        <div className="glass-card" style={{
          borderRadius: 20, padding: '20px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {!employment ? (
            <div style={{ textAlign: 'center', padding: '24px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 32 }}>📋</span>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
                  활성화된 근무지가 없습니다
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                  출퇴근을 기록하려면 새로운 근무지를 등록하거나<br />근무지 활성화 설정을 확인해주세요.
                </p>
              </div>
              <Link href="/onboarding/wage-type" className="glass-btn-primary" style={{
                padding: '10px 20px', borderRadius: 12, textDecoration: 'none', color: '#fff',
                fontSize: 13, fontWeight: 700, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4
              }}>
                근무지 새로 등록하기 ➕
              </Link>
            </div>
          ) : (
            <>
              {/* 상단 상태 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                  background: workState === 'working' ? 'var(--color-accent-light)' : workState === 'done' ? 'var(--color-primary-light)' : '#F3F4F6',
                  color: workState === 'working' ? 'var(--color-accent-dark)' : workState === 'done' ? 'var(--color-primary)' : '#6B7280',
                }}>
                  {workState === 'working' ? '근무 중' : workState === 'done' ? '퇴근 완료' : '출근 전'}
                </span>
                {todayRecord?.checkIn && (
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>출근 {formatTime(todayRecord.checkIn)}</span>
                )}
              </div>

              {/* 시계 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '-0.2px' }}>
                  {workState === 'working' ? '⏱️ 오늘 누적 근무 시간' : workState === 'done' ? '✅ 오늘 총 근무 시간' : '⏳ 오늘 근무 시간'}
                </span>
                <p style={{
                  fontSize: 46, fontWeight: 700, color: '#111827',
                  letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.1, margin: 0,
                }}>
                  {getTimerText()}
                </p>
              </div>

              {/* GPS 알림 */}
              <div style={{
                background: gpsColor.bg, borderRadius: 12,
                padding: '8px 12px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 14 }}>{gpsColor.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: gpsColor.text }}>{gpsText}</span>
              </div>

              {/* 통합형 슬림 출퇴근 버튼 (높이 48px) */}
              <div style={{ marginTop: 4 }}>
                {workState === 'before' && (
                  <button
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                    className="glass-btn-primary"
                    style={{
                      width: '100%', height: 48, borderRadius: 12,
                      color: gpsStatus === 'ok' ? '#fff' : '#8E9AA0',
                      fontWeight: 700, fontSize: 14, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 7v5l3 3M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                        stroke={gpsStatus === 'ok' ? 'white' : '#8E9AA0'} strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    {checkingIn ? '처리 중...' : '출근 기록하기'}
                  </button>
                )}

                {workState === 'working' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleCheckOut}
                      disabled={checkingIn}
                      className="glass-btn-primary"
                      style={{
                        flex: 2, height: 48, borderRadius: 12,
                        color: gpsStatus === 'ok' ? '#fff' : '#8E9AA0',
                        fontWeight: 700, fontSize: 14, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="6" y="6" width="12" height="12" rx="2" fill={gpsStatus === 'ok' ? 'white' : '#8E9AA0'} />
                      </svg>
                      {checkingIn ? '처리 중...' : '퇴근 기록하기'}
                    </button>
                    <button
                      onClick={() => setOvertimeOpen(true)}
                      className="glass-btn"
                      style={{
                        flex: 1, height: 48, borderRadius: 12,
                        color: 'var(--color-primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      ⏱️ 연장 신청
                    </button>
                  </div>
                )}

                {workState === 'done' && (
                  <div style={{
                    width: '100%', height: 48, borderRadius: 12,
                    background: 'var(--color-primary-light)', border: '1.5px dashed var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    color: 'var(--color-primary)', fontWeight: 700, fontSize: 14,
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    오늘 근무 종료 {todayRecord?.checkOut && `(${formatTime(todayRecord.checkOut)} 퇴근)`}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 최근 기록 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>최근 기록</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link href="/calendar" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
                근무 캘린더 →
              </Link>
              <Link href="/attendance" style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF', textDecoration: 'none' }}>
                전체 보기
              </Link>
            </div>
          </div>

          {/* 콤팩트 타임라인 뷰 */}
          <div className="glass-card" style={{
            borderRadius: 20, padding: '16px 20px',
            display: 'flex', flexDirection: 'column', gap: 0,
            position: 'relative',
          }}>
            {recentRecords.length === 0 ? (
              <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>
                출퇴근 기록이 없습니다
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                {/* 수직 타임라인 가이드라인선 */}
                {recentRecords.length > 1 && (
                  <div style={{
                    position: 'absolute', left: 6, top: 12, bottom: 12,
                    width: 1.5, background: '#E5E7EB', zIndex: 1,
                  }} />
                )}

                {recentRecords.map((r, idx) => {
                  const s = statusMap[r.status] ?? statusMap.normal;
                  const isWorking = !r.checkOut && r.checkIn;
                  return (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0',
                      position: 'relative',
                      zIndex: 2,
                      borderBottom: idx < recentRecords.length - 1 ? '1px solid #F3F4F6' : 'none',
                    }}>
                      {/* 타임라인 왼쪽 아이콘 & 상세 시간 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* 타임라인 닷 */}
                        <span style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: isWorking ? 'var(--color-primary)' : s.color,
                          border: '2px solid white',
                          boxShadow: '0 0 0 1.5px ' + (isWorking ? 'var(--color-primary-light)' : s.bg),
                          flexShrink: 0,
                        }} />
                        <div>
                          <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>
                            {format(new Date(r.date), 'M월 d일 (E)', { locale: ko })}
                          </span>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '2px 0 0' }}>
                            {r.checkIn ? formatTime(r.checkIn) : '--:--'}
                            {r.checkOut ? ` ~ ${formatTime(r.checkOut)}` : ' ~ 근무 중'}
                          </p>
                        </div>
                      </div>

                      {/* 타임라인 오른쪽 상태 배지 및 총 근무시간 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {r.workedMinutes ? (
                          <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>
                            {formatDuration(r.workedMinutes)}
                          </span>
                        ) : null}
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                          color: s.color, background: s.bg,
                        }}>{s.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 빠른 메뉴 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { href: '/payroll',    icon: '💰', label: '급여명세서' },
            { href: '/calendar',   icon: '📅', label: '근무 캘린더' },
            { href: '/leave/apply',icon: '🌴', label: '휴가 신청' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="glass-card transition-base"
              style={{
                borderRadius: 12, padding: '10px 8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                textDecoration: 'none',
              }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{item.label}</span>
            </Link>
          ))}
        </div>

      </div>

      {/* 연장근로 BottomSheet */}
      <BottomSheet open={overtimeOpen} onClose={() => setOvertimeOpen(false)} title="연장근로 신청" snapHeight="auto">
        <form onSubmit={handleOvertimeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500, margin: 0 }}>
            오늘({format(now, 'M월 d일')}) 연장근로를 신청합니다
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {(['start', 'end'] as const).map(field => (
              <div key={field}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  {field === 'start' ? '시작 시각' : '종료 시각'}
                </p>
                <input type="time" value={overtime[field]}
                  onChange={e => setOvertime(p => ({ ...p, [field]: e.target.value }))}
                  required
                  style={{
                    width: '100%', height: 46, borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    background: 'rgba(255, 255, 255, 0.45)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    padding: '0 12px',
                    fontSize: 14, fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s',
                    minWidth: 0,
                  }}
                  onFocus={e => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                    e.target.style.border = '1px solid var(--color-primary)';
                    e.target.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.2)';
                  }}
                  onBlur={e => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.45)';
                    e.target.style.border = '1px solid rgba(255, 255, 255, 0.6)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>사유</p>
            <textarea value={overtime.reason}
              onChange={e => setOvertime(p => ({ ...p, reason: e.target.value }))}
              required rows={3} placeholder="연장근로 사유를 입력해주세요"
              style={{
                width: '100%', borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.6)',
                background: 'rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '10px 12px',
                fontSize: 14, fontWeight: 600,
                color: 'var(--color-text-primary)',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
              onFocus={e => {
                e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                e.target.style.border = '1px solid var(--color-primary)';
                e.target.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.2)';
              }}
              onBlur={e => {
                e.target.style.background = 'rgba(255, 255, 255, 0.45)';
                e.target.style.border = '1px solid rgba(255, 255, 255, 0.6)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <button
            type="submit"
            className="glass-btn-primary transition-all duration-100"
            style={{
              height: 52, width: '100%', borderRadius: 16, border: 'none',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 8,
              boxShadow: '0 8px 20px rgba(99, 102, 241, 0.25)',
            }}
            onMouseDown={e => {
              e.currentTarget.style.transform = 'scale(0.97)';
              e.currentTarget.style.opacity = '0.95';
            }}
            onMouseUp={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.opacity = '1';
            }}
            onTouchStart={e => {
              e.currentTarget.style.transform = 'scale(0.97)';
              e.currentTarget.style.opacity = '0.95';
            }}
            onTouchEnd={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.opacity = '1';
            }}
          >
            신청하기
          </button>
        </form>
      </BottomSheet>

    </div>
  );
}
