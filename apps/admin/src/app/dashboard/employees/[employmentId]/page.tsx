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
  weeklyWage: number | null;
  monthlyWage: number | null;
  workStartTime: string;
  workEndTime: string;
  weeklyWorkDays: number;
  isActive: boolean;
  hireDate: string | null;
  memo: string | null;
  employeeCount: string;
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

  // ② 계약 정보 수정 모달
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  // ② 연차 수정 인라인
  const [leaveEditMode, setLeaveEditMode] = useState(false);
  const [leaveInput, setLeaveInput] = useState('');
  const [leaveLoading, setLeaveLoading] = useState(false);

  // ③ 출퇴근 추가/수정 모달
  const EMPTY_ATT_FORM = { date: '', checkIn: '', checkOut: '', status: 'normal' };
  const [attModal, setAttModal] = useState<{ open: boolean; recordId: string | null }>({ open: false, recordId: null });
  const [attForm, setAttForm] = useState(EMPTY_ATT_FORM);
  const [attLoading, setAttLoading] = useState(false);

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

  // ② 계약 정보 수정 열기
  const openEditModal = () => {
    if (!employment) return;
    setEditForm({
      position: employment.position || '',
      department: employment.department || '',
      wageType: employment.wageType || 'hourly',
      hourlyWage: employment.hourlyWage ?? '',
      dailyWage: employment.dailyWage ?? '',
      weeklyWage: employment.weeklyWage ?? '',
      monthlyWage: employment.monthlyWage ?? '',
      dailyWorkHours: (employment as any).dailyWorkHours ?? 8,
      weeklyWorkDays: employment.weeklyWorkDays ?? 5,
      workStartTime: employment.workStartTime || '',
      workEndTime: employment.workEndTime || '',
      breakMinutes: (employment as any).breakMinutes ?? 60,
      hireDate: employment.hireDate ? employment.hireDate.split('T')[0] : '',
      memo: employment.memo || '',
      employeeCount: employment.employeeCount || 'over5',
    });
    setEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setEditLoading(true);
      const payload: any = {
        position: editForm.position,
        department: editForm.department || null,
        wageType: editForm.wageType,
        dailyWorkHours: Number(editForm.dailyWorkHours),
        weeklyWorkDays: Number(editForm.weeklyWorkDays),
        workStartTime: editForm.workStartTime || null,
        workEndTime: editForm.workEndTime || null,
        breakMinutes: editForm.breakMinutes !== '' ? Number(editForm.breakMinutes) : null,
        hireDate: editForm.hireDate || null,
        memo: editForm.memo || null,
        employeeCount: editForm.employeeCount,
      };
      if (editForm.wageType === 'hourly') payload.hourlyWage = editForm.hourlyWage !== '' ? Number(editForm.hourlyWage) : null;
      if (editForm.wageType === 'daily') payload.dailyWage = editForm.dailyWage !== '' ? Number(editForm.dailyWage) : null;
      if (editForm.wageType === 'weekly') payload.weeklyWage = editForm.weeklyWage !== '' ? Number(editForm.weeklyWage) : null;
      if (editForm.wageType === 'monthly') payload.monthlyWage = editForm.monthlyWage !== '' ? Number(editForm.monthlyWage) : null;
      const updated = await apiFetch<EmploymentDetail>(`/api/admin/employments/${employmentId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setEmployment((prev) => prev ? { ...prev, ...updated } : prev);
      setEditModal(false);
    } catch (err: any) {
      alert(err.message || '수정 중 오류가 발생했습니다.');
    } finally {
      setEditLoading(false);
    }
  };

  // ⑤ 연차 잔여일수 저장
  const handleLeaveSave = async () => {
    const val = parseFloat(leaveInput);
    if (isNaN(val) || val < 0) { alert('올바른 숫자를 입력해주세요.'); return; }
    try {
      setLeaveLoading(true);
      await apiFetch(`/api/admin/employments/${employmentId}/leave-balance`, {
        method: 'PATCH',
        body: JSON.stringify({ balance: val }),
      });
      setEmployment((prev) => prev ? { ...prev, annualLeaveBalance: val } as any : prev);
      setLeaveEditMode(false);
    } catch (err: any) {
      alert(err.message || '연차 수정 중 오류가 발생했습니다.');
    } finally {
      setLeaveLoading(false);
    }
  };

  // ③ 출퇴근 모달 열기
  const openAttModal = (record?: AttendanceRecord) => {
    if (record) {
      const toLocalTime = (iso: string | null) => {
        if (!iso) return '';
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      setAttForm({ date: record.date, checkIn: toLocalTime(record.checkIn), checkOut: toLocalTime(record.checkOut), status: record.status });
      setAttModal({ open: true, recordId: record.id });
    } else {
      const todayStr = new Date().toISOString().substring(0, 10);
      setAttForm({ date: todayStr, checkIn: '09:00', checkOut: '18:00', status: 'normal' });
      setAttModal({ open: true, recordId: null });
    }
  };

  const handleAttSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAttLoading(true);

      const combineDateAndTime = (dateStr: string, timeStr: string) => {
        if (!dateStr || !timeStr) return null;
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hour, minute] = timeStr.split(':').map(Number);
        return new Date(year, month - 1, day, hour, minute).toISOString();
      };

      const combineCheckOut = (dateStr: string, inTimeStr: string, outTimeStr: string) => {
        if (!dateStr || !outTimeStr) return null;
        const [year, month, day] = dateStr.split('-').map(Number);
        const [outH, outM] = outTimeStr.split(':').map(Number);
        let outDate = new Date(year, month - 1, day, outH, outM);
        if (inTimeStr) {
          const [inH, inM] = inTimeStr.split(':').map(Number);
          if (outH < inH || (outH === inH && outM < inM)) {
            outDate.setDate(outDate.getDate() + 1);
          }
        }
        return outDate.toISOString();
      };

      const checkInISO = combineDateAndTime(attForm.date, attForm.checkIn);
      const checkOutISO = combineCheckOut(attForm.date, attForm.checkIn, attForm.checkOut);

      if (attModal.recordId) {
        const updated = await apiFetch<AttendanceRecord>(`/api/admin/attendance/${attModal.recordId}`, {
          method: 'PATCH',
          body: JSON.stringify({ checkIn: checkInISO, checkOut: checkOutISO, status: attForm.status }),
        });
        setAttendance((prev) => prev ? { ...prev, records: prev.records.map((r) => r.id === updated.id ? updated : r) } : prev);
      } else {
        await apiFetch(`/api/admin/attendance`, {
          method: 'POST',
          body: JSON.stringify({ employmentId, date: attForm.date, checkIn: checkInISO, checkOut: checkOutISO, status: attForm.status }),
        });
        await loadAttendance();
      }
      setAttModal({ open: false, recordId: null });
    } catch (err: any) {
      alert(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setAttLoading(false);
    }
  };

  const handleAttDelete = async (recordId: string) => {
    if (!window.confirm('이 출퇴근 기록을 삭제하시겠습니까?\n삭제하면 복원할 수 없습니다.')) return;
    try {
      await apiFetch(`/api/admin/attendance/${recordId}`, { method: 'DELETE' });
      setAttendance((prev) => prev ? { ...prev, records: prev.records.filter((r) => r.id !== recordId) } : prev);
    } catch (err: any) {
      alert(err.message || '삭제 중 오류가 발생했습니다.');
    }
  };


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
            style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', margin: '0 0 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            📋 고용 정보
            <button
              onClick={openEditModal}
              style={{ fontSize: '12px', fontWeight: '700', padding: '5px 12px', borderRadius: '8px', backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', cursor: 'pointer' }}
            >
              계약 정보 수정
            </button>
          </h3>
          
          <div className="flex flex-col gap-5" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>근로자명</span>
              <span className="text-sm font-extrabold text-slate-800 mt-1" style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>{employment.user.name}</span>
              <span className="text-xs text-slate-500" style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                {employment.user.email || `(기기 계정) ${employment.user.name}`}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>근무지</span>
              <span className="text-sm font-extrabold text-slate-800 mt-1" style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>{employment.company.name}</span>
              <span className="text-xs text-slate-500 line-clamp-2" style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>📍 {employment.company.address}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>사업장 규모</span>
              <span className="text-sm font-extrabold text-slate-800 mt-1" style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>
                {employment.employeeCount === 'under5' ? '5인 미만' : '5인 이상'}
              </span>
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
                {employment.wageType === 'hourly' && (
                  <span className="text-blue-600" style={{ color: '#2563EB' }}>시급: {employment.hourlyWage?.toLocaleString()}원</span>
                )}
                {employment.wageType === 'daily' && (
                  <span className="text-indigo-600" style={{ color: '#4F46E5' }}>일급: {employment.dailyWage?.toLocaleString()}원</span>
                )}
                {employment.wageType === 'weekly' && (
                  <span className="text-teal-600" style={{ color: '#0D9488' }}>주급: {employment.weeklyWage?.toLocaleString()}원</span>
                )}
                {employment.wageType === 'monthly' && (
                  <span className="text-purple-600" style={{ color: '#9333EA' }}>월급: {employment.monthlyWage?.toLocaleString()}원</span>
                )}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>입사일자</span>
              <span className="text-sm font-extrabold text-slate-800 mt-1" style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>
                {employment.hireDate ? new Date(employment.hireDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '미지정'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>기업 메모</span>
              <span className="text-sm font-medium text-slate-700 mt-1 whitespace-pre-wrap" style={{ fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                {employment.memo || '등록된 메모가 없습니다.'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>남은 연차 일수</span>
              {leaveEditMode ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={leaveInput}
                    onChange={(e) => setLeaveInput(e.target.value)}
                    style={{ width: '80px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '700' }}
                    autoFocus
                  />
                  <button onClick={handleLeaveSave} disabled={leaveLoading} style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', backgroundColor: '#2563EB', color: '#FFF', border: 'none', cursor: 'pointer' }}>
                    {leaveLoading ? '저장...' : '저장'}
                  </button>
                  <button onClick={() => setLeaveEditMode(false)} style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
                    취소
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span className="text-sm font-extrabold text-blue-600" style={{ fontSize: '14px', fontWeight: '800', color: '#2563EB' }}>
                    {(employment as any).annualLeaveBalance !== undefined ? `${(employment as any).annualLeaveBalance}일` : '15일'}
                  </span>
                  <button onClick={() => { setLeaveInput(String((employment as any).annualLeaveBalance ?? 15)); setLeaveEditMode(true); }} style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
                    ✏️ 수정
                  </button>
                </div>
              )}
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                  <button
                    onClick={() => openAttModal()}
                    style={{ padding: '7px 16px', fontSize: '12px', fontWeight: '700', backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    + 기록 추가
                  </button>
                </div>
                  <table className="w-full border-collapse text-left text-xs text-slate-600" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
                    <thead className="bg-slate-50/80 font-bold text-slate-500 uppercase border-b border-slate-100" style={{ backgroundColor: '#F8FAFC', fontSize: '11px', fontWeight: '700', color: '#64748B' }}>
                      <tr>
                        <th className="px-6 py-4" style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>날짜</th>
                        <th className="px-6 py-4" style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>출근 시각</th>
                        <th className="px-6 py-4" style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>퇴근 시각</th>
                        <th className="px-6 py-4" style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>근무 시간</th>
                        <th className="px-6 py-4" style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>근무 상태</th>
                        <th className="px-6 py-4 text-center" style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>관리</th>
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
                              <td className="px-6 py-4 text-center" style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                  <button onClick={() => openAttModal(r)} style={{ padding: '3px 8px', fontSize: '10px', fontWeight: '700', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', cursor: 'pointer' }}>수정</button>
                                  <button onClick={() => handleAttDelete(r.id)} style={{ padding: '3px 8px', fontSize: '10px', fontWeight: '700', borderRadius: '6px', backgroundColor: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', cursor: 'pointer' }}>삭제</button>
                                </div>
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

      {/* ── ② 계약 정보 수정 모달 ── */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
             onClick={(e) => { if (e.target === e.currentTarget) setEditModal(false); }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', marginBottom: '24px' }}>📋 계약 정보 수정</h2>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>직책 *</label>
                  <input required value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>부서</label>
                  <input value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} placeholder="(선택)" style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>급여 유형</label>
                <select value={editForm.wageType} onChange={(e) => setEditForm({ ...editForm, wageType: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}>
                  <option value="hourly">시급</option>
                  <option value="daily">일급</option>
                  <option value="weekly">주급</option>
                  <option value="monthly">월급</option>
                </select>
              </div>
              {editForm.wageType === 'hourly' && <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>시급 (원)</label><input type="number" value={editForm.hourlyWage} onChange={(e) => setEditForm({ ...editForm, hourlyWage: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }} /></div>}
              {editForm.wageType === 'daily' && <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>일급 (원)</label><input type="number" value={editForm.dailyWage} onChange={(e) => setEditForm({ ...editForm, dailyWage: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }} /></div>}
              {editForm.wageType === 'weekly' && <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>주급 (원)</label><input type="number" value={editForm.weeklyWage} onChange={(e) => setEditForm({ ...editForm, weeklyWage: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }} /></div>}
              {editForm.wageType === 'monthly' && <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>월급 (원)</label><input type="number" value={editForm.monthlyWage} onChange={(e) => setEditForm({ ...editForm, monthlyWage: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }} /></div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>주 근무일수</label><input type="number" min="1" max="7" value={editForm.weeklyWorkDays} onChange={(e) => setEditForm({ ...editForm, weeklyWorkDays: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>출근 시각</label><input type="time" value={editForm.workStartTime} onChange={(e) => setEditForm({ ...editForm, workStartTime: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>퇴근 시각</label><input type="time" value={editForm.workEndTime} onChange={(e) => setEditForm({ ...editForm, workEndTime: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>휴게 시간 (분)</label><input type="number" value={editForm.breakMinutes} onChange={(e) => setEditForm({ ...editForm, breakMinutes: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>입사일자</label><input type="date" value={editForm.hireDate} onChange={(e) => setEditForm({ ...editForm, hireDate: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }} /></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>사업장 규모</label>
                <select value={editForm.employeeCount} onChange={(e) => setEditForm({ ...editForm, employeeCount: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}>
                  <option value="over5">5인 이상</option>
                  <option value="under5">5인 미만</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>기업 메모</label>
                <textarea rows={3} value={editForm.memo} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })} placeholder="(선택) 주안날짜, 담당자, 급여일 등" style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid #F1F5F9', marginTop: '8px' }}>
                <button type="button" onClick={() => setEditModal(false)} style={{ padding: '9px 20px', fontSize: '13px', fontWeight: '700', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#64748B', cursor: 'pointer' }}>취소</button>
                <button type="submit" disabled={editLoading} style={{ padding: '9px 20px', fontSize: '13px', fontWeight: '700', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFF', cursor: 'pointer' }}>{editLoading ? '저장 중...' : '수정 완료'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ③ 출퇴근 추가/수정 모달 ── */}
      {attModal.open && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
             onClick={(e) => { if (e.target === e.currentTarget) setAttModal({ open: false, recordId: null }); }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', marginBottom: '24px' }}>{attModal.recordId ? '⏰ 출퇴근 기록 수정' : '⏰ 출퇴근 기록 추가'}</h2>
            <form onSubmit={handleAttSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!attModal.recordId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>날짜 *</label>
                  <input required type="date" value={attForm.date} onChange={(e) => setAttForm({ ...attForm, date: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>출근 시각</label>
                  <input type="time" value={attForm.checkIn} onChange={(e) => setAttForm({ ...attForm, checkIn: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>퇴근 시각</label>
                  <input type="time" value={attForm.checkOut} onChange={(e) => setAttForm({ ...attForm, checkOut: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>근태 상태</label>
                <select value={attForm.status} onChange={(e) => setAttForm({ ...attForm, status: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}>
                  <option value="normal">정상</option>
                  <option value="late">지각</option>
                  <option value="absent">결근</option>
                  <option value="vacation">휴가</option>
                  <option value="holiday">공휴일</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid #F1F5F9', marginTop: '8px' }}>
                <button type="button" onClick={() => setAttModal({ open: false, recordId: null })} style={{ padding: '9px 20px', fontSize: '13px', fontWeight: '700', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#64748B', cursor: 'pointer' }}>취소</button>
                <button type="submit" disabled={attLoading} style={{ padding: '9px 20px', fontSize: '13px', fontWeight: '700', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFF', cursor: 'pointer' }}>{attLoading ? '저장 중...' : attModal.recordId ? '수정 완료' : '추가하기'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
