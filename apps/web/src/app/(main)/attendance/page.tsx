'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuthStore } from '@/store/auth.store';
import { fetchApi } from '@/lib/api';
import { AttendanceRecord, AttendanceStatus } from '@/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Badge } from '@/components/ui/Badge';
import { formatTime, formatDuration } from '@/lib/utils';
import { mockAttendance } from '@/mocks/data/attendance';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; badgeVariant: 'success' | 'warning' | 'danger' | 'vacation' | 'neutral' }> = {
  normal:   { label: '정상',  color: 'var(--color-accent-dark)',  badgeVariant: 'success' },
  late:     { label: '지각',  color: '#D97706',  badgeVariant: 'warning' },
  absent:   { label: '결근',  color: '#E11D48',    badgeVariant: 'danger' },
  vacation: { label: '휴가',  color: 'var(--color-vacation)', badgeVariant: 'vacation' },
  holiday:  { label: '공휴일', color: '#D1D5DB',  badgeVariant: 'neutral' },
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function AttendancePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selected, setSelected] = useState<AttendanceRecord | null | undefined>(undefined);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const { currentCompanyId } = useAuthStore();

  // 현재 월 기록 fetch
  useEffect(() => {
    if (!currentCompanyId) return;
    const fetchAttendance = async () => {
      try {
        const resData = await fetchApi(`/api/attendance?employmentId=${currentCompanyId}&year=${format(currentMonth, 'yyyy')}&month=${format(currentMonth, 'M')}`);
        setRecords(resData.records);
      } catch (err) {
        console.error(err);
        setRecords(mockAttendance);
      }
    };
    fetchAttendance();
  }, [currentMonth, currentCompanyId]);

  // 캘린더 날짜 계산
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = getDay(monthStart); // 0=일

  // 날짜 → 기록 맵
  const recordMap = new Map(records.map(r => [r.date, r]));

  const handleDayClick = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    setSelected(recordMap.get(key) ?? null);
    setSheetOpen(true);
  };

  // 월 통계
  const thisMonthRecords = records.filter(r => r.date.startsWith(format(currentMonth, 'yyyy-MM')));
  const normalDays  = thisMonthRecords.filter(r => r.status === 'normal').length;
  const lateDays    = thisMonthRecords.filter(r => r.status === 'late').length;
  const absentDays  = thisMonthRecords.filter(r => r.status === 'absent').length;
  const vacationDays = thisMonthRecords.filter(r => r.status === 'vacation').length;

  // ── 공용 스타일 ─────────────────────────────────
  const card: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.04)',
    borderRadius: 20,
  };

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 80 }}>
      {/* 헤더 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '24px 20px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.3px', margin: 0 }}>
            출퇴근 기록
          </h1>
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
        </div>
        
        {/* 탭 */}
        <div style={{
          display: 'flex', background: 'rgba(0, 0, 0, 0.05)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 12, padding: 3, gap: 3,
        }}>
          {([['calendar', '📅 캘린더'], ['list', '📋 리스트']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              flex: 1, padding: '8px 0', borderRadius: 9, border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              background: view === v ? 'var(--color-primary)' : 'transparent',
              color: view === v ? '#fff' : 'var(--color-text-secondary)',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 월 통계 요약 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { label: '정상', value: normalDays,   bg: 'rgba(0, 240, 255, 0.08)', color: 'var(--color-accent-dark)' },
            { label: '지각', value: lateDays,     bg: 'rgba(245, 158, 11, 0.08)', color: '#D97706' },
            { label: '결근', value: absentDays,   bg: 'rgba(244, 63, 94, 0.08)', color: '#E11D48' },
            { label: '휴가', value: vacationDays, bg: 'rgba(255, 46, 147, 0.08)', color: 'var(--color-vacation)' },
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

        {view === 'calendar' ? (
          <div style={{ ...card, padding: '16px 16px 12px' }}>
            {/* 요일 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
              {DAY_LABELS.map((d, i) => (
                <div key={d} style={{
                  textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '4px 0',
                  color: i === 0 ? '#F43F5E' : i === 6 ? 'var(--color-primary)' : '#9CA3AF',
                }}>{d}</div>
              ))}
            </div>
            {/* 날짜 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 2 }}>
              {/* 오프셋 빈 셀 */}
              {Array.from({ length: startOffset }).map((_, i) => <div key={`off-${i}`} />)}
              {days.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const rec = recordMap.get(key);
                const dayOfWeek = getDay(day);
                const today = isToday(day);
                return (
                  <button
                    key={key}
                    onClick={() => handleDayClick(day)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '3px 0', border: 'none', cursor: 'pointer',
                      background: 'transparent', borderRadius: 10,
                    }}
                  >
                    <span 
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13, fontWeight: today ? 700 : 400,
                        background: today ? 'var(--color-primary)' : 'transparent',
                        color: today ? '#fff' :
                          dayOfWeek === 0 ? '#F43F5E' :
                          dayOfWeek === 6 ? 'var(--color-primary)' :
                          '#374151',
                      }}
                    >
                      {format(day, 'd')}
                    </span>
                    {/* 상태 dot */}
                    {rec && rec.status !== 'holiday' ? (
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%', marginTop: 3,
                        backgroundColor: STATUS_CONFIG[rec.status]?.color ?? '#D1D5DB'
                      }} />
                    ) : (
                      <span style={{ height: 5, marginTop: 3 }} />
                    )}
                  </button>
                );
              })}
            </div>
            {/* 범례 */}
            <div 
              style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
                marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0, 0, 0, 0.05)'
              }}
            >
              {[
                { color: 'var(--color-accent-dark)', label: '정상' },
                { color: '#D97706', label: '지각' },
                { color: '#E11D48', label: '결근' },
                { color: 'var(--color-vacation)', label: '휴가' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: l.color }} />
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 리스트 뷰 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {thisMonthRecords.length === 0 ? (
              <div style={{ ...card, padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
                이 달의 기록이 없습니다
              </div>
            ) : [...thisMonthRecords].reverse().map(r => {
              const cfg = STATUS_CONFIG[r.status];
              return (
                <button key={r.id} onClick={() => { setSelected(r); setSheetOpen(true); }}
                  style={{
                    ...card,
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                  }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      {format(new Date(r.date), 'M월 d일 (E)', { locale: ko })}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                      {r.checkIn ? formatTime(r.checkIn) : '--:--'}
                      {r.checkOut ? ` ~ ${formatTime(r.checkOut)}` : r.checkIn ? ' ~ 근무 중' : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <Badge variant={cfg.badgeVariant} dot>{cfg.label}</Badge>
                    {r.workedMinutes ? (
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {formatDuration(r.workedMinutes)}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 날짜 상세 Bottom Sheet */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="출퇴근 상세" snapHeight="auto">
        {selected === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 8 }}>
            <p style={{ fontSize: 32, margin: 0 }}>📭</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>이 날의 출퇴근 기록이 없습니다</p>
          </div>
        ) : selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>날짜</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{format(new Date(selected.date), 'yyyy년 M월 d일 (E)', { locale: ko })}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>상태</span>
              <Badge variant={STATUS_CONFIG[selected.status].badgeVariant} dot>{STATUS_CONFIG[selected.status].label}</Badge>
            </div>
            {selected.checkIn && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>출근 시각</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatTime(selected.checkIn)}</span>
              </div>
            )}
            {selected.checkOut && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>퇴근 시각</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatTime(selected.checkOut)}</span>
              </div>
            )}
            {selected.workedMinutes ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>근무 시간</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatDuration(selected.workedMinutes)}</span>
              </div>
            ) : null}
            {selected.distance !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>출근 거리</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>근무지에서 {selected.distance}m</span>
              </div>
            )}
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
