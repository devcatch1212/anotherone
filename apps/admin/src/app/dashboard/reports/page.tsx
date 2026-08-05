'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface Company { id: string; name: string; }

interface EmployeeStat {
  employmentId: string;
  name: string;
  email: string;
  company: string;
  companyId: string;
  position: string;
  wageType: string;
  scheduledDays: number;
  workDays: number;
  attendanceRate: number;
  totalHours: number;
  overtimeHours: number;
  nightHours: number;
  normalCount: number;
  lateCount: number;
  absentCount: number;
  vacationCount: number;
}

interface MonthlyReport {
  year: number;
  month: number;
  summary: {
    totalEmployees: number;
    avgWorkDays: number;
    avgTotalHours: number;
    totalLateCount: number;
    totalAbsentCount: number;
    totalOvertimeHours: number;
  };
  employees: EmployeeStat[];
}

interface OvertimeAlert {
  employmentId: string;
  name: string;
  email: string;
  company: string;
  position: string;
  weeklyHours: number;
  overtimeHours: number;
  remainHours: number;
  alertLevel: 'ok' | 'warning' | 'danger';
  weekStart: string;
  weekEnd: string;
  recordCount: number;
}

interface WeeklyAlertData {
  weekStart: string;
  weekEnd: string;
  summary: { dangerCount: number; warningCount: number; okCount: number };
  alerts: OvertimeAlert[];
}

