'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface Company {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
  createdAt: string;
}

interface Employment {
  id: string;
  position: string;
  department: string | null;
  isActive: boolean;
  endedAt: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  company: {
    name: string;
  };
}

interface SettingsData {
  companies: Company[];
  employments: Employment[];
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'employee'>('company');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employments, setEmployments] = useState<Employment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiFetch<SettingsData>('/api/admin/settings-data');
      setCompanies(data.companies);
      setEmployments(data.employments);
    } catch (err: any) {
      setError(err.message || '설정 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 근무지 활성/비활성 토글
  const handleCompanyStatusToggle = async (id: string, currentStatus: boolean, name: string) => {
    const nextStatus = !currentStatus;
    const confirmMessage = nextStatus
      ? `🏢 [${name}] 근무지의 운영을 재개(활성화)하시겠습니까?\n활성화 시 대시보드 목록에 다시 표시됩니다.`
      : `⚠️ 정말로 [${name}] 근무지의 운영을 종료(비활성화)하시겠습니까?\n비활성화 시 대시보드 활성 목록에서 제외되며, 소속 근로계약과 과거 근태 데이터는 안전하게 보관됩니다.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setActionLoading(`company-${id}`);
      await apiFetch(`/api/admin/companies/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextStatus }),
      });
      // 로컬 상태 즉시 갱신
      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: nextStatus } : c))
      );
    } catch (err: any) {
      alert(err.message || '근무지 상태 수정 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // 근로자 퇴사 처리 (비활성화)
  const handleEmployeeDeactivate = async (id: string, name: string) => {
    const confirmMessage = `⚠️ 정말로 근로자 [${name}]님을 퇴사 처리(비활성화)하시겠습니까?\n퇴사 처리 시 근무지의 실시간 출퇴근 목록에서 즉시 제외되며, 그동안 누적된 출퇴근 및 급여 정산 기록은 데이터베이스에 온전히 보존됩니다.\n\n이 작업은 되돌릴 수 없습니다.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setActionLoading(`employee-${id}`);
      await apiFetch(`/api/admin/employments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      });
      // 로컬 상태 즉시 갱신
      setEmployments((prev) =>
        prev.map((emp) =>
          emp.id === id ? { ...emp, isActive: false, endedAt: new Date().toISOString() } : emp
        )
      );
    } catch (err: any) {
      alert(err.message || '퇴사 처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 타이틀 헤더 */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{ fontSize: '28px', fontWeight: '800', color: '#1E293B' }}>
          ⚙️ 시스템 설정 및 관리
        </h1>
        <p className="text-sm text-slate-500 mt-2 font-medium" style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>
          실수 방지를 위해 데이터의 삭제 대신 안전하게 보존하며 숨기는 운영 종료 및 퇴사 처리를 수행할 수 있습니다.
        </p>
      </div>

      {/* 조브칸 스타일 메인 탭 */}
      <div 
        className="flex border-b border-slate-200" 
        style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', gap: '16px' }}
      >
        <button
          onClick={() => setActiveTab('company')}
          className={`pb-3 text-sm font-bold transition cursor-pointer border-b-2 ${
            activeTab === 'company'
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
            borderBottom: activeTab === 'company' ? '2px solid #2563EB' : '2px solid transparent',
            color: activeTab === 'company' ? '#2563EB' : '#94A3B8'
          }}
        >
          🏢 근무지 운영 관리
        </button>
        <button
          onClick={() => setActiveTab('employee')}
          className={`pb-3 text-sm font-bold transition cursor-pointer border-b-2 ${
            activeTab === 'employee'
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
            borderBottom: activeTab === 'employee' ? '2px solid #2563EB' : '2px solid transparent',
            color: activeTab === 'employee' ? '#2563EB' : '#94A3B8'
          }}
        >
          👥 근로자 재직 관리
        </button>
      </div>

      {/* 설정 테이블 카드 컨테이너 */}
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
        ) : activeTab === 'company' ? (
          /* ========================================================
             1. 근무지 관리 탭
             ======================================================== */
          companies.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm" style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
              등록된 근무지가 존재하지 않습니다.
            </div>
          ) : (
            <div className="w-full overflow-x-auto" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full border-collapse text-left text-sm text-slate-600" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100" style={{ backgroundColor: '#F8FAFC', fontSize: '11px', color: '#64748B' }}>
                  <tr>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>근무지명</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>주소</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>최초 등록일</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>상태</th>
                    <th className="px-6 py-4 text-center" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>상태 제어</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100" style={{ backgroundColor: '#FFFFFF' }}>
                  {companies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-bold text-slate-800" style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '700', color: '#1E293B', borderBottom: '1px solid #F1F5F9' }}>
                        🏢 {c.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600" style={{ padding: '16px 24px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>
                        📍 {c.address}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-500" style={{ padding: '16px 24px', fontSize: '13px', color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                        {c.isActive ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            운영 중
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200">
                            운영 종료 (숨김)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>
                        <button
                          disabled={actionLoading === `company-${c.id}`}
                          onClick={() => handleCompanyStatusToggle(c.id, c.isActive, c.name)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            c.isActive
                              ? 'bg-red-50 text-red-500 border-red-100 hover:bg-red-500 hover:text-white'
                              : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white'
                          }`}
                          style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          {actionLoading === `company-${c.id}`
                            ? '처리중...'
                            : c.isActive
                            ? '운영 종료'
                            : '운영 재개'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ========================================================
             2. 근로자 관리 탭
             ======================================================== */
          employments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm" style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
              등록된 근로자 고용 기록이 존재하지 않습니다.
            </div>
          ) : (
            <div className="w-full overflow-x-auto" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full border-collapse text-left text-sm text-slate-600" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100" style={{ backgroundColor: '#F8FAFC', fontSize: '11px', color: '#64748B' }}>
                  <tr>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>근로자 (이메일)</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>근무지</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>소속 부서 / 직책</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>계약일 / 퇴사일</th>
                    <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>상태</th>
                    <th className="px-6 py-4 text-center" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>상태 제어</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100" style={{ backgroundColor: '#FFFFFF' }}>
                  {employments.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                        <div className="font-bold text-slate-800" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{emp.user.name}</div>
                        <div className="text-xs text-slate-400 mt-1" style={{ fontSize: '11px', color: '#94A3B8' }}>{emp.user.email}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700" style={{ padding: '16px 24px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>
                        🏢 {emp.company.name}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600" style={{ padding: '16px 24px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>
                        {emp.department ? `${emp.department} · ` : ''}{emp.position || '직원'}
                      </td>
                      <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                        <div className="text-xs text-slate-500" style={{ fontSize: '12px', color: '#64748B' }}>계약: {formatDate(emp.createdAt)}</div>
                        {emp.endedAt && (
                          <div className="text-xs text-red-500 font-semibold mt-1" style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>
                            퇴사: {formatDate(emp.endedAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                        {emp.isActive ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            재직 중
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-500 border border-red-100">
                            퇴사 완료
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>
                        {emp.isActive ? (
                          <button
                            disabled={actionLoading === `employee-${emp.id}`}
                            onClick={() => handleEmployeeDeactivate(emp.id, emp.user.name)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition cursor-pointer"
                            style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            {actionLoading === `employee-${emp.id}` ? '퇴사처리 중...' : '퇴사 처리'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium" style={{ fontSize: '12px', color: '#94A3B8' }}>변경 불가</span>
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
