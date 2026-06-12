'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  subMonths, addMonths, isToday, differenceInDays, parseISO,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { mockLeaves, mockLeaveBalance } from '@/mocks/data/leave';
import { LeaveRecord } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

// ── 타입 ────────────────────────────────────────────
type DayStatus = 'normal' | 'overtime' | 'dayoff' | 'sick' | 'short' | 'absent';
interface WorkDay {
  date: string;
  status: DayStatus;
  checkIn?: string;
  checkOut?: string;
  earnedAmount?: number;
}
type Tab = 'work' | 'leave';

const WORK_STATUS: Record<DayStatus, { icon: string; label: string; bg: string; color: string }> = {
  normal:   { icon: '✅', label: '정상', bg: 'rgba(0, 240, 255, 0.08)', color: 'var(--color-accent-dark)' },
  overtime: { icon: '🔥', label: '연장', bg: 'rgba(245, 158, 11, 0.08)', color: '#D97706' },
  dayoff:   { icon: '🛋️', label: '휴무', bg: 'rgba(139, 92, 246, 0.08)', color: '#7C3AED' },
  sick:     { icon: '😷', label: '병가', bg: 'rgba(59, 130, 246, 0.08)', color: '#2563EB' },
  short:    { icon: '⚠️', label: '부족', bg: 'rgba(245, 158, 11, 0.08)', color: '#CA8A04' },
  absent:   { icon: '❌', label: '결근', bg: 'rgba(244, 63, 94, 0.08)', color: '#E11D48' },
};

const LEAVE_TYPE_LABEL: Record<string, string> = { annual: '연차', half: '반차', sick: '병가', official: '공가' };
const LEAVE_TYPE_COLOR: Record<string, string> = { annual: '#FF2E93', half: '#6366F1', sick: '#2563EB', official: '#0891B2' };
const LEAVE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: '승인', color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.1)' },
  pending:  { label: '대기', color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.1)' },
  rejected: { label: '반려', color: 'var(--color-danger)', bg: 'rgba(244, 63, 94, 0.1)' },
};

const EMPLOYER = { name: '모모스커피', hireDate: new Date(2025, 4, 23) };
const HOURLY = 12000;
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// ── Mock 데이터 ──────────────────────────────────────
const ALL_WORK: WorkDay[] = []; // 가짜 데이터 제거

function getDaysInRange(start: string, end: string): string[] {
  const result: string[] = [];
  const d = new Date(parseISO(start));
  const e = parseISO(end);
  while (d <= e) { result.push(format(d, 'yyyy-MM-dd')); d.setDate(d.getDate() + 1); }
  return result;
}