export default function ReportsPage() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<'monthly' | 'overtime'>('monthly');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [companyId, setCompanyId] = useState('all');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [overtimeFilter, setOvertimeFilter] = useState<'all' | 'warning' | 'danger'>('all');
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [alertData, setAlertData] = useState<WeeklyAlertData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<keyof EmployeeStat>('totalHours');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    apiFetch<Company[]>('/api/admin/companies').then(setCompanies).catch(() => {});
  }, []);

  const loadMonthlyReport = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const params: Record<string, any> = { year, month };
      if (companyId !== 'all') params.companyId = companyId;
      const res = await apiFetch<MonthlyReport>('/api/admin/reports/monthly', { params });
      setReport(res);
    } catch (e: any) { setError(e.message || '리포트 로드 실패'); }
    finally { setLoading(false); }
  }, [year, month, companyId]);

  const loadOvertimeAlert = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const params: Record<string, any> = {};
      if (companyId !== 'all') params.companyId = companyId;
      const res = await apiFetch<WeeklyAlertData>('/api/admin/reports/weekly-overtime-alert', { params });
      setAlertData(res);
    } catch (e: any) { setError(e.message || '경보 데이터 로드 실패'); }
    finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => {
    if (activeTab === 'monthly') loadMonthlyReport();
    else loadOvertimeAlert();
  }, [activeTab, loadMonthlyReport, loadOvertimeAlert]);

  const handleSort = (key: keyof EmployeeStat) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedEmployees = report
    ? [...report.employees].sort((a, b) => {
        const av = a[sortKey] as number;
        const bv = b[sortKey] as number;
        return sortDir === 'asc' ? av - bv : bv - av;
      })
    : [];

  const filteredAlerts = alertData
    ? alertData.alerts.filter((a) => overtimeFilter === 'all' || a.alertLevel === overtimeFilter)
    : [];

  const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => (
    <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden', marginTop: '4px' }}>
      <div style={{ height: '100%', width: `${Math.min(100, max > 0 ? (value / max) * 100 : 0)}%`, backgroundColor: color, borderRadius: '9999px' }} />
    </div>
  );

  const SortIcon = ({ col }: { col: keyof EmployeeStat }) => (
    <span style={{ opacity: sortKey === col ? 1 : 0.3, fontSize: '10px', marginLeft: '4px' }}>
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  const tabBtnStyle = (tab: 'monthly' | 'overtime') => ({
    padding: '9px 18px', fontSize: '13px', fontWeight: '700' as const, borderRadius: '10px', cursor: 'pointer' as const,
    border: 'none', backgroundColor: activeTab === tab ? '#2563EB' : '#F1F5F9', color: activeTab === tab ? '#FFF' : '#64748B',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* 헤더 */}
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1E293B', margin: 0 }}>📈 근무 통계 리포트</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '6px', marginBottom: 0 }}>월별 근무 통계와 주 52시간 초과 근로 경보를 한눈에 확인하세요.</p>
      </div>

      {/* 필터 바 */}
      <div style={{ backgroundColor: '#FFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '18px 24px', display: 'flex', flexWrap: 'wrap' as const, gap: '10px', alignItems: 'center' }}>
        <button onClick={() => setActiveTab('monthly')} style={tabBtnStyle('monthly')}>📊 월별 통계</button>
        <button onClick={() => setActiveTab('overtime')} style={tabBtnStyle('overtime')}>🚨 52시간 경보</button>

        <div style={{ width: '1px', height: '28px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />

        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '600' }}>
          <option value="all">전체 근무지</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {activeTab === 'monthly' && (
          <>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '600' }}>
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '600' }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
            </select>
          </>
        )}

        {activeTab === 'overtime' && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {([['all', '전체'], ['warning', '⚠️ 주의'], ['danger', '🚨 위험']] as const).map(([f, label]) => (
              <button key={f} onClick={() => setOvertimeFilter(f)}
                style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer',
                  border: '1px solid', backgroundColor: overtimeFilter === f ? (f === 'danger' ? '#FEF2F2' : f === 'warning' ? '#FFFBEB' : '#EFF6FF') : '#F8FAFC',
                  color: overtimeFilter === f ? (f === 'danger' ? '#EF4444' : f === 'warning' ? '#D97706' : '#2563EB') : '#94A3B8',
                  borderColor: overtimeFilter === f ? (f === 'danger' ? '#FECACA' : f === 'warning' ? '#FDE68A' : '#BFDBFE') : '#E2E8F0' }}>
                {label}
              </button>
            ))}
          </div>
        )}

        <button onClick={() => activeTab === 'monthly' ? loadMonthlyReport() : loadOvertimeAlert()}
          style={{ marginLeft: 'auto', padding: '8px 18px', fontSize: '13px', fontWeight: '700', borderRadius: '8px', border: 'none', backgroundColor: '#0F172A', color: '#FFF', cursor: 'pointer' }}>
          🔄 새로고침
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <div style={{ width: '36px', height: '36px', border: '4px solid #DBEAFE', borderTop: '4px solid #2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
      {error && <div style={{ padding: '14px 20px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#EF4444', fontSize: '13px' }}>⚠️ {error}</div>}

      {/* ── 월별 통계 ── */}
      {!loading && !error && activeTab === 'monthly' && report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
            {[
              { label: '대상 근로자', value: `${report.summary.totalEmployees}명`, c: '#2563EB', bg: '#EFF6FF', bc: '#DBEAFE' },
              { label: '평균 출근 일수', value: `${report.summary.avgWorkDays}일`, c: '#059669', bg: '#ECFDF5', bc: '#A7F3D0' },
              { label: '평균 근무 시간', value: `${report.summary.avgTotalHours}h`, c: '#7C3AED', bg: '#F5F3FF', bc: '#DDD6FE' },
              { label: '총 연장 시간', value: `${report.summary.totalOvertimeHours}h`, c: '#D97706', bg: '#FFFBEB', bc: '#FDE68A' },
              { label: '지각 누계', value: `${report.summary.totalLateCount}건`, c: '#EA580C', bg: '#FFF7ED', bc: '#FED7AA' },
              { label: '결근 누계', value: `${report.summary.totalAbsentCount}건`, c: '#DC2626', bg: '#FEF2F2', bc: '#FECACA' },
            ].map((k) => (
              <div key={k.label} style={{ backgroundColor: k.bg, border: `1px solid ${k.bc}`, borderRadius: '14px', padding: '18px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: k.c, textTransform: 'uppercase' as const, marginBottom: '8px' }}>{k.label}</div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: k.c }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* 테이블 */}
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', margin: 0 }}>직원별 근무 통계</h3>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>{report.year}년 {report.month}월 · {report.employees.length}명</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
                <thead style={{ backgroundColor: '#F8FAFC', fontSize: '11px', fontWeight: '700', color: '#64748B' }}>
                  <tr>
                    <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>근로자</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>근무지 / 직책</th>
                    {([['workDays','출근일'],['attendanceRate','출근율'],['totalHours','근무h'],['overtimeHours','연장h'],['lateCount','지각'],['absentCount','결근']] as [keyof EmployeeStat,string][]).map(([key,label]) => (
                      <th key={key} onClick={() => handleSort(key)} style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '1px solid #E2E8F0', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                        {label}<SortIcon col={key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedEmployees.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>데이터가 없습니다.</td></tr>
                  ) : sortedEmployees.map((e) => {
                    const maxH = Math.max(...sortedEmployees.map((x) => x.totalHours), 1);
                    return (
                      <tr key={e.employmentId} style={{ borderBottom: '1px solid #F8FAFC' }}>
                        <td style={{ padding: '13px 20px' }}>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: '#1E293B' }}>{e.name}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{e.email || '기기 계정'}</div>
                        </td>
                        <td style={{ padding: '13px 20px' }}>
                          <div style={{ fontWeight: '600', fontSize: '12px', color: '#475569' }}>🏢 {e.company}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{e.position}</div>
                        </td>
                        <td style={{ padding: '13px 14px', textAlign: 'center' }}>
                          <span style={{ fontWeight: '800', fontSize: '14px', color: '#1E293B' }}>{e.workDays}</span>
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>/{e.scheduledDays}일</span>
                        </td>
                        <td style={{ padding: '13px 14px', textAlign: 'center', minWidth: '80px' }}>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: e.attendanceRate >= 90 ? '#059669' : e.attendanceRate >= 70 ? '#D97706' : '#DC2626' }}>{e.attendanceRate}%</div>
                          <Bar value={e.attendanceRate} max={100} color={e.attendanceRate >= 90 ? '#10B981' : e.attendanceRate >= 70 ? '#F59E0B' : '#EF4444'} />
                        </td>
                        <td style={{ padding: '13px 14px', textAlign: 'center', minWidth: '80px' }}>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: '#1E293B' }}>{e.totalHours}h</div>
                          <Bar value={e.totalHours} max={maxH} color="#6366F1" />
                        </td>
                        <td style={{ padding: '13px 14px', textAlign: 'center' }}>
                          {e.overtimeHours > 0 ? <span style={{ fontWeight: '700', fontSize: '12px', color: '#D97706', backgroundColor: '#FFFBEB', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #FDE68A' }}>{e.overtimeHours}h</span> : <span style={{ color: '#CBD5E1', fontSize: '12px' }}>-</span>}
                        </td>
                        <td style={{ padding: '13px 14px', textAlign: 'center' }}>
                          {e.lateCount > 0 ? <span style={{ fontWeight: '700', fontSize: '12px', color: '#EA580C', backgroundColor: '#FFF7ED', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #FED7AA' }}>{e.lateCount}회</span> : <span style={{ color: '#CBD5E1', fontSize: '12px' }}>-</span>}
                        </td>
                        <td style={{ padding: '13px 14px', textAlign: 'center' }}>
                          {e.absentCount > 0 ? <span style={{ fontWeight: '700', fontSize: '12px', color: '#DC2626', backgroundColor: '#FEF2F2', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #FECACA' }}>{e.absentCount}회</span> : <span style={{ color: '#CBD5E1', fontSize: '12px' }}>-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 52시간 경보 ── */}
      {!loading && !error && activeTab === 'overtime' && alertData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
            <div style={{ backgroundColor: '#FFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '18px 22px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', marginBottom: '8px' }}>조회 기간</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>{alertData.weekStart}</div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>~ {alertData.weekEnd}</div>
            </div>
            <div style={{ backgroundColor: '#FEF2F2', borderRadius: '14px', border: '1px solid #FECACA', padding: '18px 22px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#DC2626', marginBottom: '8px' }}>🚨 위험 (52h 초과)</div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: '#DC2626' }}>{alertData.summary.dangerCount}<span style={{ fontSize: '14px', marginLeft: '4px' }}>명</span></div>
            </div>
            <div style={{ backgroundColor: '#FFFBEB', borderRadius: '14px', border: '1px solid #FDE68A', padding: '18px 22px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#D97706', marginBottom: '8px' }}>⚠️ 주의 (48~52h)</div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: '#D97706' }}>{alertData.summary.warningCount}<span style={{ fontSize: '14px', marginLeft: '4px' }}>명</span></div>
            </div>
            <div style={{ backgroundColor: '#ECFDF5', borderRadius: '14px', border: '1px solid #A7F3D0', padding: '18px 22px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#059669', marginBottom: '8px' }}>✅ 정상</div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: '#059669' }}>{alertData.summary.okCount}<span style={{ fontSize: '14px', marginLeft: '4px' }}>명</span></div>
            </div>
          </div>

          {/* 법률 경고 배너 */}
          {(alertData.summary.dangerCount > 0 || alertData.summary.warningCount > 0) && (
            <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px', padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>⚖️</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#92400E' }}>근로기준법 제53조 — 연장근로 한도 주 52시간</div>
                <div style={{ fontSize: '12px', color: '#B45309', marginTop: '3px', lineHeight: '1.6' }}>
                  법정 한도(52시간)를 초과하거나 근접한 근로자가 있습니다. 즉시 근무 일정을 조정하세요. 위반 시 2년 이하 징역 또는 2천만원 이하 벌금이 부과될 수 있습니다.
                </div>
              </div>
            </div>
          )}

          {/* 경보 테이블 */}
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', margin: 0 }}>주간 근로시간 현황</h3>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>주 52시간 기준 · {filteredAlerts.length}명</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                <thead style={{ backgroundColor: '#F8FAFC', fontSize: '11px', fontWeight: '700', color: '#64748B' }}>
                  <tr>
                    <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>근로자</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>근무지</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #E2E8F0' }}>이번 주 근무</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #E2E8F0' }}>52h까지</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #E2E8F0', minWidth: '180px' }}>진행률</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #E2E8F0' }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                      {overtimeFilter !== 'all' ? '해당 조건의 근로자가 없습니다.' : '모든 근로자가 52시간 이내로 정상입니다. ✅'}
                    </td></tr>
                  ) : filteredAlerts.map((a) => {
                    const pct = Math.min(100, (a.weeklyHours / 52) * 100);
                    const barColor = a.alertLevel === 'danger' ? '#EF4444' : a.alertLevel === 'warning' ? '#F59E0B' : '#10B981';
                    const rowBg = a.alertLevel === 'danger' ? '#FFFAFA' : a.alertLevel === 'warning' ? '#FFFDF5' : '#FFF';
                    return (
                      <tr key={a.employmentId} style={{ borderBottom: '1px solid #F8FAFC', backgroundColor: rowBg }}>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: '#1E293B' }}>{a.name}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{a.email || '기기 계정'}</div>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ fontWeight: '600', fontSize: '12px', color: '#475569' }}>🏢 {a.company}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{a.position}</div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ fontWeight: '900', fontSize: '20px', color: a.alertLevel === 'danger' ? '#DC2626' : a.alertLevel === 'warning' ? '#D97706' : '#1E293B' }}>{a.weeklyHours}h</span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {a.alertLevel === 'danger'
                            ? <span style={{ fontWeight: '700', fontSize: '12px', color: '#DC2626' }}>🚨 {(a.weeklyHours - 52).toFixed(1)}h 초과</span>
                            : <span style={{ fontWeight: '700', fontSize: '13px', color: '#475569' }}>{a.remainHours}h 남음</span>}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '8px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: '9999px' }} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: barColor, minWidth: '34px', textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {a.alertLevel === 'danger' && <span style={{ fontWeight: '700', fontSize: '11px', color: '#DC2626', backgroundColor: '#FEF2F2', padding: '4px 10px', borderRadius: '9999px', border: '1px solid #FECACA' }}>🚨 위험</span>}
                          {a.alertLevel === 'warning' && <span style={{ fontWeight: '700', fontSize: '11px', color: '#D97706', backgroundColor: '#FFFBEB', padding: '4px 10px', borderRadius: '9999px', border: '1px solid #FDE68A' }}>⚠️ 주의</span>}
                          {a.alertLevel === 'ok' && <span style={{ fontWeight: '700', fontSize: '11px', color: '#059669', backgroundColor: '#ECFDF5', padding: '4px 10px', borderRadius: '9999px', border: '1px solid #A7F3D0' }}>✅ 정상</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
