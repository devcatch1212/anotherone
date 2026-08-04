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

interface AppConfig {
  latestVersionAndroid: string;
  minVersionAndroid: string;
  latestVersionIos: string;
  minVersionIos: string;
  forceUpdate: boolean;
  maintenanceMode: boolean;
}

interface SettingsData {
  companies: Company[];
  employments: Employment[];
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'employee' | 'version'>('company');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employments, setEmployments] = useState<Employment[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 설정 통합 데이터와 버전 관리를 모두 병렬 로드
      const [data, config] = await Promise.all([
        apiFetch<SettingsData>('/api/admin/settings-data'),
        apiFetch<AppConfig>('/api/admin/app-config').catch(() => null), // 실패 시 null 방어
      ]);

      setCompanies(data.companies);
      setEmployments(data.employments);
      if (config) {
        setAppConfig(config);
      }
    } catch (err: any) {
      setError(err.message || '설정 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appConfig) return;

    const confirmMsg = `📱 앱 버전 및 시스템 설정을 저장하시겠습니까?\n\n` +
      `• Android: 최소 v${appConfig.minVersionAndroid} / 최신 v${appConfig.latestVersionAndroid}\n` +
      `• iOS: 최소 v${appConfig.minVersionIos} / 최신 v${appConfig.latestVersionIos}\n` +
      `• 점검 모드: ${appConfig.maintenanceMode ? '🚨 활성화 (근로자 앱 접속 제한)' : '비활성화 (정상 운영)'}\n\n` +
      `저장 시 모바일 앱 사용자의 버전 검증 및 서비스 접속에 즉각 반영됩니다.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setConfigSaving(true);
      setSaveSuccess(false);
      const updated = await apiFetch<AppConfig>('/api/admin/app-config', {
        method: 'PATCH',
        body: JSON.stringify(appConfig),
      });
      setAppConfig(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000); // 3초 뒤 성공 알림 숨김
    } catch (err: any) {
      alert(err.message || '설정을 저장하지 못했습니다.');
    } finally {
      setConfigSaving(false);
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
          시스템 설정 및 관리
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
        <button
          onClick={() => setActiveTab('version')}
          className={`pb-3 text-sm font-bold transition cursor-pointer border-b-2 ${
            activeTab === 'version'
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
            borderBottom: activeTab === 'version' ? '2px solid #2563EB' : '2px solid transparent',
            color: activeTab === 'version' ? '#2563EB' : '#94A3B8'
          }}
        >
          📱 앱 버전 및 시스템 설정
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
        ) : activeTab === 'employee' ? (
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
                        <div className="text-xs text-slate-400 mt-1" style={{ fontSize: '11px', color: '#94A3B8' }}>{emp.user.email || `(기기 계정) ${emp.user.name}`}</div>
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
        ) : (
          /* ========================================================
             3. 앱 버전 및 시스템 설정 탭
             ======================================================== */
          appConfig && (
            <form onSubmit={handleConfigSave} className="p-8 flex flex-col gap-8" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* 시스템 상태 긴급 토글 */}
              <div className="border-b border-slate-100 pb-6" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '24px' }}>
                <h3 className="text-base font-bold text-slate-800 mb-4" style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', marginBottom: '16px' }}>
                  🚨 시스템 상태 긴급 제어
                </h3>
                <div className="flex flex-col md:flex-row gap-6" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                  <label className="flex items-center gap-3 cursor-pointer select-none" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={appConfig.maintenanceMode}
                      onChange={(e) => setAppConfig({ ...appConfig, maintenanceMode: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-800" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>🔧 서비스 점검 모드 활성화</span>
                      <p className="text-xs text-slate-400 mt-1" style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>점검 모드 활성화 시 일반 근로자용 모바일 앱 사용이 제한됩니다.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 모바일 OS별 버전 관리 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
                
                {/* 1. Android 버전 설정 */}
                <div className="p-6 rounded-xl border border-slate-100 bg-slate-50/50" style={{ padding: '24px', borderRadius: '12px', border: '1px solid #F1F5F9', backgroundColor: '#FAFBFC' }}>
                  <h4 className="text-sm font-extrabold text-slate-800 mb-4" style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', marginBottom: '16px' }}>🤖 Google Play 스토어 (Android)</h4>
                  <div className="flex flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="text-xs font-bold text-slate-500" style={{ fontSize: '11px', fontWeight: '700', color: '#64748B' }}>최소 동작 필요 버전 (Min Version)</label>
                      <input
                        type="text"
                        required
                        value={appConfig.minVersionAndroid}
                        onChange={(e) => setAppConfig({ ...appConfig, minVersionAndroid: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 text-sm font-semibold"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '600' }}
                        placeholder="예: 1.0.0"
                      />
                      <p className="text-[10px] text-slate-400" style={{ fontSize: '10px', color: '#94A3B8' }}>이 버전보다 낮은 구버전은 무조건 강제 업데이트가 요구됩니다.</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="text-xs font-bold text-slate-500" style={{ fontSize: '11px', fontWeight: '700', color: '#64748B' }}>최신 배포 권장 버전 (Latest Version)</label>
                      <input
                        type="text"
                        required
                        value={appConfig.latestVersionAndroid}
                        onChange={(e) => setAppConfig({ ...appConfig, latestVersionAndroid: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 text-sm font-semibold"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '600' }}
                        placeholder="예: 1.2.0"
                      />
                      <p className="text-[10px] text-slate-400" style={{ fontSize: '10px', color: '#94A3B8' }}>최소 버전보다는 높지만 최신 버전보다 낮은 사용자에게 선택 업데이트를 제안합니다.</p>
                    </div>
                  </div>
                </div>

                {/* 2. iOS 버전 설정 */}
                <div className="p-6 rounded-xl border border-slate-100 bg-slate-50/50" style={{ padding: '24px', borderRadius: '12px', border: '1px solid #F1F5F9', backgroundColor: '#FAFBFC' }}>
                  <h4 className="text-sm font-extrabold text-slate-800 mb-4" style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', marginBottom: '16px' }}>🍎 Apple App Store (iOS)</h4>
                  <div className="flex flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="text-xs font-bold text-slate-500" style={{ fontSize: '11px', fontWeight: '700', color: '#64748B' }}>최소 동작 필요 버전 (Min Version)</label>
                      <input
                        type="text"
                        required
                        value={appConfig.minVersionIos}
                        onChange={(e) => setAppConfig({ ...appConfig, minVersionIos: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 text-sm font-semibold"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '600' }}
                        placeholder="예: 1.0.0"
                      />
                      <p className="text-[10px] text-slate-400" style={{ fontSize: '10px', color: '#94A3B8' }}>이 버전보다 낮은 구버전은 무조건 강제 업데이트가 요구됩니다.</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="text-xs font-bold text-slate-500" style={{ fontSize: '11px', fontWeight: '700', color: '#64748B' }}>최신 배포 권장 버전 (Latest Version)</label>
                      <input
                        type="text"
                        required
                        value={appConfig.latestVersionIos}
                        onChange={(e) => setAppConfig({ ...appConfig, latestVersionIos: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 text-sm font-semibold"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '600' }}
                        placeholder="예: 1.2.0"
                      />
                      <p className="text-[10px] text-slate-400" style={{ fontSize: '10px', color: '#94A3B8' }}>최소 버전보다는 높지만 최신 버전보다 낮은 사용자에게 선택 업데이트를 제안합니다.</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* 하단 제어 버튼 */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                {saveSuccess && (
                  <span className="text-xs font-bold text-emerald-600 animate-pulse" style={{ fontSize: '12px', fontWeight: '700', color: '#10B981' }}>
                    ✔ 설정 데이터가 시스템에 안전하게 반영되었습니다!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={configSaving}
                  className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer"
                  style={{
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#FFFFFF',
                    backgroundColor: '#2563EB',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  {configSaving ? '저장 중...' : '시스템 설정 저장'}
                </button>
              </div>

            </form>
          )
        )}
      </div>
    </div>
  );
}
