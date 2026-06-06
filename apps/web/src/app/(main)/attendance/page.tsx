'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths, isSameMonth, isToday, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AttendanceRecord, AttendanceStatus } from '@/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Badge } from '@/components/ui/Badge';
import { formatTime, formatDuration } from '@/lib/utils';
import { mockAttendance } from '@/mocks/data/attendance';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; dotColor: string; badgeVariant: 'success' | 'warning' | 'danger' | 'vacation' | 'neutral' }> = {
  normal:   { label: '정상',  dotColor: 'bg-green-500',  badgeVariant: 'success' },
  late:     { label: '지각',  dotColor: 'bg-amber-400',  badgeVariant: 'warning' },
  absent:   { label: '결근',  dotColor: 'bg-red-500',    badgeVariant: 'danger' },
  vacation: { label: '휴가',  dotColor: 'bg-violet-500', badgeVariant: 'vacation' },
  holiday:  { label: '공휴일', dotColor: 'bg-gray-300',  badgeVariant: 'neutral' },
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function AttendancePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>(mockAttendance);
  const [selected, setSelected] = useState<AttendanceRecord | null | undefined>(undefined);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  // 현재 월 기록 fetch (MSW Mock)
  useEffect(() => {
    fetch(`/api/attendance?year=${format(currentMonth, 'yyyy')}&month=${format(currentMonth, 'M')}`)
      .then(r => r.json())
      .then(({ records: r }) => setRecords(r))
      .catch(() => setRecords(mockAttendance));
  }, [currentMonth]);

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

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900">출퇴근 기록</h1>
        </div>
        {/* 월 이동 */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <span className="font-bold text-gray-900 text-base">{format(currentMonth, 'yyyy년 M월', { locale: ko })}</span>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#374151" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        {/* 탭 */}
        <div className="flex mt-3 bg-gray-100 rounded-xl p-1 gap-1">
          {(['calendar', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
              {v === 'calendar' ? '📅 캘린더' : '📋 리스트'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4 pb-24">
        {/* 월 통계 요약 */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '정상', count: normalDays, color: '#16A34A', bg: '#F0FDF4' },
            { label: '지각', count: lateDays,   color: '#D97706', bg: '#FFFBEB' },
            { label: '결근', count: absentDays,  color: '#DC2626', bg: '#FEF2F2' },
            { label: '휴가', count: vacationDays, color: '#7C3AED', bg: '#F5F3FF' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: s.bg }}>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.count}</p>
              <p className="text-xs" style={{ color: s.color }}>{s.label}</p>
            </div>
          ))}
        </div>

        {view === 'calendar' ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_LABELS.map((d, i) => (
                <div key={d} className={`text-center text-xs font-semibold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
              ))}
            </div>
            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-y-1">
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
                    className="flex flex-col items-center py-1 rounded-xl transition-colors hover:bg-gray-50 active:bg-gray-100"
                  >
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${
                      today ? 'bg-blue-500 text-white font-bold' :
                      dayOfWeek === 0 ? 'text-red-400' :
                      dayOfWeek === 6 ? 'text-blue-400' :
                      'text-gray-700'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {/* 상태 dot */}
                    {rec && rec.status !== 'holiday' && (
                      <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${STATUS_CONFIG[rec.status]?.dotColor ?? 'bg-gray-300'}`} />
                    )}
                    {!rec && <span className="w-1.5 h-1.5 mt-0.5" />}
                  </button>
                );
              })}
            </div>
            {/* 범례 */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-50">
              {[
                { dot: 'bg-green-500', label: '정상' },
                { dot: 'bg-amber-400', label: '지각' },
                { dot: 'bg-red-500',   label: '결근' },
                { dot: 'bg-violet-500', label: '휴가' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${l.dot}`} />
                  <span className="text-xs text-gray-500">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 리스트 뷰 */
          <div className="flex flex-col gap-2">
            {thisMonthRecords.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">이 달의 기록이 없습니다</div>
            ) : [...thisMonthRecords].reverse().map(r => {
              const cfg = STATUS_CONFIG[r.status];
              return (
                <button key={r.id} onClick={() => { setSelected(r); setSheetOpen(true); }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center justify-between w-full text-left">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">{format(new Date(r.date), 'M월 d일 (E)', { locale: ko })}</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {r.checkIn ? formatTime(r.checkIn) : '--:--'}
                      {r.checkOut ? ` ~ ${formatTime(r.checkOut)}` : r.checkIn ? ' ~ 근무 중' : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={cfg.badgeVariant} dot>{cfg.label}</Badge>
                    {r.workedMinutes ? <span className="text-xs text-gray-400">{formatDuration(r.workedMinutes)}</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 날짜 상세 Bottom Sheet */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="출퇴근 상세" snapHeight="40vh">
        {selected === null ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <p className="text-4xl">📭</p>
            <p className="text-sm text-gray-400">이 날의 출퇴근 기록이 없습니다</p>
          </div>
        ) : selected ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">날짜</span>
              <span className="text-sm font-semibold text-gray-900">{format(new Date(selected.date), 'yyyy년 M월 d일 (E)', { locale: ko })}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">상태</span>
              <Badge variant={STATUS_CONFIG[selected.status].badgeVariant} dot>{STATUS_CONFIG[selected.status].label}</Badge>
            </div>
            {selected.checkIn && (
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">출근 시각</span>
                <span className="text-sm font-semibold text-gray-900">{formatTime(selected.checkIn)}</span>
              </div>
            )}
            {selected.checkOut && (
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">퇴근 시각</span>
                <span className="text-sm font-semibold text-gray-900">{formatTime(selected.checkOut)}</span>
              </div>
            )}
            {selected.workedMinutes ? (
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">근무 시간</span>
                <span className="text-sm font-semibold text-gray-900">{formatDuration(selected.workedMinutes)}</span>
              </div>
            ) : null}
            {selected.distance !== undefined && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">출근 거리</span>
                <span className="text-sm font-semibold text-gray-900">근무지에서 {selected.distance}m</span>
              </div>
            )}
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
