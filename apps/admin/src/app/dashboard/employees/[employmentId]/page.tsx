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
      <div className="flex h-96 items-center justify-center" style={{ height: '384px', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !employment) {
    return (
      <div 
        className="rounded-2xl p-8 text-center text-red-500 border border-red-100 bg-white"
        style={{ padding: '32px', borderRadius: '16px', border: '1px solid #FEE2E2', backgroundColor: '#FFFFFF', textAlign: 'center', color: '#EF4444' }}
      >
        ⚠️ {error || '고용 정보를 찾을 수 없습니다.'}
        <div className="mt-6">
          <button 
            onClick={() => router.back()} 
            className="text-xs font-bold text-slate-500 hover:underline"
            style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
          >
            뒤로 가기
          </button>
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
    <div className="flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 뒤로가기 버튼 */}
      <div>
        <button 
          onClick={() => router.back()} 
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm text-sm font-bold text-slate-600 cursor-pointer"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: '700',
            color: '#475569',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>←</span> 뒤로 가기
        </button>
      </div>

      {/* 고용 정보 & 출퇴근 그리드 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        
        {/* 좌측: 고용 기본 정보 카드 (px-8 py-8 로 세련되게 여백 추가) */}
        <div 
          className="rounded-2xl border border-slate-200"
          style={{ 
            backgroundColor: '#FFFFFF', 
            borderRadius: '16px', 
            border: '1px solid #E2E8F0', 
            padding: '32px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01)',
            height: 'fit-content'
          }}
        >
          <h3 
            className="text-lg font-extrabold text-slate-800 pb-4 border-b border-slate-100 flex items-center gap-2"
            style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', margin: '0 0 24px 0' }}
          >
            📋 고용 정보
          </h3>
          
          <div className="flex flex-col gap-5" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>근로자명</span>
              <span className="text-sm font-extrabold text-slate-800 mt-1" style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>{employment.user.name}</span>
              <span className="text-xs text-slate-500" style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{employment.user.email}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>근무지</span>
              <span className="text-sm font-extrabold text-slate-800 mt-1" style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>{employment.company.name}</span>
              <span className="text-xs text-slate-500 line-clamp-2" style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>📍 {employment.company.address}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>부서 / 직책</span>
              <span className="text-sm font-extrabold text-slate-800 mt-1" style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>
                {employment.department ? `${employment.department} · ` : ''}{employment.position || '직원'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>근무 스케줄</span>
              <span className="text-sm font-semibold text-slate-700 mt-1" style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                주 {employment.weeklyWorkDays}일 ({employment.workStartTime} ~ {employment.workEndTime})
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>계약 임금</span>
              <span className="text-sm font-black text-slate-800 mt-1" style={{ fontSize: '14px', fontWeight: '800' }}>
                {employment.wageType === 'hourly' ? (
                  <span className="text-blue-600" style={{ color: '#2563EB' }}>시급: {employment.hourlyWage?.toLocaleString()}원</span>
                ) : (
                  <span className="text-indigo-600" style={{ color: '#4F46E5' }}>일급: {employment.dailyWage?.toLocaleString()}원</span>
                )}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>남은 연차 일수</span>
              <span className="text-sm font-extrabold text-blue-600 mt-1" style={{ fontSize: '14px', fontWeight: '800', color: '#2563EB' }}>
                {(employment as any).annualLeaveBalance !== undefined ? `${(employment as any).annualLeaveBalance}일` : '15일'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>재직 상태</span>
              <div className="mt-1.5" style={{ marginTop: '6px' }}>
                {employment.isActive ? (
                  <span 
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: '#ECFDF5',
                      color: '#047857',
                      border: '1px solid #A7F3D0'
                    }}
                  >
                    재직 중
                  </span>
                ) : (
                  <span 
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-400"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: '#F1F5F9',
                      color: '#94A3B8'
                    }}
                  >
                    근무 종료
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 월별 출퇴근 기록 및 요약 (가로 찌그러짐을 확실하게 방지하기 위해 lg:col-span-2 와 style 고정 병행) */}
        <div 
          className="lg:col-span-2"
          style={{ 
            gridColumn: 'span 2 / span 2',
            width: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
        >
          {/* 기간 필터 및 요약 카드 */}
          <div 
            className="rounded-2xl border border-slate-200"
            style={{ 
              backgroundColor: '#FFFFFF', 
              borderRadius: '16px', 
              border: '1px solid #E2E8F0', 
              padding: '32px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01)',
              boxSizing: 'border-box'
            }}
          >
            <div 
              className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '20px', marginBottom: '24px' }}
            >
              <h3 className="text-lg font-extrabold text-slate-800" style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', margin: 0 }}>
                ⏰ 출퇴근 현황
              </h3>
              
              {/* 연/월 필터 */}
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500"
                  style={{ borderRadius: '8px', border: '1px solid #CBD5E1', padding: '6px 12px', fontSize: '12px', fontWeight: '600' }}
                >
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500"
                  style={{ borderRadius: '8px', border: '1px solid #CBD5E1', padding: '6px 12px', fontSize: '12px', fontWeight: '600' }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}월</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingAtt ? (
              <div className="flex h-32 items-center justify-center" style={{ height: '128px', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : !attendance ? (
              <div className="text-center text-slate-400 text-xs" style={{ padding: '32px', textAlign: 'center', color: '#94A3B8' }}>출퇴근 기록이 없습니다.</div>
            ) : (
              <div className="flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* 당월 요약 그리드 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
                  <div className="p-4 rounded-xl border border-slate-100 text-center shadow-sm" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #F1F5F9', backgroundColor: '#F8FAFC', textAlign: 'center' }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ fontSize: '10px', fontWeight: '700', color: '#94A3B8' }}>출근 일수</span>
                    <h4 className="text-lg font-extrabold text-slate-800 mt-1.5" style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', marginTop: '6px', margin: 0 }}>{attendance.summary.totalDays}일</h4>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 text-center shadow-sm" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #F1F5F9', backgroundColor: '#F8FAFC', textAlign: 'center' }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ fontSize: '10px', fontWeight: '700', color: '#94A3B8' }}>총 근로 시간</span>
                    <h4 className="text-lg font-extrabold text-slate-800 mt-1.5" style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', marginTop: '6px', margin: 0 }}>{attendance.summary.totalWorkedHours}시간</h4>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 text-center shadow-sm" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #E6F4EA', backgroundColor: '#F3F9F4', textAlign: 'center' }}>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider" style={{ fontSize: '10px', fontWeight: '700', color: '#10B981' }}>정상 출근</span>
                    <h4 className="text-lg font-extrabold text-emerald-600 mt-1.5" style={{ fontSize: '18px', fontWeight: '800', color: '#047857', marginTop: '6px', margin: 0 }}>{attendance.summary.normalCount}회</h4>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 text-center shadow-sm" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #FEF3C7', backgroundColor: '#FFFBEB', textAlign: 'center' }}>
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider" style={{ fontSize: '10px', fontWeight: '700', color: '#D97706' }}>지각 횟수</span>
                    <h4 className="text-lg font-extrabold text-amber-600 mt-1.5" style={{ fontSize: '18px', fontWeight: '800', color: '#B45309', marginTop: '6px', margin: 0 }}>{attendance.summary.lateCount}회</h4>
                  </div>
                </div>

                {/* 상세 내역 테이블 - 가로 스크롤 보호 */}
                <div className="w-full overflow-x-auto border border-slate-100 rounded-xl" style={{ width: '100%', overflowX: 'auto', borderRadius: '12px', border: '1px solid #E2E8F0', WebkitOverflowScrolling: 'touch' }}>
                  <table className="w-full border-collapse text-left text-xs text-slate-600" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead className="bg-slate-50/80 font-bold text-slate-500 uppercase border-b border-slate-100" style={{ backgroundColor: '#F8FAFC', fontSize: '11px', fontWeight: '700', color: '#64748B' }}>
                      <tr>
                        <th className="px-6 py-4" style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>날짜</th>
                        <th className="px-6 py-4" style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>출근 시각</th>
                        <th className="px-6 py-4" style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>퇴근 시각</th>
                        <th className="px-6 py-4" style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>근무 시간</th>
                        <th className="px-6 py-4" style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>근무 상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100" style={{ backgroundColor: '#FFFFFF' }}>
                      {attendance.records.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-slate-400" style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                            이 달의 출퇴근 기록이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        attendance.records.map((r) => {
                          let status = statusLabel[r.status] || { label: r.status, style: 'bg-slate-100 text-slate-600 border border-slate-200' };
                          
                          // 출근은 존재하나 퇴근이 아직 없는 미완료 상태 판별
                          if (r.checkIn && !r.checkOut) {
                            const todayKST = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                            if (r.date === todayKST) {
                              status = { label: '근무 중 🏃', style: 'bg-blue-50 text-blue-600 border border-blue-100' };
                            } else {
                              status = { label: '미퇴근 ⚠️', style: 'bg-rose-50 text-rose-600 border border-rose-100 font-bold' };
                            }
                          }
                          return (
                            <tr key={r.id} className="hover:bg-slate-50/30 transition duration-150">
                              <td className="px-6 py-4 font-bold text-slate-800" style={{ padding: '14px 20px', fontSize: '12px', fontWeight: '700', color: '#1E293B', borderBottom: '1px solid #F1F5F9' }}>{r.date}</td>
                              <td className="px-6 py-4 font-medium text-slate-700" style={{ padding: '14px 20px', fontSize: '12px', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>{formatTime(r.checkIn)}</td>
                              <td className="px-6 py-4 font-medium text-slate-700" style={{ padding: '14px 20px', fontSize: '12px', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>{formatTime(r.checkOut)}</td>
                              <td className="px-6 py-4 font-bold text-slate-800" style={{ padding: '14px 20px', fontSize: '12px', fontWeight: '700', color: '#1E293B', borderBottom: '1px solid #F1F5F9' }}>{formatHours(r.workedMinutes)}</td>
                              <td className="px-6 py-4" style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9' }}>
                                <span 
                                  className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${status.style}`}
                                  style={{
                                    display: 'inline-flex',
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    fontSize: '10px',
                                    fontWeight: '700'
                                  }}
                                >
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
