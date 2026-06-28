'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface CompanySummary {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  activeEmployeeCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<CompanySummary[]>('/api/admin/companies');
      setCompanies(data);
    } catch (err: any) {
      setError(err.message || '근무지 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  // 선택된 근무지 필터링 로직
  const filteredCompanies = selectedCompanyId === 'all'
    ? companies
    : companies.filter(c => c.id === selectedCompanyId);

  // 동적 통계 계산 (필터링된 상태에 맞춰 동적 업데이트 제공)
  const totalEmployees = filteredCompanies.reduce((sum, c) => sum + c.activeEmployeeCount, 0);

  return (
    <div className="flex flex-col gap-8">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{ fontSize: '28px', fontWeight: '800', color: '#1E293B' }}>
            🏢 근무지 목록
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium" style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>
            등록된 전체 사업장 목록 및 실시간 활성 근로자 현황입니다.
          </p>
        </div>

        {/* 근무지 선택 필터 셀렉트 박스 */}
        <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap uppercase tracking-wider" style={{ fontSize: '11px', fontWeight: '700', color: '#64748B' }}>
            근무지 필터:
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 shadow-sm transition"
            style={{ 
              borderRadius: '12px', 
              border: '1px solid #CBD5E1', 
              padding: '10px 16px', 
              fontSize: '12px', 
              fontWeight: '600',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              cursor: 'pointer',
              minWidth: '180px'
            }}
          >
            <option value="all">전체 근무지 보기</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 요약 통계 카드 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        
        {/* 등록 근무지 요약 */}
        <div 
          className="rounded-2xl p-8 border border-slate-200 flex items-center justify-between"
          style={{ 
            backgroundColor: '#FFFFFF', 
            borderRadius: '16px', 
            border: '1px solid #E2E8F0', 
            padding: '32px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'between',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)'
          }}
        >
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.05em' }}>
              {selectedCompanyId === 'all' ? '총 등록 근무지' : '선택된 근무지'}
            </span>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-2" style={{ fontSize: '28px', fontWeight: '800', color: '#1E293B', marginTop: '8px' }}>
              {selectedCompanyId === 'all' ? `${companies.length}개소` : '1개소'}
            </h3>
          </div>
          <div 
            className="text-2xl rounded-2xl flex items-center justify-center shrink-0"
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '12px', 
              backgroundColor: '#EFF6FF', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '24px'
            }}
          >
            🏢
          </div>
        </div>

        {/* 활성 근로자 요약 */}
        <div 
          className="rounded-2xl p-8 border border-slate-200 flex items-center justify-between"
          style={{ 
            backgroundColor: '#FFFFFF', 
            borderRadius: '16px', 
            border: '1px solid #E2E8F0', 
            padding: '32px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'between',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)'
          }}
        >
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.05em' }}>
              {selectedCompanyId === 'all' ? '총 활성 근로자 수' : '해당 사업장 근로자 수'}
            </span>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-2" style={{ fontSize: '28px', fontWeight: '800', color: '#1E293B', marginTop: '8px' }}>
              {totalEmployees}명
            </h3>
          </div>
          <div 
            className="text-2xl rounded-2xl flex items-center justify-center shrink-0"
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '12px', 
              backgroundColor: '#EEF2F6', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '24px'
            }}
          >
            👥
          </div>
        </div>

      </div>

      {/* 목록 리스트 */}
      {loading ? (
        <div className="flex h-64 items-center justify-center" style={{ height: '256px', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl p-8 text-center text-red-500 border border-red-100 bg-white" style={{ padding: '32px', borderRadius: '16px', border: '1px solid #FEE2E2', backgroundColor: '#FFFFFF', textAlign: 'center', color: '#EF4444' }}>
          ⚠️ {error}
          <button onClick={loadCompanies} className="ml-4 text-xs font-bold text-blue-600 hover:underline ml-3">다시 시도</button>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="rounded-2xl p-16 text-center text-slate-400 text-sm bg-white border border-slate-200" style={{ padding: '64px', borderRadius: '16px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', textAlign: 'center', color: '#94A3B8' }}>
          일치하는 근무지가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredCompanies.map((c) => (
            <div 
              key={c.id} 
              className="rounded-2xl hover:shadow-lg transition-all duration-300 border border-slate-200 flex flex-col justify-between"
              style={{ 
                backgroundColor: '#FFFFFF', 
                borderRadius: '16px', 
                border: '1px solid #E2E8F0', 
                padding: '24px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'between',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01)'
              }}
            >
              <div className="flex flex-col gap-4">
                {/* 헤더 타이틀 및 배지 */}
                <div className="flex justify-between items-start gap-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <h4 className="text-base font-bold text-slate-800 truncate" style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: 0, maxWidth: '180px' }}>
                    {c.name}
                  </h4>
                  <span 
                    className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ 
                      flexShrink: 0,
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: c.activeEmployeeCount > 0 ? '#EFF6FF' : '#F1F5F9',
                      color: c.activeEmployeeCount > 0 ? '#2563EB' : '#64748B',
                      border: c.activeEmployeeCount > 0 ? '1px solid #DBEAFE' : '1px solid #E2E8F0'
                    }}
                  >
                    {c.activeEmployeeCount}명 근무 중
                  </span>
                </div>

                {/* 주소 정보 */}
                <div className="flex flex-col gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p className="text-xs text-slate-500 line-clamp-2" style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: '1.5', minHeight: '36px' }}>
                    📍 {c.address}
                  </p>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="mt-6" style={{ marginTop: '24px' }}>
                <Link
                  href={`/dashboard/companies/${c.id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition duration-200"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 0',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    textDecoration: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <span>근로자 현황 보기</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
