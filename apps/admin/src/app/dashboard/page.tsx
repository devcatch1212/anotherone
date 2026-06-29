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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

  // 필터링 + 검색 결합 로직
  const filteredCompanies = companies.filter(c => {
    const matchesFilter = selectedCompanyId === 'all' || c.id === selectedCompanyId;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalEmployees = filteredCompanies.reduce((sum, c) => sum + c.activeEmployeeCount, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-4 border-b border-slate-100" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{ fontSize: '28px', fontWeight: '800', color: '#1E293B' }}>
            🏢 근무지 목록
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium" style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
            등록된 전체 사업장 목록 및 실시간 활성 근로자 현황입니다.
          </p>
        </div>

        {/* 필터 및 검색, 뷰 스위치 통합 컨트롤 랙 */}
        <div className="flex flex-wrap items-center gap-3" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          
          {/* 실시간 퀵 검색바 */}
          <div className="relative" style={{ position: 'relative' }}>
            <span className="absolute left-3.5 top-3 text-slate-400" style={{ position: 'absolute', left: '14px', top: '11px', color: '#94A3B8', fontSize: '14px' }}>🔍</span>
            <input
              type="text"
              placeholder="근무지명, 주소 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 shadow-sm transition"
              style={{
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '10px 16px 10px 38px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                width: '220px',
                transition: 'all 0.2s'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 font-bold"
                style={{ position: 'absolute', right: '12px', top: '9px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* 근무지 선택 필터 셀렉트 박스 */}
          <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 shadow-sm transition"
              style={{ 
                borderRadius: '12px', 
                border: '1px solid #E2E8F0', 
                padding: '10px 16px', 
                fontSize: '12px', 
                fontWeight: '600',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                cursor: 'pointer',
                minWidth: '160px'
              }}
            >
              <option value="all">전체 근무지 필터</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 카드/리스트 뷰 토글 스위치 */}
          <div 
            className="flex items-center border border-slate-200 bg-slate-100 p-1"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              backgroundColor: '#F1F5F9', 
              border: '1px solid #E2E8F0', 
              borderRadius: '12px',
              padding: '4px'
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                viewMode === 'grid' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'grid' ? '#2563EB' : '#64748B',
                boxShadow: viewMode === 'grid' ? '0 1px 3px 0 rgba(0,0,0,0.05)' : 'none'
              }}
            >
              🗂️ 카드 뷰
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                viewMode === 'list' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'list' ? '#2563EB' : '#64748B',
                boxShadow: viewMode === 'list' ? '0 1px 3px 0 rgba(0,0,0,0.05)' : 'none'
              }}
            >
              📄 리스트 뷰
            </button>
          </div>

        </div>
      </div>

      {/* 요약 통계 카드 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* 등록 근무지 요약 */}
        <div 
          style={{ 
            backgroundColor: '#FFFFFF', 
            borderRadius: '16px', 
            border: '1px solid #E2E8F0', 
            padding: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)'
          }}
        >
          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.05em' }}>
              {selectedCompanyId === 'all' ? '총 등록 근무지' : '선택된 근무지'}
            </span>
            <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#1E293B', marginTop: '6px', margin: 0 }}>
              {selectedCompanyId === 'all' ? `${companies.length}개소` : '1개소'}
            </h3>
          </div>
          <div 
            style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '10px', 
              backgroundColor: '#EFF6FF', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '20px'
            }}
          >
            🏢
          </div>
        </div>

        {/* 활성 근로자 요약 */}
        <div 
          style={{ 
            backgroundColor: '#FFFFFF', 
            borderRadius: '16px', 
            border: '1px solid #E2E8F0', 
            padding: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)'
          }}
        >
          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.05em' }}>
              {selectedCompanyId === 'all' ? '총 활성 근로자 수' : '해당 사업장 근로자 수'}
            </span>
            <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#1E293B', marginTop: '6px', margin: 0 }}>
              {totalEmployees}명
            </h3>
          </div>
          <div 
            style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '10px', 
              backgroundColor: '#EEF2F6', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '20px'
            }}
          >
            👥
          </div>
        </div>

      </div>

      {/* 목록 리스트 */}
      {loading ? (
        <div style={{ height: '256px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div style={{ padding: '32px', borderRadius: '16px', border: '1px solid #FEE2E2', backgroundColor: '#FFFFFF', textAlign: 'center', color: '#EF4444' }}>
          ⚠️ {error}
          <button onClick={loadCompanies} className="ml-4 text-xs font-bold text-blue-600 hover:underline" style={{ border: 'none', background: 'none', cursor: 'pointer', marginLeft: '12px' }}>다시 시도</button>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div style={{ padding: '64px', borderRadius: '16px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
          일치하는 근무지가 없습니다.
        </div>
      ) : viewMode === 'grid' ? (
        /* 카드 뷰 모드 (콤팩트 다이어트 레이아웃) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {filteredCompanies.map((c) => (
            <div 
              key={c.id} 
              className="group rounded-2xl border border-slate-200 flex flex-col justify-between"
              style={{ 
                backgroundColor: '#FFFFFF', 
                borderRadius: '16px', 
                border: '1px solid #E2E8F0', 
                padding: '20px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01)',
                transition: 'all 0.25s ease-in-out',
              }}
            >
              <div>
                {/* 헤더 타이틀 및 배지 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#1E293B', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                    {c.name}
                  </h4>
                  <span 
                    style={{ 
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      fontSize: '10.5px',
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
                <p style={{ fontSize: '12px', color: '#64748B', margin: '12px 0 0 0', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                  📍 {c.address}
                </p>
              </div>

              {/* 액션 버튼 */}
              <div style={{ marginTop: '16px' }}>
                <Link
                  href={`/dashboard/companies/${c.id}`}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px 0',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    backgroundColor: '#F8FAFC',
                    color: '#475569',
                    border: '1px solid #F1F5F9',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  className="hover:bg-slate-100 hover:text-slate-800"
                >
                  <span>근로자 현황 보기</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 리스트 뷰 모드 (테이블형 로우 리스트) */
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.02)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>근무지명</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>위치 주소</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>근무 상태</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((c) => (
                  <tr 
                    key={c.id} 
                    style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s' }}
                    className="hover:bg-slate-50/50"
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{c.name}</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '13px', color: '#64748B' }}>📍 {c.address}</span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span 
                        style={{ 
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: c.activeEmployeeCount > 0 ? '#EFF6FF' : '#F1F5F9',
                          color: c.activeEmployeeCount > 0 ? '#2563EB' : '#64748B',
                          border: c.activeEmployeeCount > 0 ? '1px solid #DBEAFE' : '1px solid #E2E8F0',
                          display: 'inline-block'
                        }}
                      >
                        {c.activeEmployeeCount}명 활성
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <Link
                        href={`/dashboard/companies/${c.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                        className="hover:bg-slate-200 hover:text-slate-800"
                      >
                        <span>현황 보기</span>
                        <span>→</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
