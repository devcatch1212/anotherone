'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface EmployeeSummary {
  employmentId: string;
  userId: string;
  name: string;
  email: string;
  position: string;
  department: string | null;
  wageType: string;
  hourlyWage: number | null;
  dailyWage: number | null;
  workStartTime: string;
  workEndTime: string;
  weeklyWorkDays: number;
  isActive: boolean;
  isPrimary: boolean;
  userStatus: string;
  joinedAt: string;
}

interface CompanyEmployeesData {
  company: {
    id: string;
    name: string;
    address: string;
  };
  employees: EmployeeSummary[];
}

export default function CompanyEmployeesPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [data, setData] = useState<CompanyEmployeesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<CompanyEmployeesData>(`/api/admin/companies/${companyId}/employees`);
      setData(res);
    } catch (err: any) {
      setError(err.message || '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) loadData();
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center" style={{ height: '384px', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div 
        className="rounded-2xl p-8 text-center text-red-500 border border-red-100 bg-white"
        style={{ padding: '32px', borderRadius: '16px', border: '1px solid #FEE2E2', backgroundColor: '#FFFFFF', textAlign: 'center', color: '#EF4444' }}
      >
        ⚠️ {error || '데이터가 존재하지 않습니다.'}
        <div className="mt-6 flex justify-center gap-4" style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
          <button 
            onClick={() => router.back()} 
            className="text-xs font-bold text-slate-500 hover:underline"
            style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
          >
            뒤로 가기
          </button>
          <button 
            onClick={loadData} 
            className="text-xs font-bold text-blue-600 hover:underline"
            style={{ fontSize: '12px', fontWeight: '700', color: '#2563EB', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const activeEmployees = data.employees.filter(e => e.isActive);

  return (
    <div className="flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 뒤로가기 버튼 - 프리미엄 버튼 양식으로 개편 */}
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

      {/* 상단 사업장 정보 카드 - 쨍한 화이트 모드 및 p-8 여백 개편 */}
      <div 
        className="rounded-2xl border border-slate-200"
        style={{ 
          backgroundColor: '#FFFFFF', 
          borderRadius: '16px', 
          border: '1px solid #E2E8F0', 
          padding: '32px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01)'
        }}
      >
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider" style={{ fontSize: '11px', fontWeight: '700', color: '#2563EB', letterSpacing: '0.05em' }}>
          근무지 상세 정보
        </span>
        <h1 className="text-3xl font-extrabold text-slate-800 mt-2" style={{ fontSize: '26px', fontWeight: '800', color: '#1E293B', marginTop: '8px' }}>
          {data.company.name}
        </h1>
        <p className="text-sm text-slate-500 mt-2" style={{ fontSize: '13px', color: '#64748B', marginTop: '8px' }}>
          📍 {data.company.address}
        </p>
        
        <div 
          className="mt-6 pt-6 border-t border-slate-100 flex gap-6 text-xs text-slate-400"
          style={{ 
            display: 'flex', 
            gap: '24px', 
            fontSize: '12px', 
            color: '#94A3B8', 
            borderTop: '1px solid #F1F5F9', 
            paddingTop: '24px' 
          }}
        >
          <div>전체 근로자: <strong className="text-slate-700 font-semibold" style={{ color: '#334155' }}>{data.employees.length}명</strong></div>
          <div>재직 중: <strong className="text-emerald-600 font-semibold" style={{ color: '#059669' }}>{activeEmployees.length}명</strong></div>
          <div>근무 종료: <strong className="text-slate-400 font-semibold" style={{ color: '#94A3B8' }}>{data.employees.length - activeEmployees.length}명</strong></div>
        </div>
      </div>

      {/* 근로자 목록 테이블 - 가로폭 오버플로우 완전 차단형 랩퍼 */}
      <div 
        className="rounded-2xl border border-slate-200 overflow-hidden"
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
        <div 
          className="p-6 border-b border-slate-100 bg-slate-50/20"
          style={{ padding: '24px', borderBottom: '1px solid #F1F5F9', boxSizing: 'border-box' }}
        >
          <h3 className="font-bold text-slate-800 text-base" style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: 0 }}>
            소속 근로자 현황
          </h3>
        </div>

        {data.employees.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm" style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
            이 근무지에 등록된 근로자가 없습니다.
          </div>
        ) : (
          /* 가로 스크롤을 타게 보장하여 잘림 현상 완전 박멸 */
          <div className="w-full overflow-x-auto" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full border-collapse text-left text-sm text-slate-600" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase border-b border-slate-100" style={{ backgroundColor: '#F8FAFC', fontSize: '12px', fontWeight: '700', color: '#64748B' }}>
                <tr>
                  <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>이름 (이메일)</th>
                  <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>부서 / 직책</th>
                  <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>근무 요일 / 시간</th>
                  <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>급여 정보</th>
                  <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>상태</th>
                  <th className="px-6 py-4 text-right" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', textAlign: 'right' }}>상세조회</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100" style={{ backgroundColor: '#FFFFFF' }}>
                {data.employees.map((e) => (
                  <tr key={e.employmentId} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                      <div className="font-bold text-slate-800" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{e.name}</div>
                      <div className="text-xs text-slate-400 mt-1" style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>{e.email || '(이메일 없음)'}</div>
                    </td>
                    <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                      <div className="font-semibold text-slate-800" style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                        {e.department ? `${e.department} · ` : ''}{e.position || '직원'}
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                      <div className="font-medium text-slate-700" style={{ fontSize: '13px', color: '#475569' }}>
                        주 {e.weeklyWorkDays}일 ({e.workStartTime} ~ {e.workEndTime})
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                      {e.wageType === 'hourly' ? (
                        <div className="font-medium" style={{ fontSize: '13px' }}>시급: <strong className="text-blue-600 font-semibold" style={{ color: '#2563EB' }}>{e.hourlyWage?.toLocaleString()}원</strong></div>
                      ) : (
                        <div className="font-medium" style={{ fontSize: '13px' }}>일급: <strong className="text-indigo-600 font-semibold" style={{ color: '#4F46E5' }}>{e.dailyWage?.toLocaleString()}원</strong></div>
                      )}
                    </td>
                    <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                      {e.isActive ? (
                        <span 
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100"
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
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: '#10B981' }} />
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
                    </td>
                    <td className="px-6 py-4 text-right" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', textAlign: 'right' }}>
                      <Link
                        href={`/dashboard/employees/${e.employmentId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        상세/기록
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
