'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LeaveRecord, LeaveBalance } from '@/types';
import { mockLeaves, mockLeaveBalance } from '@/mocks/data/leave';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { format } from 'date-fns';

const LEAVE_TYPE_LABEL: Record<string, string> = { annual: '연차', half: '반차', sick: '병가', official: '공가' };
const STATUS_CONFIG: Record<string, { label: string; variant: string; color: string; bg: string }> = {
  approved: { label: '승인', variant: 'success', color: '#16A34A', bg: '#F0FDF4' },
  pending:  { label: '대기', variant: 'warning', color: '#D97706', bg: '#FFFBEB' },
  rejected: { label: '반려', variant: 'danger',  color: '#DC2626', bg: '#FEF2F2' },
};

export default function LeavePage() {
  const { user, currentEmploymentId } = useAuthStore();
  const [records, setRecords] = useState<LeaveRecord[]>([]);

  const employment = user?.employments?.find(e => e.id === currentEmploymentId);
  const weeklyWorkDays = employment?.workDaysOfWeek?.length ?? employment?.weeklyWorkDays ?? 0;
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

  const [balance, setBalance] = useState<LeaveBalance>({ total: totalLeaveDays, used: 0, remaining: totalLeaveDays });

  useEffect(() => {
    if (!currentEmploymentId) return;
    fetchApi(`/api/leave?employmentId=${currentEmploymentId}`)
      .then(res => {
        if (res && res.records) {
          setRecords(res.records);
          const approvedDays = res.records
            .filter((l: any) => l.status === 'approved' && (l.type === 'annual' || l.type === 'half'))
            .reduce((sum: number, l: any) => sum + l.days, 0);
          const remaining = Math.max(0, totalLeaveDays - approvedDays);
          setBalance({ total: totalLeaveDays, used: approvedDays, remaining });
        } else {
          setBalance({ total: totalLeaveDays, used: 0, remaining: totalLeaveDays });
        }
      })
      .catch(() => {
        setRecords(mockLeaves);
        const approvedDays = mockLeaves
          .filter((l: any) => l.status === 'approved' && (l.type === 'annual' || l.type === 'half'))
          .reduce((sum: number, l: any) => sum + l.days, 0);
        const remaining = Math.max(0, totalLeaveDays - approvedDays);
        setBalance({ total: totalLeaveDays, used: approvedDays, remaining });
      });
  }, [currentEmploymentId, totalLeaveDays]);

  const usedPercent = balance.total > 0 ? Math.round((balance.used / balance.total) * 100) : 0;

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-5 h-14 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">휴가 관리</h1>
        <Link href="/leave/apply" className="h-9 px-4 bg-blue-500 text-white text-sm font-semibold rounded-full flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></svg>
          신청하기
        </Link>
      </div>

      <div className="p-4 flex flex-col gap-4 pb-24">
        {/* 연차 현황 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">연차 현황</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: '총 연차', value: `${balance.total}일`, hours: `${balance.total * dailyWorkHours}h`, color: '#3B82F6' },
              { label: '사용', value: `${balance.used}일`, hours: `${balance.used * dailyWorkHours}h`, color: '#F59E0B' },
              { label: '잔여', value: `${balance.remaining}일`, hours: `${balance.remaining * dailyWorkHours}h`, color: '#22C55E' },
            ].map(s => (
              <div key={s.label} className="text-center rounded-xl py-3 border border-gray-100 flex flex-col justify-center items-center">
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-gray-400 font-medium">{s.hours}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1.5">
            <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-700" style={{ width: `${usedPercent}%` }} />
          </div>
          <p className="text-xs text-gray-400">{usedPercent}% 사용 ({balance.remaining}일 ({balance.remaining * dailyWorkHours}h) 남음)</p>
        </div>

        {/* 신청 내역 */}
        <div>
          <h2 className="font-bold text-gray-900 mb-3">신청 내역</h2>
          <div className="flex flex-col gap-2">
            {records.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">신청 내역이 없습니다</div>
            ) : records.map(r => {
              const s = STATUS_CONFIG[r.status];
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">{LEAVE_TYPE_LABEL[r.type]}</span>
                        <span className="text-xs text-gray-400">{r.days}일</span>
                      </div>
                      <p className="text-sm text-gray-600">{r.startDate} ~ {r.endDate}</p>
                      <p className="text-xs text-gray-400 mt-1">{r.reason}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: s.color, background: s.bg }}>{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
