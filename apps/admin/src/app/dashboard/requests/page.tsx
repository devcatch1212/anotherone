'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface LeaveRecord {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  user: {
    name: string;
    email: string;
  };
  company: {
    name: string;
  };
}

interface AttendanceCorrection {
  id: string;
  date: string;
  proposedCheckIn: string | null;
  proposedCheckOut: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  company: {
    name: string;
  };
}

interface OvertimeRequest {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  company: {
    name: string;
  };
}

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<'leave' | 'attendance' | 'overtime'>('leave');
  
  // 데이터 상태
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [overtimes, setOvertimes] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      if (activeTab === 'leave') {
        const data = await apiFetch<LeaveRecord[]>('/api/admin/leaves');
        setLeaves(data);
      } else if (activeTab === 'attendance') {
        const data = await apiFetch<AttendanceCorrection[]>('/api/admin/attendance-corrections');
        setCorrections(data);
      } else {
        const data = await apiFetch<OvertimeRequest[]>('/api/admin/overtimes');
        setOvertimes(data);
      }
    } catch (err: any) {
      setError(err.message || '요청 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // 연차 승인/반려 액션
  const handleLeaveAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(`${id}-${action}`);
      await apiFetch(`/api/admin/leaves/${id}/${action}`, { method: 'POST' });
      setLeaves((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: action === 'approve' ? 'approved' : 'rejected' } : item
        )
      );
    } catch (err: any) {
      alert(err.message || '작업 처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // 출퇴근 수정 승인/반려 액션
  const handleCorrectionAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(`${id}-${action}`);
      await apiFetch(`/api/admin/attendance-corrections/${id}/${action}`, { method: 'POST' });
      setCorrections((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: action === 'approve' ? 'approved' : 'rejected' } : item
        )
      );
    } catch (err: any) {
      alert(err.message || '작업 처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // 연장 근무 승인/반려 액션
  const handleOvertimeAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(`${id}-${action}`);
      await apiFetch(`/api/admin/overtimes/${id}/${action}`, { method: 'POST' });
      setOvertimes((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: action === 'approve' ? 'approved' : 'rejected' } : item
        )
      );
    } catch (err: any) {
      alert(err.message || '작업 처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '-';
    }
  };

  const calculateDuration = (start: string, end: string) => {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h > 0 ? `${h}시간 ` : ''}${m > 0 ? `${m}분` : h === 0 ? '0분' : ''}`;
    } catch {
      return '-';
    }
  };

  const leaveTypeLabel: Record<string, string> = {
    annual: '연차 🗓️',
    half: '반차 🌗',
    sick: '병가 🤒',
    official: '공가 🏫',
  };

  const statusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    if (status === 'approved') {
      return (
        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
          승인 완료
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-500 border border-red-100">
          반려됨
        </span>
      );
    }
    return (
      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100 animate-pulse">
        대기 중
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 타이틀 헤더 */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{ fontSize: '28px', fontWeight: '800', color: '#1E293B' }}>
          ⏰ 근태 관리
        </h1>
        <p className="text-sm text-slate-500 mt-2 font-medium" style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>
          근로자의 연차 신청, 출퇴근 수정 요청, 연장 근무 결재를 검토하고 승인/반려할 수 있습니다.
        </p>
      </div>

      {/* 조브칸 스타일 메인 탭 */}
      <div 
        className="flex border-b border-slate-200" 
        style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', gap: '16px' }}
      >
        <button
          onClick={() => setActiveTab('leave')}
          className={`pb-3 text-sm font-bold transition cursor-pointer border-b-2 ${
            activeTab === 'leave'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
          style={{
            paddingBottom: '12px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'leave' ? '2px solid #2563EB' : '2px solid transparent',
            color: activeTab === 'leave' ? '#2563EB' : '#94A3B8'
          }}
        >
          📄 연차 신청 내역
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 text-sm font-bold transition cursor-pointer border-b-2 ${
            activeTab === 'attendance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
          style={{
            paddingBottom: '12px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'attendance' ? '2px solid #2563EB' : '2px solid transparent',
            color: activeTab === 'attendance' ? '#2563EB' : '#94A3B8'
          }}
        >
          ⏰ 출퇴근 수정 요청
        </button>
        <button
          onClick={() => setActiveTab('overtime')}
          className={`pb-3 text-sm font-bold transition cursor-pointer border-b-2 ${
            activeTab === 'overtime'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
          style={{
            paddingBottom: '12px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'overtime' ? '2px solid #2563EB' : '2px solid transparent',
            color: activeTab === 'overtime' ? '#2563EB' : '#94A3B8'
          }}
        >
          💼 연장 근무 신청
        </button>
      </div>

      {/* 데이터 테이블 컨테이너 - 가로 오버플로우 방지 */}
      <div 
        className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
        style={{ 
          backgroundColor: '#FFFFFF', 
          borderRadius: '16px', 
          border: '1px solid #E2E8F0', 
          overflow: 'hidden',
          width: '100%',
          maxWidth: '100%',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01)'
        }}
      >
        {loading ? (
          <div className="flex h-64 items-center justify-center" style={{ height: '256px', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500" style={{ padding: '32px', textAlign: 'center', color: '#EF4444' }}>
            ⚠️ {error}
            <button onClick={loadData} className="ml-4 text-xs font-bold text-blue-600 hover:underline ml-3" style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>다시 시도</button>
          </div>
        ) : activeTab === 'leave' ? (
          /* ========================================================
             1. 연차 신청 목록 탭
             ======================================================== */
          leaves.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm" style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
              연차 신청 내역이 존재하지 않습니다.
            </div>
          ) : (
            <div className="w-full overflow-x-auto" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full border-collapse text-left text-sm text-slate-600" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100" style={{ backgroundColor: '#F8FAFC', fontSize: '11px', color: '#64748B' }}>
                  <tr>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>근로자 (이메일)</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>근무지</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>구분 / 사용일수</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>휴가 기간</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>사유</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>상태</th>
                    <th className="px-6 py-4 text-center" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>결재 처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100" style={{ backgroundColor: '#FFFFFF' }}>
                  {leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                        <div className="font-bold text-slate-800" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{l.user.name}</div>
                        <div className="text-xs text-slate-400 mt-1" style={{ fontSize: '11px', color: '#94A3B8' }}>{l.user.email}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700" style={{ padding: '16px 24px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>
                        {l.company.name}
                      </td>
                      <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                        <div className="font-bold text-slate-800" style={{ fontSize: '13px', color: '#1E293B' }}>{leaveTypeLabel[l.type] || l.type}</div>
                        <div className="text-xs text-blue-600 font-bold mt-0.5" style={{ fontSize: '11px', color: '#2563EB', fontWeight: '700' }}>{l.days}일 차감</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700" style={{ padding: '16px 24px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>
                        {l.startDate} ~ {l.endDate}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate" style={{ padding: '16px 24px', fontSize: '12px', color: '#64748B', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '1px solid #F1F5F9' }} title={l.reason}>
                        {l.reason || '-'}
                      </td>
                      <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                        {statusBadge(l.status)}
                      </td>
                      <td className="px-6 py-4 text-center" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>
                        {l.status === 'pending' ? (
                          <div className="flex gap-2 justify-center" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              disabled={actionLoading !== null}
                              onClick={() => handleLeaveAction(l.id, 'approve')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                              style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              {actionLoading === `${l.id}-approve` ? '승인중...' : '승인'}
                            </button>
                            <button
                              disabled={actionLoading !== null}
                              onClick={() => handleLeaveAction(l.id, 'reject')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition cursor-pointer"
                              style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              {actionLoading === `${l.id}-reject` ? '반려중...' : '반려'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400" style={{ fontSize: '12px', color: '#94A3B8' }}>처리 완료</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'attendance' ? (
          /* ========================================================
             2. 출퇴근 수정 요청 목록 탭
             ======================================================== */
          corrections.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm" style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
              출퇴근 수정 요청 내역이 존재하지 않습니다.
            </div>
          ) : (
            <div className="w-full overflow-x-auto" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full border-collapse text-left text-sm text-slate-600" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px' }}>
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100" style={{ backgroundColor: '#F8FAFC', fontSize: '11px', color: '#64748B' }}>
                  <tr>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>근로자 (이메일)</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>근무지</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>수정 요청 대상일</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>요청 출근 / 퇴근시각</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>신청 사유</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>상태</th>
                    <th className="px-6 py-4 text-center" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>결재 처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100" style={{ backgroundColor: '#FFFFFF' }}>
                  {corrections.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                        <div className="font-bold text-slate-800" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{c.user.name}</div>
                        <div className="text-xs text-slate-400 mt-1" style={{ fontSize: '11px', color: '#94A3B8' }}>{c.user.email}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700" style={{ padding: '16px 24px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>
                        {c.company.name}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800" style={{ padding: '16px 24px', fontSize: '13px', color: '#1E293B', borderBottom: '1px solid #F1F5F9' }}>
                        📍 {c.date}
                      </td>
                      <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                        <div className="font-semibold text-slate-700" style={{ fontSize: '12px', color: '#475569' }}>
                          출근: <strong className="text-blue-600">{formatDateTime(c.proposedCheckIn)}</strong>
                        </div>
                        <div className="font-semibold text-slate-700 mt-1" style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                          퇴근: <strong className="text-indigo-600">{formatDateTime(c.proposedCheckOut)}</strong>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate" style={{ padding: '16px 24px', fontSize: '12px', color: '#64748B', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '1px solid #F1F5F9' }} title={c.reason}>
                        {c.reason || '-'}
                      </td>
                      <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                        {statusBadge(c.status)}
                      </td>
                      <td className="px-6 py-4 text-center" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>
                        {c.status === 'pending' ? (
                          <div className="flex gap-2 justify-center" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              disabled={actionLoading !== null}
                              onClick={() => handleCorrectionAction(c.id, 'approve')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                              style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              {actionLoading === `${c.id}-approve` ? '승인중...' : '승인'}
                            </button>
                            <button
                              disabled={actionLoading !== null}
                              onClick={() => handleCorrectionAction(c.id, 'reject')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition cursor-pointer"
                              style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              {actionLoading === `${c.id}-reject` ? '반려중...' : '반려'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400" style={{ fontSize: '12px', color: '#94A3B8' }}>처리 완료</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ========================================================
             3. 연장 근무 신청 목록 탭
             ======================================================== */
          overtimes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm" style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
              연장 근무 신청 내역이 존재하지 않습니다.
            </div>
          ) : (
            <div className="w-full overflow-x-auto" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full border-collapse text-left text-sm text-slate-600" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100" style={{ backgroundColor: '#F8FAFC', fontSize: '11px', color: '#64748B' }}>
                  <tr>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>근로자 (이메일)</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>근무지</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>대상 일자</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>신청 시간 / 총 시간</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>신청 사유</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>상태</th>
                    <th className="px-6 py-4 text-center" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>결재 처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100" style={{ backgroundColor: '#FFFFFF' }}>
                  {overtimes.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                        <div className="font-bold text-slate-800" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{o.user.name}</div>
                        <div className="text-xs text-slate-400 mt-1" style={{ fontSize: '11px', color: '#94A3B8' }}>{o.user.email}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700" style={{ padding: '16px 24px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>
                        {o.company.name}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800" style={{ padding: '16px 24px', fontSize: '13px', color: '#1E293B', borderBottom: '1px solid #F1F5F9' }}>
                        📍 {o.date}
                      </td>
                      <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                        <div className="font-semibold text-slate-700" style={{ fontSize: '13px', color: '#475569' }}>
                          💼 {o.startTime} ~ {o.endTime}
                        </div>
                        <div className="text-xs text-indigo-600 font-bold mt-1" style={{ fontSize: '11px', color: '#4F46E5', fontWeight: '700', marginTop: '4px' }}>
                          ({calculateDuration(o.startTime, o.endTime)})
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate" style={{ padding: '16px 24px', fontSize: '12px', color: '#64748B', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '1px solid #F1F5F9' }} title={o.reason}>
                        {o.reason || '-'}
                      </td>
                      <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                        {statusBadge(o.status)}
                      </td>
                      <td className="px-6 py-4 text-center" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>
                        {o.status === 'pending' ? (
                          <div className="flex gap-2 justify-center" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              disabled={actionLoading !== null}
                              onClick={() => handleOvertimeAction(o.id, 'approve')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                              style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              {actionLoading === `${o.id}-approve` ? '승인중...' : '승인'}
                            </button>
                            <button
                              disabled={actionLoading !== null}
                              onClick={() => handleOvertimeAction(o.id, 'reject')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition cursor-pointer"
                              style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              {actionLoading === `${o.id}-reject` ? '반려중...' : '반려'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400" style={{ fontSize: '12px', color: '#94A3B8' }}>처리 완료</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
