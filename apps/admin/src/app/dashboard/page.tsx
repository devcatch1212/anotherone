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

interface TodayAttendanceDetail {
  employmentId: string;
  userId: string;
  name: string;
  email: string | null;
  companyId: string;
  companyName: string;
  status: 'checkedIn' | 'late' | 'notCheckedIn' | 'onLeave';
  statusLabel: string;
  checkIn: string | null;
  checkOut: string | null;
  workedMinutes: number | null;
}

interface TodayStatus {
  date: string;
  total: number;
  checkedIn: number;
  late: number;
  notCheckedIn: number;
  onLeave: number;
  employees?: TodayAttendanceDetail[];
}

export default function DashboardPage() {
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);

  // 실시간 관제 카드 클릭 상세 모달 상태
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalFilter, setDetailModalFilter] = useState<'all' | 'checkedIn' | 'late' | 'notCheckedIn' | 'onLeave'>('all');

  const openDetailModal = (filter: 'all' | 'checkedIn' | 'late' | 'notCheckedIn' | 'onLeave') => {
    setDetailModalFilter(filter);
    setDetailModalOpen(true);
  };

  // 근무지 페이징 상태
  const [companyPage, setCompanyPage] = useState<number>(1);
  const [companyPageSize, setCompanyPageSize] = useState<number>(12);

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

  // 선택된 근무지에 맞춰 오늘의 근태 현황 갱신
  useEffect(() => {
    const url = selectedCompanyId && selectedCompanyId !== 'all'
      ? `/api/admin/attendance/today?companyId=${selectedCompanyId}`
      : '/api/admin/attendance/today';
    apiFetch<TodayStatus>(url)
      .then(setTodayStatus)
      .catch(() => {});
  }, [selectedCompanyId]);

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
            근무지 목록
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCompanyPage(1);
              }}
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
                onClick={() => {
                  setSearchQuery('');
                  setCompanyPage(1);
                }}
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
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setCompanyPage(1);
              }}
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

          {/* 페이지당 표시 개수 */}
          <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={companyPageSize}
              onChange={(e) => {
                setCompanyPageSize(Number(e.target.value));
                setCompanyPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 shadow-sm transition"
              style={{ 
                borderRadius: '12px', 
                border: '1px solid #E2E8F0', 
                padding: '10px 16px', 
                fontSize: '12px', 
                fontWeight: '600',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              {[12, 24, 48, 96].map(s => (
                <option key={s} value={s}>{s}개씩 보기</option>
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
              카드 뷰
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
              리스트 뷰
            </button>
          </div>

        </div>
      </div>

      {/* 오늘의 근태 & 사업장 핵심 KPI 통합 대시보드 */}
      {todayStatus && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.01)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>실시간 관제 및 근태 현황</span>
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: '4px 0 0 0' }}>
                {todayStatus.date} KST 기준 · {selectedCompanyId === 'all' ? '전체 사업장' : '선택 사업장'} 총 {todayStatus.total}명 대상
              </p>
            </div>
            <Link
              href="/dashboard/attendance"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                fontSize: '12px',
                fontWeight: '700',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              전체 근태 대장 보기 →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
            {/* 총 등록 근무지 */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B' }}>등록 근무지</span>
                <span style={{ fontSize: '16px' }}>🏢</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#0F172A', lineHeight: 1 }}>
                {selectedCompanyId === 'all' ? companies.length : 1}<span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', marginLeft: '2px' }}>개소</span>
              </div>
            </div>

            {/* 총 근로자 수 */}
            <div
              onClick={() => openDetailModal('all')}
              className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>총 근로자</span>
                <span style={{ fontSize: '16px' }}>👥</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#0F172A', lineHeight: 1 }}>
                  {todayStatus.total}<span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', marginLeft: '2px' }}>명</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '6px' }}>
                  상세 🔍
                </span>
              </div>
            </div>

            {/* 출근 완료 */}
            <div
              onClick={() => openDetailModal('checkedIn')}
              className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#15803D' }}>출근 완료</span>
                <span style={{ fontSize: '16px' }}>✅</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#166534', lineHeight: 1 }}>
                  {todayStatus.checkedIn}<span style={{ fontSize: '12px', fontWeight: '700', color: '#15803D', marginLeft: '2px' }}>명</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#166534', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '6px' }}>
                  상세 🔍
                </span>
              </div>
            </div>

            {/* 지각 */}
            <div
              onClick={() => openDetailModal('late')}
              className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              style={{
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#B45309' }}>지각</span>
                <span style={{ fontSize: '16px' }}>⚠️</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#92400E', lineHeight: 1 }}>
                  {todayStatus.late}<span style={{ fontSize: '12px', fontWeight: '700', color: '#B45309', marginLeft: '2px' }}>명</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#92400E', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '6px' }}>
                  상세 🔍
                </span>
              </div>
            </div>

            {/* 미출근 */}
            <div
              onClick={() => openDetailModal('notCheckedIn')}
              className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              style={{
                backgroundColor: '#FFF1F2',
                border: '1px solid #FECDD3',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#BE123C' }}>미출근</span>
                <span style={{ fontSize: '16px' }}>🔴</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#9F1239', lineHeight: 1 }}>
                  {todayStatus.notCheckedIn}<span style={{ fontSize: '12px', fontWeight: '700', color: '#BE123C', marginLeft: '2px' }}>명</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#9F1239', backgroundColor: '#FFE4E6', padding: '2px 8px', borderRadius: '6px' }}>
                  상세 🔍
                </span>
              </div>
            </div>

            {/* 휴가 */}
            <div
              onClick={() => openDetailModal('onLeave')}
              className="group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#1D4ED8' }}>휴가</span>
                <span style={{ fontSize: '16px' }}>🏖️</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#1E3A8A', lineHeight: 1 }}>
                  {todayStatus.onLeave}<span style={{ fontSize: '12px', fontWeight: '700', color: '#1D4ED8', marginLeft: '2px' }}>명</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#1E3A8A', backgroundColor: '#DBEAFE', padding: '2px 8px', borderRadius: '6px' }}>
                  상세 🔍
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

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
      ) : (
        <>
          {viewMode === 'grid' ? (
            /* 카드 뷰 모드 (콤팩트 다이어트 레이아웃) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {filteredCompanies.slice((companyPage - 1) * companyPageSize, companyPage * companyPageSize).map((c) => (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                        fontWeight: '800',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #DBEAFE',
                        flexShrink: 0
                      }}>
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.name}
                          </h4>
                          <span 
                            style={{ 
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: c.activeEmployeeCount > 0 ? '#DCFCE7' : '#F1F5F9',
                              color: c.activeEmployeeCount > 0 ? '#15803D' : '#64748B',
                              border: c.activeEmployeeCount > 0 ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {c.activeEmployeeCount}명 활성
                          </span>
                        </div>
                      </div>
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
                    {filteredCompanies.slice((companyPage - 1) * companyPageSize, companyPage * companyPageSize).map((c) => (
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

          {/* 근무지 목록 하단 페이징 바 */}
          {filteredCompanies.length > 0 && (() => {
            const totalCount = filteredCompanies.length;
            const totalPages = Math.ceil(totalCount / companyPageSize) || 1;
            const startIndex = (companyPage - 1) * companyPageSize;
            const endIndex = Math.min(startIndex + companyPageSize, totalCount);

            return (
              <div 
                className="flex items-center justify-between px-6 py-4 mt-4 rounded-2xl border border-slate-200 bg-white"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 24px',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  marginTop: '16px'
                }}
              >
                <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>
                  총 <strong style={{ color: '#1E293B' }}>{totalCount}</strong>개 근무지 중{' '}
                  <strong style={{ color: '#1E293B' }}>{totalCount > 0 ? startIndex + 1 : 0}-{endIndex}</strong>개 표시
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setCompanyPage(p => Math.max(1, p - 1))}
                    disabled={companyPage === 1}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: companyPage === 1 ? '#F1F5F9' : '#FFFFFF',
                      color: companyPage === 1 ? '#94A3B8' : '#334155',
                      cursor: companyPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ← 이전
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pNum => (
                    <button
                      key={pNum}
                      onClick={() => setCompanyPage(pNum)}
                      style={{
                        width: '32px',
                        height: '32px',
                        fontSize: '13px',
                        fontWeight: pNum === companyPage ? '700' : '600',
                        borderRadius: '8px',
                        border: pNum === companyPage ? 'none' : '1px solid #E2E8F0',
                        backgroundColor: pNum === companyPage ? '#2563EB' : '#FFFFFF',
                        color: pNum === companyPage ? '#FFFFFF' : '#334155',
                        cursor: 'pointer',
                        boxShadow: pNum === companyPage ? '0 2px 4px rgba(37,99,235,0.2)' : 'none',
                      }}
                    >
                      {pNum}
                    </button>
                  ))}

                  <button
                    onClick={() => setCompanyPage(p => Math.min(totalPages, p + 1))}
                    disabled={companyPage === totalPages}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: companyPage === totalPages ? '#F1F5F9' : '#FFFFFF',
                      color: companyPage === totalPages ? '#94A3B8' : '#334155',
                      cursor: companyPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    다음 →
                  </button>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* 근로자 상세 현황 팝업 모달 */}
      <TodayAttendanceDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        initialFilter={detailModalFilter}
        todayStatus={todayStatus}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 실시간 근로자 정보 및 근태 현황 상세 모달 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilter: 'all' | 'checkedIn' | 'late' | 'notCheckedIn' | 'onLeave';
  todayStatus: TodayStatus | null;
}

function TodayAttendanceDetailModal({ isOpen, onClose, initialFilter, todayStatus }: ModalProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'checkedIn' | 'late' | 'notCheckedIn' | 'onLeave'>(initialFilter);
  const [modalSearch, setModalSearch] = useState('');

  useEffect(() => {
    setActiveFilter(initialFilter);
  }, [initialFilter, isOpen]);

  if (!isOpen || !todayStatus) return null;

  const employees = todayStatus.employees || [];

  // 필터링 적용
  const filteredEmployees = employees.filter(emp => {
    const matchesFilter = activeFilter === 'all' || emp.status === activeFilter;
    const q = modalSearch.toLowerCase().trim();
    const matchesSearch = !q ||
      emp.name.toLowerCase().includes(q) ||
      (emp.email && emp.email.toLowerCase().includes(q)) ||
      emp.companyName.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checkedIn':
        return <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>🟢 출근 완료</span>;
      case 'late':
        return <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>🟡 지각</span>;
      case 'onLeave':
        return <span style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>🔵 휴가</span>;
      default:
        return <span style={{ backgroundColor: '#FFE4E6', color: '#9F1239', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>🔴 미출근</span>;
    }
  };

  const fmtTime = (iso: string | null) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '-';
    }
  };

  const fmtMinutes = (min: number | null) => {
    if (!min || min <= 0) return '-';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div
          style={{
            padding: '24px 28px 16px 28px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                실시간 근로자 근태 현황
              </h2>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 10px', borderRadius: '12px' }}>
                총 {employees.length}명
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: '4px 0 0 0' }}>
              기준일: {todayStatus.date} · 각 카드를 선택하거나 근로자명을 검색해 상세 정보를 확인하세요.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              color: '#64748B',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            ✕
          </button>
        </div>

        {/* 필터 탭 & 검색바 */}
        <div style={{ padding: '16px 28px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* 탭 필터 */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: '전체', count: todayStatus.total, color: '#334155', bg: '#E2E8F0' },
              { key: 'checkedIn', label: '출근 완료', count: todayStatus.checkedIn, color: '#166534', bg: '#DCFCE7' },
              { key: 'late', label: '지각', count: todayStatus.late, color: '#92400E', bg: '#FEF3C7' },
              { key: 'notCheckedIn', label: '미출근', count: todayStatus.notCheckedIn, color: '#9F1239', bg: '#FFE4E6' },
              { key: 'onLeave', label: '휴가', count: todayStatus.onLeave, color: '#1E3A8A', bg: '#DBEAFE' },
            ].map(tab => {
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key as any)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: isActive ? '1px solid #2563EB' : '1px solid #E2E8F0',
                    backgroundColor: isActive ? '#2563EB' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : tab.bg,
                      color: isActive ? '#FFFFFF' : tab.color,
                      fontWeight: '800',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 검색 입력 */}
          <div style={{ position: 'relative', width: '220px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '8px', color: '#94A3B8', fontSize: '13px' }}>🔍</span>
            <input
              type="text"
              placeholder="이름, 이메일, 근무지 검색..."
              value={modalSearch}
              onChange={e => setModalSearch(e.target.value)}
              style={{
                width: '100%',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                padding: '6px 12px 6px 30px',
                fontSize: '12px',
                fontWeight: '600',
                outline: 'none',
                backgroundColor: '#FFFFFF',
                color: '#1E293B',
              }}
            />
          </div>
        </div>

        {/* 근로자 목록 리스트 영역 */}
        <div style={{ padding: '20px 28px', overflowY: 'auto', flex: 1 }}>
          {filteredEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8', fontSize: '14px' }}>
              해당하는 근로자 정보가 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredEmployees.map(emp => (
                <div
                  key={emp.employmentId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    border: '1px solid #F1F5F9',
                    backgroundColor: '#F8FAFC',
                    transition: 'all 0.15s',
                  }}
                  className="hover:border-blue-200 hover:bg-blue-50/30"
                >
                  {/* 근로자 기본 프로필 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                        fontWeight: '800',
                        fontSize: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #DBEAFE',
                        flexShrink: 0,
                      }}
                    >
                      {emp.name.substring(0, 1)}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>
                          {emp.name}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#475569', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '1px 7px', borderRadius: '6px' }}>
                          🏢 {emp.companyName}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                        {emp.email || '이메일 미등록'}
                      </div>
                    </div>
                  </div>

                  {/* 근태 상세 (상태 뱃지 + 시간 정보) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                        출근: <strong style={{ color: '#0F172A' }}>{fmtTime(emp.checkIn)}</strong> / 퇴근: <strong style={{ color: '#0F172A' }}>{fmtTime(emp.checkOut)}</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: '700', marginTop: '2px' }}>
                        {emp.workedMinutes ? `총 근무 ${fmtMinutes(emp.workedMinutes)}` : '근무 시간 집계 대기'}
                      </div>
                    </div>

                    <div>
                      {getStatusBadge(emp.status)}
                    </div>

                    <Link
                      href="/dashboard/employees"
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#475569',
                        fontSize: '11px',
                        fontWeight: '700',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                      className="hover:border-blue-500 hover:text-blue-600"
                    >
                      상세 ↗
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div style={{ padding: '14px 28px', backgroundColor: '#F8FAFC', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>
            표시 항목: 총 <strong>{filteredEmployees.length}</strong>명
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
