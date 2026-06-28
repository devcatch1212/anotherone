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
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center text-red-500 border border-red-100">
        ⚠️ {error || '데이터가 존재하지 않습니다.'}
        <div className="mt-4 flex justify-center gap-4">
          <button onClick={() => router.back()} className="text-xs font-bold text-slate-500 hover:underline">뒤로 가기</button>
          <button onClick={loadData} className="text-xs font-bold text-blue-600 hover:underline">다시 시도</button>
        </div>
      </div>
    );
  }

  const activeEmployees = data.employees.filter(e => e.isActive);

  return (
    <div>
      {/* 뒤로가기 링크 */}
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
          <span>←</span> 뒤로 가기
        </button>
      </div>

      {/* 상단 사업장 정보 */}
      <div className="glass-card rounded-2xl p-6 mb-8 border border-white/60 shadow-md">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">근무지 상세 정보</span>
        <h1 className="text-2xl font-black text-slate-800 mt-1">{data.company.name}</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">📍 {data.company.address}</p>
        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-6 text-xs text-slate-400">
          <div>전체 근로자: <strong className="text-slate-700">{data.employees.length}명</strong></div>
          <div>재직 중: <strong className="text-emerald-600">{activeEmployees.length}명</strong></div>
          <div>근무 종료: <strong className="text-slate-400">{data.employees.length - activeEmployees.length}명</strong></div>
        </div>
      </div>

      {/* 근로자 목록 테이블 */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/60 shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-white/20">
          <h3 className="font-bold text-slate-800 text-base">소속 근로자 현황</h3>
        </div>

        {data.employees.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            이 근무지에 등록된 근로자가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">이름 (이메일)</th>
                  <th className="px-6 py-4">부서 / 직책</th>
                  <th className="px-6 py-4">근무 요일 / 시간</th>
                  <th className="px-6 py-4">급여 정보</th>
                  <th className="px-6 py-4">상태</th>
                  <th className="px-6 py-4 text-right">상세조회</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/40">
                {data.employees.map((e) => (
                  <tr key={e.employmentId} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{e.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{e.email || '(이메일 없음)'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">
                        {e.department ? `${e.department} · ` : ''}{e.position || '직원'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-700">주 {e.weeklyWorkDays}일 ({e.workStartTime} ~ {e.workEndTime})</div>
                    </td>
                    <td className="px-6 py-4">
                      {e.wageType === 'hourly' ? (
                        <div className="font-medium">시급: <strong className="text-blue-600">{e.hourlyWage?.toLocaleString()}원</strong></div>
                      ) : (
                        <div className="font-medium">일급: <strong className="text-indigo-600">{e.dailyWage?.toLocaleString()}원</strong></div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {e.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          재직 중
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-400">
                          근무 종료
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/employees/${e.employmentId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100/80 text-slate-600 hover:bg-blue-600 hover:text-white transition duration-150"
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
