'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface AttendanceGridRecord {
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  workedMinutes: number | null;
}

interface EmployeeGridRow {
  employmentId: string;
  name: string;
  email: string;
  company: string;
  companyId: string;
  recordMap: Record<string, AttendanceGridRecord>;
}

interface GridData {
  year: number;
  month: number;
  days: number;
  startDate: string;
  endDate: string;
  employees: EmployeeGridRow[];
}

interface CompanyOption {
  id: string;
  name: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  normal:   { label: '정상',   bg: '#DCFCE7', text: '#166534', dot: '#22C55E' },
  late:     { label: '지각',   bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  absent:   { label: '결근',   bg: '#FFE4E6', text: '#9F1239', dot: '#F43F5E' },
  vacation: { label: '휴가',   bg: '#DBEAFE', text: '#1E3A8A', dot: '#3B82F6' },
  holiday:  { label: '공휴일', bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
};

function fmtTime(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtMinutes(min: number | null) {
  if (!min) return '-';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function AttendancePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [companyId, setCompanyId] = useState('all');
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [gridData, setGridData] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<CompanyOption[]>('/api/admin/companies')
      .then(setCompanies)
      .catch(() => {});
  }, []);

  const loadGrid = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { year, month };
      if (companyId !== 'all') params.companyId = companyId;
      const data = await apiFetch<GridData>('/api/admin/attendance/grid', { params });
      setGridData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [year, month, companyId]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  const downloadCSV = () => {
    if (!gridData) return;
    const days = Array.from({ length: gridData.days }, (_, i) => {
      const d = i + 1;
      return `${gridData.year}-${String(gridData.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    });
    const headers = [
      '이름', '이메일', '근무지',
      ...days.flatMap(d => [`${d} 상태`, `${d} 출근`, `${d} 퇴근`, `${d} 근무시간`]),
    ];
    const rows = gridData.employees.map(emp => {
      const dayData = days.flatMap(d => {
        const rec = emp.recordMap[d];
        if (!rec) return ['', '', '', ''];
        return [
          STATUS_CONFIG[rec.status]?.label ?? rec.status,
          fmtTime(rec.checkIn),
          fmtTime(rec.checkOut),
          fmtMinutes(rec.workedMinutes),
        ];
      });
      return [emp.name, emp.email, emp.company, ...dayData];
    });
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `근태현황_${gridData.year}년_${gridData.month}월.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const days = gridData ? Array.from({ length: gridData.days }, (_, i) => i + 1) : [];
  const yearOptions = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 1 + i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1E293B', margin: 0 }}>근태 현황</h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>전체 직원의 월별 출퇴근 기록을 확인하고 CSV로 내보낼 수 있습니다.</p>
        </div>
        <button
          onClick={downloadCSV}
          disabled={!gridData || loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '12px',
            backgroundColor: gridData && !loading ? '#2563EB' : '#E2E8F0',
            color: gridData && !loading ? '#FFFFFF' : '#94A3B8',
            fontSize: '13px', fontWeight: '700', border: 'none',
            cursor: gridData && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            boxShadow: gridData && !loading ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
          }}
        >
          <span>📥</span> CSV 다운로드
        </button>
      </div>

      {/* 필터 + 범례 */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#FFF', padding: '16px 20px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: '600', color: '#334155', outline: 'none', cursor: 'pointer' }}>
          {yearOptions.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: '600', color: '#334155', outline: 'none', cursor: 'pointer' }}>
          {monthOptions.map(m => <option key={m} value={m}>{m}월</option>)}
        </select>
        <select value={companyId} onChange={e => setCompanyId(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: '600', color: '#334155', outline: 'none', cursor: 'pointer', minWidth: '160px' }}>
          <option value="all">전체 근무지</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: '8px', flexWrap: 'wrap' }}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cfg.dot }} />
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>{cfg.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#CBD5E1' }} />
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>미기록</span>
          </div>
        </div>
      </div>

      {/* 그리드 */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: '12px' }}>
          <div style={{ width: '24px', height: '24px', border: '3px solid #E2E8F0', borderTop: '3px solid #2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#64748B', fontSize: '14px', fontWeight: '600' }}>데이터 불러오는 중...</span>
        </div>
      ) : gridData && gridData.employees.length > 0 ? (
        <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${240 + gridData.days * 40}px`, backgroundColor: '#FFF' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ position: 'sticky', left: 0, backgroundColor: '#F8FAFC', zIndex: 2, padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: '#64748B', textAlign: 'left', minWidth: '120px', borderRight: '1px solid #E2E8F0' }}>이름</th>
                <th style={{ position: 'sticky', left: 120, backgroundColor: '#F8FAFC', zIndex: 2, padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: '#64748B', textAlign: 'left', minWidth: '120px', borderRight: '2px solid #CBD5E1' }}>근무지</th>
                {days.map(d => {
                  const dateStr = `${gridData.year}-${String(gridData.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const dow = new Date(dateStr).getDay();
                  return (
                    <th key={d} style={{ padding: '8px 4px', fontSize: '11px', fontWeight: '700', color: dow === 0 ? '#EF4444' : dow === 6 ? '#3B82F6' : '#64748B', textAlign: 'center', minWidth: '36px', borderLeft: '1px solid #F1F5F9' }}>
                      <div>{d}</div>
                      <div style={{ fontSize: '9px', opacity: 0.7 }}>{'일월화수목금토'[dow]}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {gridData.employees.map((emp, rowIdx) => (
                <tr key={emp.employmentId} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: rowIdx % 2 === 0 ? '#FFF' : '#FAFAFA' }}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 1, backgroundColor: rowIdx % 2 === 0 ? '#FFF' : '#FAFAFA', padding: '10px 16px', borderRight: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', whiteSpace: 'nowrap' }}>{emp.name}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px', whiteSpace: 'nowrap', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.email}</div>
                  </td>
                  <td style={{ position: 'sticky', left: 120, zIndex: 1, backgroundColor: rowIdx % 2 === 0 ? '#FFF' : '#FAFAFA', padding: '10px 16px', borderRight: '2px solid #CBD5E1' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.company}</div>
                  </td>
                  {days.map(d => {
                    const dateStr = `${gridData.year}-${String(gridData.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const rec = emp.recordMap[dateStr];
                    const cfg = rec ? STATUS_CONFIG[rec.status] : null;
                    const cellKey = `${emp.employmentId}-${dateStr}`;
                    const isHov = hoveredCell === cellKey;
                    return (
                      <td key={d}
                        onMouseEnter={() => setHoveredCell(cellKey)}
                        onMouseLeave={() => setHoveredCell(null)}
                        style={{ padding: '4px', textAlign: 'center', borderLeft: '1px solid #F1F5F9', position: 'relative' }}
                      >
                        {rec && cfg ? (
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '8px', backgroundColor: cfg.bg,
                            margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'default', transition: 'transform 0.12s',
                            transform: isHov ? 'scale(1.25)' : 'scale(1)',
                            boxShadow: isHov ? `0 2px 8px ${cfg.dot}50` : 'none',
                          }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cfg.dot }} />
                          </div>
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#F8FAFC', margin: '0 auto' }} />
                        )}
                        {isHov && rec && cfg && (
                          <div style={{
                            position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
                            backgroundColor: '#1E293B', color: '#FFF', borderRadius: '10px',
                            padding: '8px 12px', fontSize: '11px', fontWeight: '500',
                            whiteSpace: 'nowrap', zIndex: 50, pointerEvents: 'none',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.2)', lineHeight: 1.6,
                          }}>
                            <div style={{ fontWeight: '700', marginBottom: '4px', color: cfg.dot }}>{cfg.label}</div>
                            <div>출근 {fmtTime(rec.checkIn)}</div>
                            <div>퇴근 {fmtTime(rec.checkOut)}</div>
                            <div>근무 {fmtMinutes(rec.workedMinutes)}</div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '48px', marginBottom: '16px' }}>📭</span>
          <p style={{ fontSize: '16px', fontWeight: '700', color: '#64748B', margin: 0 }}>해당 기간에 근태 데이터가 없습니다.</p>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '6px' }}>조건을 변경하거나 다른 월을 선택해보세요.</p>
        </div>
      )}
    </div>
  );
}