// ── 컴포넌트 ─────────────────────────────────────────
export default function CalendarPage() {
  const router = useRouter();
  const { user, currentCompanyId } = useAuthStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('work');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [balance, setBalance] = useState({ total: 0, used: 0, remaining: 0 });
  const [workRecords, setWorkRecords] = useState<WorkDay[]>([]);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyType, setApplyType] = useState('annual');
  const [applyStart, setApplyStart] = useState('');
  const [applyEnd, setApplyEnd]   = useState('');
  const [applyReason, setApplyReason] = useState('');

  const employment = user?.employments?.find(e => e.companyId === currentCompanyId && e.isActive) || user?.employments?.find(e => e.isActive);
  const companyName = employment?.company?.name ?? '근무지 없음';
  const hireDate = (employment as any)?.createdAt ? new Date((employment as any).createdAt) : new Date(2025, 4, 23);
  const daysWorked  = differenceInDays(new Date(), hireDate);

  const weeklyWorkDays = employment?.weeklyWorkDays ?? 0;
  const dailyWorkHours = employment?.dailyWorkHours ?? 8;
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

  useEffect(() => {
    if (!employment?.id) {
      setWorkRecords([]);
      return;
    }
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    fetchApi(`/api/attendance?employmentId=${employment.id}&year=${year}&month=${month}`)
      .then(res => {
        const records: WorkDay[] = res.records.map((r: any) => ({
          date: format(new Date(r.date), 'yyyy-MM-dd'),
          status: r.status || 'normal',
          checkIn: r.checkIn ? format(new Date(r.checkIn), 'HH:mm') : undefined,
          checkOut: r.checkOut ? format(new Date(r.checkOut), 'HH:mm') : undefined,
          earnedAmount: r.earnedPay || 0,
        }));
        setWorkRecords(records);
      })
      .catch(e => {
        console.error('attendance fetch error', e);
        toast('출퇴근 기록을 불러오는 데 실패했습니다.', 'error');
      });
  }, [employment?.id, currentMonth, toast]);

  useEffect(() => {
    if (!employment?.id) {
      setLeaveRecords([]);
      setBalance({ total: 0, used: 0, remaining: 0 });
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
          setLeaveRecords(res.records);
          const approvedDays = res.records
            .filter((l: any) => l.status === 'approved' && (l.type === 'annual' || l.type === 'half'))
            .reduce((sum: number, l: any) => sum + l.days, 0);
          setBalance({
            total: totalLeaveDays,
            used: approvedDays,
            remaining: Math.max(0, totalLeaveDays - approvedDays),
          });
        }
      })
      .catch(e => {
        console.error('Failed to fetch leaves', e);
        toast('휴가 내역을 불러오는 데 실패했습니다.', 'error');
      });
  }, [employment?.id, totalLeaveDays, toast]);
  const monthKey    = format(currentMonth, 'yyyy-MM');
  const monthStart  = startOfMonth(currentMonth);
  const monthEnd    = endOfMonth(currentMonth);
  const days        = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = getDay(monthStart);

  const workMap = new Map(workRecords.map(r => [r.date, r]));
  const leaveDateMap = new Map<string, LeaveRecord>();
  leaveRecords.forEach(r => getDaysInRange(r.startDate, r.endDate).forEach(d => leaveDateMap.set(d, r)));

  const monthTotal = workRecords
    .filter(r => r.date.startsWith(monthKey))
    .reduce((sum, r) => sum + (r.earnedAmount ?? 0), 0);

  const monthStats = {
    normal:   workRecords.filter(r => r.date.startsWith(monthKey) && r.status === 'normal').length,
    overtime: workRecords.filter(r => r.date.startsWith(monthKey) && r.status === 'overtime').length,
    short:    workRecords.filter(r => r.date.startsWith(monthKey) && r.status === 'short').length,
    leave:    leaveRecords.filter(r => r.status !== 'rejected' && (r.startDate.startsWith(monthKey) || r.endDate.startsWith(monthKey))).reduce((s, r) => s + r.days, 0),
  };

  const handleApplySubmit = async () => {
    if (!applyStart || !applyReason || !employment?.id) return;
    const end = applyType === 'half' ? applyStart : (applyEnd || applyStart);
    const days = applyType === 'half' ? 0.5 : getDaysInRange(applyStart, end).filter(d => ![0,6].includes(new Date(d).getDay())).length;
    
    try {
      await fetchApi('/api/leave', {
        method: 'POST',
        body: JSON.stringify({
          employmentId: employment.id,
          type: applyType,
          startDate: applyStart,
          endDate: end,
          days,
          reason: applyReason,
        }),
      });
      toast('휴가 신청이 완료되었습니다.', 'success');
      
      const leavesRes = await fetchApi(`/api/leave?employmentId=${employment.id}`);
      if (leavesRes && leavesRes.records) {
        setLeaveRecords(leavesRes.records);
        const approvedDays = leavesRes.records
          .filter((l: any) => l.status === 'approved' && (l.type === 'annual' || l.type === 'half'))
          .reduce((sum: number, l: any) => sum + l.days, 0);
        setBalance({
          total: totalLeaveDays,
          used: approvedDays,
          remaining: Math.max(0, totalLeaveDays - approvedDays),
        });
      }
    } catch (e: any) {
      console.error(e);
      toast(`휴가 신청 실패: ${e.message}`, 'error');
    } finally {
      setApplyOpen(false); setApplyStart(''); setApplyEnd(''); setApplyReason('');
    }
  };

  const selKey   = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selWork  = selKey ? workMap.get(selKey) : undefined;
  const selLeave = selKey ? leaveDateMap.get(selKey) : undefined;

  // ── 공용 스타일 ─────────────────────────────────
  const card: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.04)',
    borderRadius: 20,
  };

  const MonthNav = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} style={{
        width: 32, height: 32, borderRadius: 10, background: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', minWidth: 80, textAlign: 'center' }}>
        {format(currentMonth, 'yyyy년 M월', { locale: ko })}
      </span>
      <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} style={{
        width: 32, height: 32, borderRadius: 10, background: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M9 18l6-6-6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );

  const CalendarGrid = ({ showLeaveColor }: { showLeaveColor?: boolean }) => (
    <>
      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DAY_LABELS.map((d, i) => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '4px 0',
            color: i === 0 ? '#F43F5E' : i === 6 ? 'var(--color-primary)' : '#9CA3AF',
          }}>{d}</div>
        ))}
      </div>
      {/* 날짜 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 2 }}>
        {Array.from({ length: startOffset }).map((_, i) => <div key={`off-${i}`} />)}
        {days.map(day => {
          const key   = format(day, 'yyyy-MM-dd');
          const work  = workMap.get(key);
          const leave = leaveDateMap.get(key);
          const today = isToday(day);
          const dow   = getDay(day);
          return (
            <button key={key} onClick={() => { setSelectedDay(day); setSheetOpen(true); }}
               style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '3px 0', border: 'none', cursor: 'pointer',
                background: 'transparent', borderRadius: 10,
              }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: today ? 700 : 400,
                background: today ? 'var(--color-primary)' : (showLeaveColor && leave) ? LEAVE_TYPE_COLOR[leave.type] : 'transparent',
                color: today || (showLeaveColor && leave) ? '#fff'
                  : dow === 0 ? '#F43F5E' : dow === 6 ? 'var(--color-primary)' : '#374151',
              }}>
                {format(day, 'd')}
              </span>
              {!showLeaveColor && (leave ? (
                <span style={{ fontSize: 13, lineHeight: 1, marginTop: 1 }}>🌴</span>
              ) : work ? (
                <span style={{ fontSize: 13, lineHeight: 1, marginTop: 1 }}>{WORK_STATUS[work.status].icon}</span>
              ) : (
                <span style={{ height: 16, marginTop: 1 }} />
              ))}
              {showLeaveColor && <span style={{ height: 16, marginTop: 1 }} />}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 80 }}>

      {/* ── 헤더 ── */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '48px 20px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: 2 }}>현재 근무지</p>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
              {companyName}
            </h1>
          </div>
          <span style={{
            padding: '6px 14px', borderRadius: 99,
            background: 'var(--color-primary)', color: '#fff',
            fontSize: 12, fontWeight: 700,
          }}>D+{daysWorked}</span>
        </div>

        {/* 탭 */}
        <div style={{
          display: 'flex', background: 'rgba(0, 0, 0, 0.05)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 12, padding: 3, gap: 3,
        }}>
          {([['work', '📅 근무'], ['leave', '🌴 휴가']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px 0', borderRadius: 9, border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              background: tab === t ? 'var(--color-primary)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--color-text-secondary)',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ──────── 근무 탭 ──────── */}
        {tab === 'work' && (
          <>
            {/* 누적 급여 */}
            <div className="glass-card-primary" style={{
              borderRadius: 20, padding: '18px 20px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', right: -16, top: -16,
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
              }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ position: 'relative' }}>
                  <MonthNav />
                  <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', margin: '10px 0 4px' }}>
                    {monthTotal.toLocaleString()}원
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                    {format(monthStart, 'M월 d일')}부터 어제까지의 누적 급여
                  </p>
                </div>
                <button onClick={() => router.push('/payroll')} style={{
                  marginTop: 4, padding: '7px 12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.4)', background: 'transparent',
                  color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}>급여명세서</button>
              </div>
            </div>

            {/* 캘린더 */}
            <div style={{ ...card, padding: '16px 16px 12px' }}>
              <CalendarGrid />
              {/* 범례 */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '6px 12px',
                marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0, 0, 0, 0.05)',
              }}>
                {(Object.entries(WORK_STATUS) as [DayStatus, typeof WORK_STATUS[DayStatus]][]).map(([, cfg]) => (
                  <div key={cfg.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12 }}>{cfg.icon}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{cfg.label}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12 }}>🌴</span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>휴가</span>
                </div>
              </div>
            </div>

            {/* 월 통계 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { label: '정상', value: monthStats.normal,   bg: 'rgba(0, 240, 255, 0.08)', color: 'var(--color-accent-dark)' },
                { label: '연장', value: monthStats.overtime,  bg: 'rgba(245, 158, 11, 0.08)', color: '#D97706' },
                { label: '부족', value: monthStats.short,     bg: 'rgba(245, 158, 11, 0.08)', color: '#CA8A04' },
                { label: '휴가', value: monthStats.leave,     bg: 'rgba(255, 46, 147, 0.08)', color: 'var(--color-vacation)' },
              ].map(s => (
                <div key={s.label} style={{
                  background: s.bg, borderRadius: 16,
                  padding: '12px 8px', textAlign: 'center',
                }}>
                  <p style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: s.color, marginTop: 3, opacity: 0.8 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* 퇴사 */}
            <button 
              className="glass-btn transition-base"
              style={{
                width: '100%', height: 48, borderRadius: 14,
                color: 'var(--color-text-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              퇴사 신청
            </button>
          </>
        )}

        {/* ──────── 휴가 탭 ──────── */}
        {tab === 'leave' && (
          <>
            {/* 연차 현황 */}
            <div style={{ ...card, padding: '20px 20px 18px' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>연차 현황</span>
                <button onClick={() => setApplyOpen(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '8px 14px', borderRadius: 99,
                  background: 'var(--color-primary)', border: 'none',
                  color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  휴가 신청
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                {[
                  { label: '총 연차', value: `${balance.total}일`, hours: `${balance.total * dailyWorkHours}h`, color: 'var(--color-primary)', bg: 'rgba(59, 130, 246, 0.08)' },
                  { label: '사용',    value: `${balance.used}일`, hours: `${balance.used * dailyWorkHours}h`, color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.08)' },
                  { label: '잔여',    value: `${balance.remaining}일`, hours: `${balance.remaining * dailyWorkHours}h`, color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.08)' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: s.bg, borderRadius: 14,
                    padding: '12px 6px', textAlign: 'center' as const,
                    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center'
                  }}>
                    <p style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500, marginTop: 4 }}>{s.hours}</p>
                    <p style={{ fontSize: 11, color: s.color, marginTop: 4, opacity: 0.8 }}>{s.label}</p>
                  </div>
                ))}
              </div>
              {/* 게이지 */}
              <div style={{ background: 'rgba(0, 0, 0, 0.05)', borderRadius: 99, height: 6, marginBottom: 6 }}>
                <div style={{
                  height: 6, borderRadius: 99, background: 'var(--color-primary)',
                  width: `${balance.total > 0 ? Math.round((balance.used / balance.total) * 100) : 0}%`,
                  transition: 'width 0.7s',
                }} />
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {balance.total > 0 ? Math.round((balance.used / balance.total) * 100) : 0}% 사용 · {balance.remaining}일 ({balance.remaining * dailyWorkHours}h) 남음
              </p>
            </div>

            {/* 신청 내역 */}
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', paddingLeft: 2 }}>신청 내역</p>
            <div style={{
              ...card, overflow: 'hidden',
              ...(leaveRecords.length === 0 ? { padding: '32px 20px', textAlign: 'center' as const } : {}),
            }}>
              {leaveRecords.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>신청 내역이 없습니다</p>
              ) : leaveRecords.map((r, idx) => {
                const s = LEAVE_STATUS[r.status];
                return (
                  <div key={r.id} style={{
                    padding: '16px 20px',
                    borderBottom: idx < leaveRecords.length - 1 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: LEAVE_TYPE_COLOR[r.type], flexShrink: 0,
                          marginTop: 1,
                        }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {LEAVE_TYPE_LABEL[r.type]}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.days}일</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                        {r.startDate} ~ {r.endDate}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.reason}</p>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                      color: s.color, background: s.bg, whiteSpace: 'nowrap' as const, flexShrink: 0,
                    }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── 날짜 상세 BottomSheet ── */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="" snapHeight="auto">
        {selectedDay && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {format(selectedDay, 'M월 d일 (E)', { locale: ko })}
            </p>
            {selWork && (
              <div style={{ background: WORK_STATUS[selWork.status].bg, borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{WORK_STATUS[selWork.status].icon}</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: WORK_STATUS[selWork.status].color }}>{WORK_STATUS[selWork.status].label}</p>
                      {selWork.checkIn && <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>{selWork.checkIn} ~ {selWork.checkOut}</p>}
                    </div>
                  </div>
                  {selWork.earnedAmount
                    ? <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>+{selWork.earnedAmount.toLocaleString()}원</span>
                    : null}
                </div>
              </div>
            )}
            {selLeave && (
              <div style={{ background: LEAVE_TYPE_COLOR[selLeave.type] + '15', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>🌴</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: LEAVE_TYPE_COLOR[selLeave.type] }}>{LEAVE_TYPE_LABEL[selLeave.type]}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>{selLeave.reason}</p>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                    color: LEAVE_STATUS[selLeave.status].color, background: LEAVE_STATUS[selLeave.status].bg,
                  }}>{LEAVE_STATUS[selLeave.status].label}</span>
                </div>
              </div>
            )}
            {!selWork && !selLeave && (
              <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
                이 날의 기록이 없습니다
              </div>
            )}
            {selWork && (
              <button
                className="glass-btn transition-all duration-100"
                style={{
                  width: '100%', height: 48, borderRadius: 12,
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  background: 'rgba(255, 255, 255, 0.4)',
                  fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={e => e.currentTarget.style.transform = 'none'}
              >근무시간 수정</button>
            )}
            {!selLeave && !selWork && (
              <button
                onClick={() => { setSheetOpen(false); setApplyOpen(true); setApplyStart(selKey ?? ''); }}
                className="glass-btn-primary transition-all duration-100"
                style={{
                  width: '100%', height: 48, borderRadius: 12,
                  border: 'none',
                  fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={e => e.currentTarget.style.transform = 'none'}
              >🌴 이 날 휴가 신청</button>
            )}
          </div>
        )}
      </BottomSheet>

      {/* ── 휴가 신청 BottomSheet ── */}
      <BottomSheet open={applyOpen} onClose={() => setApplyOpen(false)} title="휴가 신청" snapHeight="80vh">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* 휴가 종류 */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 10 }}>휴가 종류</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {Object.entries(LEAVE_TYPE_LABEL).map(([type, label]) => (
                <button key={type} onClick={() => setApplyType(type)} style={{
                  height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700,
                  background: applyType === type ? LEAVE_TYPE_COLOR[type] : 'rgba(0, 0, 0, 0.05)',
                  color: applyType === type ? '#fff' : 'var(--color-text-secondary)',
                  transition: 'all 0.15s',
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* 날짜 */}
          <div style={{ display: 'grid', gridTemplateColumns: applyType === 'half' ? '1fr' : '1fr 1fr', gap: 12 }}>
            {(['시작일', ...(applyType !== 'half' ? ['종료일'] : [])] as string[]).map((lbl, i) => (
              <div key={lbl}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{lbl}</p>
                <input
                  type="date"
                  value={i === 0 ? applyStart : applyEnd}
                  min={i === 1 ? applyStart : undefined}
                  onChange={e => i === 0 ? setApplyStart(e.target.value) : setApplyEnd(e.target.value)}
                  style={{
                    width: '100%', height: 46, borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    background: 'rgba(255, 255, 255, 0.45)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    padding: '0 14px',
                    fontSize: 14, fontWeight: 600,
                    outline: 'none', fontFamily: 'inherit',
                    color: 'var(--color-text-primary)',
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

          {/* 사유 */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8 }}>사유</p>
            <textarea
              value={applyReason}
              onChange={e => setApplyReason(e.target.value)}
              placeholder="휴가 사유를 입력해주세요"
              rows={3}
              style={{
                width: '100%', borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.6)',
                background: 'rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '12px 14px',
                fontSize: 14, lineHeight: 1.6,
                outline: 'none', resize: 'none',
                fontFamily: 'inherit', color: 'var(--color-text-primary)',
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

          {/* 차감 미리보기 */}
          {applyStart && (
            <div style={{
              background: 'rgba(124, 58, 237, 0.06)',
              borderRadius: 12,
              padding: '12px 16px',
              border: '1px solid rgba(124, 58, 237, 0.15)',
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#7C3AED', margin: 0 }}>
                {applyType === 'half'
                  ? '0.5일 차감 예정'
                  : applyEnd
                    ? `${getDaysInRange(applyStart, applyEnd).filter(d => ![0, 6].includes(new Date(d).getDay())).length}일 차감 예정 · 잔여 ${balance.remaining}일`
                    : '종료일을 선택해주세요'}
              </p>
            </div>
          )}

          {/* 신청 버튼 */}
          <button
            onClick={handleApplySubmit}
            disabled={!applyStart || !applyReason || (applyType !== 'half' && !applyEnd)}
            className="glass-btn-primary transition-all duration-100"
            style={{
              height: 52, width: '100%', borderRadius: 16, border: 'none',
              background: (applyStart && applyReason && (applyType === 'half' || applyEnd))
                ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-vacation) 100%)' : 'rgba(0, 0, 0, 0.05)',
              color: (applyStart && applyReason && (applyType === 'half' || applyEnd))
                ? '#fff' : 'rgba(0, 0, 0, 0.25)',
              fontSize: 15, fontWeight: 700, cursor: (applyStart && applyReason && (applyType === 'half' || applyEnd)) ? 'pointer' : 'not-allowed',
              letterSpacing: '-0.2px',
              boxShadow: (applyStart && applyReason && (applyType === 'half' || applyEnd)) ? '0 8px 20px rgba(99, 102, 241, 0.25)' : 'none',
            }}
            onMouseDown={e => {
              if (applyStart && applyReason && (applyType === 'half' || applyEnd)) {
                e.currentTarget.style.transform = 'scale(0.97)';
                e.currentTarget.style.opacity = '0.95';
              }
            }}
            onMouseUp={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.opacity = '1';
            }}
          >
            신청하기
          </button>

        </div>
      </BottomSheet>
    </div>
  );
}
