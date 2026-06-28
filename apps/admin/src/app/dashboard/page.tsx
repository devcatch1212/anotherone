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

  const totalEmployees = companies.reduce((sum, c) => sum + c.activeEmployeeCount, 0);

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">🏢 근무지 목록</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">등록된 전체 사업장 목록 및 활성 근로자 현황입니다.</p>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-white/60 shadow-md">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">총 등록 근무지</span>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{companies.length}개소</h3>
          </div>
          <div className="text-3xl bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center">🏢</div>
        </div>

        <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-white/60 shadow-md">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">총 활성 근로자 수</span>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{totalEmployees}명</h3>
          </div>
          <div className="text-3xl bg-indigo-50 w-12 h-12 rounded-xl flex items-center justify-center">👥</div>
        </div>
      </div>

      {/* 목록 리스트 */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-6 text-center text-red-500 border border-red-100">
          ⚠️ {error}
          <button onClick={loadCompanies} className="ml-4 text-xs font-bold text-blue-600 hover:underline">다시 시도</button>
        </div>
      ) : companies.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400 text-sm">
          등록된 근무지가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((c) => (
            <div key={c.id} className="glass-card rounded-2xl p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 border border-slate-200/60 bg-white/50 hover:border-blue-400/30">
              <div>
                <div className="flex justify-between items-start gap-4">
                  <h4 className="text-lg font-bold text-slate-800 truncate">{c.name}</h4>
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                    {c.activeEmployeeCount}명 근무 중
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2 min-h-[2rem]">📍 {c.address}</p>
                <div className="mt-4 flex items-center gap-4 text-[11px] text-slate-400">
                  <span>반경: {c.radiusMeters}m</span>
                  <span>위도: {c.latitude.toFixed(4)}</span>
                  <span>경도: {c.longitude.toFixed(4)}</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href={`/dashboard/companies/${c.id}`}
                  className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100/80 text-slate-600 hover:bg-blue-600 hover:text-white transition duration-200"
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
