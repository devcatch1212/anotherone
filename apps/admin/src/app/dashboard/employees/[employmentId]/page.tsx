'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface EmploymentDetail {
  id: string;
  userId: string;
  companyId: string;
  position: string;
  department: string | null;
  wageType: string;
  hourlyWage: number | null;
  dailyWage: number | null;
  workStartTime: string;
  workEndTime: string;
  weeklyWorkDays: number;
  isActive: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
  company: {
    id: string;
    name: string;
    address: string;
  };
}

interface AttendanceRecord {
  id: string;
  userId: string;
  companyId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'normal' | 'late' | 'absent' | 'vacation' | 'holiday';
  workedMinutes: number | null;
}

interface AttendanceSummary {
  employee: {
    name: string;
    email: string;
    position: string;
    department: string | null;
  };
  company: {
    name: string;
  };
  period: {
    year: number;
    month: number;
  };
  summary: {
    totalDays: number;
    totalWorkedMinutes: number;
    totalWorkedHours: number;
    normalCount: number;
    lateCount: number;
    absentCount: number;
  };
  records: AttendanceRecord[];
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employmentId = params.employmentId as string;

  const [employment, setEmployment] = useState<EmploymentDetail | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [loadingEmp, setLoadingEmp] = useState(true);
  const [loadingAtt, setLoadingAtt] = useState(true);
  const [error, setError] = useState('');

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const loadEmployment = async () => {
    try {
      setLoadingEmp(true);
      const res = await apiFetch<EmploymentDetail>(`/api/admin/employees/${employmentId}`);
      setEmployment(res);
    } catch (err: any) {
      setError(err.message || '고용 정보를 불러오지 못했습니다.');
    } finally {
      setLoadingEmp(false);
    }
  };

  const loadAttendance = async () => {
    try {
      setLoadingAtt(true);
      const res = await apiFetch<AttendanceSummary>(`/api/admin/employees/${employmentId}/attendance`, {
        params: { year, month },
      });
      setAttendance(res);
    } catch (err: any) {
      setError(err.message || '출퇴근 기록을 불러오지 못했습니다.');
    } finally {
      setLoadingAtt(false);
    }
  };

  useEffect(() => {
    if (employmentId) {
      loadEmployment();
    }
  }, [employmentId]);

  useEffect(() => {
    if (employmentId) {
      loadAttendance();
    }
  }, [employmentId, year, month]);

  if (loadingEmp) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !employment) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center text-danger border-danger/10">
        ⚠️ {error || '고용 정보를 찾을 수 없습니다.'}
        <div className="mt-4">
          <button onClick={() => router.back()} className="text-xs font-bold text-text-secondary hover:underline">뒤로 가기</button>
        </div>
      </div>
    );
  }

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '-';
    }
  };

  const formatHours = (minutes: number | null) => {
    if (minutes === null) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  const statusLabel: Record<string, { label: string; style: string }> = {
    normal: { label: '정상', style: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
    late: { label: '지각 ⚠️', style: 'bg-amber-50 text-amber-600 border border-amber-100' },
    absent: { label: '결근 🚫', style: 'bg-red-50 text-red-500 border border-red-100' },
    vacation: { label: '휴가 🏖️', style: 'bg-blue-50 text-blue-600 border border-blue-100' },
    holiday: { label: '공휴일 🗓️', style: 'bg-slate-100 text-slate-400 border border-slate-200/50' },
  };

  return (
    <div>
      {/* 뒤로가기 */}
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
          <span>←</span> 뒤로 가기
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 좌측: 고용 기본 정보 카드 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-white/60 shadow-md">
            <h3 className="text-lg font-black text-slate-800 mb-4 pb-4 border-b border-slate-100">
              📋 고용 정보
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">근로자명</span>
                <span className="text-sm font-bold text-slate-800">{employment.user.name}</span>
                <span className="text-xs text-slate-500 block">{employment.user.email}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">근무지</span>
                <span className="text-sm font-bold text-slate-800">{employment.company.name}</span>
                <span className="text-xs text-slate-500 block line-clamp-2">📍 {employment.company.address}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">부서 / 직책</span>
                <span className="text-sm font-bold text-slate-800">
                  {employment.department ? `${employment.department} · ` : ''}{employment.position || '직원'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">근무 스케줄</span>
                <span className="text-sm font-semibold text-slate-700">
                  주 {employment.weeklyWorkDays}일 ({employment.workStartTime} ~ {employment.workEndTime})
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">계약 임금</span>
                <span className="text-sm font-black text-slate-800">
                  {employment.wageType === 'hourly' ? (
                    <span className="text-blue-600">시급: {employment.hourlyWage?.toLocaleString()}원</span>
                  ) : (
                    <span className="text-indigo-600">일급: {employment.dailyWage?.toLocaleString()}원</span>
                  )}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">재직 상태</span>
                <div className="mt-1">
                  {employment.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                      재직 중
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-400">
                      근무 종료
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 월별 출퇴근 기록 및 요약 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 기간 필터 및 요약 */}
          <div className="glass-card rounded-2xl p-6 border border-white/60 shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-6 border-b border-slate-200/60">
              <h3 className="text-lg font-black text-slate-800">⏰ 출퇴근 현황</h3>
              
              {/* 연/월 필터 */}
              <div className="flex items-center gap-2">
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}월</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingAtt ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : !attendance ? (
              <div className="text-center text-slate-400 text-xs">출퇴근 기록이 없습니다.</div>
            ) : (
              <div>
                {/* 당월 요약 그리드 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-center shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">출근 일수</span>
                    <h4 className="text-lg font-black text-slate-800 mt-1">{attendance.summary.totalDays}일</h4>
                  </div>
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-center shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">총 근로 시간</span>
                    <h4 className="text-lg font-black text-slate-800 mt-1">{attendance.summary.totalWorkedHours}시간</h4>
                  </div>
                  <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 text-center shadow-sm">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">정상 출근</span>
                    <h4 className="text-lg font-black text-emerald-600 mt-1">{attendance.summary.normalCount}회</h4>
                  </div>
                  <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 text-center shadow-sm">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">지각 횟수</span>
                    <h4 className="text-lg font-black text-amber-600 mt-1">{attendance.summary.lateCount}회</h4>
                  </div>
                </div>

                {/* 상세 내역 테이블 */}
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full border-collapse text-left text-xs text-slate-600">
                    <thead className="bg-slate-50/80 font-bold text-slate-500 uppercase border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">날짜</th>
                        <th className="px-4 py-3">출근 시각</th>
                        <th className="px-4 py-3">퇴근 시각</th>
                        <th className="px-4 py-3">근무 시간</th>
                        <th className="px-4 py-3">근무 상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/40">
                      {attendance.records.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                            이 달의 출퇴근 기록이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        attendance.records.map((r) => {
                          const status = statusLabel[r.status] || { label: r.status, style: 'bg-slate-100 text-slate-600 border border-slate-200' };
                          return (
                            <tr key={r.id} className="hover:bg-slate-50/30 transition duration-150">
                              <td className="px-4 py-3 font-bold text-slate-800">{r.date}</td>
                              <td className="px-4 py-3 font-medium text-slate-700">{formatTime(r.checkIn)}</td>
                              <td className="px-4 py-3 font-medium text-slate-700">{formatTime(r.checkOut)}</td>
                              <td className="px-4 py-3 font-bold text-slate-800">{formatHours(r.workedMinutes)}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${status.style}`}>
                                  {status.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
