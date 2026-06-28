'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface PayrollItem {
  userId: string;
  userName: string;
  userEmail: string;
  companyId: string;
  companyName: string;
  position: string;
  workedDays: number;
  basePay: number;
  holidayPay: number;
  overtimePay: number;
  nightPay: number;
  totalGross: number;
  nationalPension: number;
  healthInsurance: number;
  employmentInsurance: number;
  incomeTax: number;
  totalDeduction: number;
  netPay: number;
  confirmed: boolean;
  paidAt: string | null;
}

interface Company {
  id: string;
  name: string;
}

export default function PayrollPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  
  const [payrolls, setPayrolls] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 상세 보기 모달 대상
  const [selectedItem, setSelectedItem] = useState<PayrollItem | null>(null);

  // 근무지 목록 로드 (필터용)
  const loadFilters = async () => {
    try {
      const data = await apiFetch<any[]>('/api/admin/companies');
      setCompanies(data.map(c => ({ id: c.id, name: c.name })));
    } catch {
      // 에러 발생 시 생략
    }
  };

  // 급여 대장 로드
  const loadPayrolls = async () => {
    try {
      setLoading(true);
      setError('');
      const params: any = { year, month };
      if (selectedCompanyId) {
        params.companyId = selectedCompanyId;
      }
      const data = await apiFetch<PayrollItem[]>('/api/admin/payrolls', { params });
      setPayrolls(data);
    } catch (err: any) {
      setError(err.message || '급여 정산 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadPayrolls();
  }, [year, month, selectedCompanyId]);

  // 급여 명세서 일괄 발행 실행
  const handleIssueAll = async () => {
    const pendingItems = payrolls.filter(p => !p.confirmed);
    if (pendingItems.length === 0) {
      alert('현재 발행할 대기 상태의 급여 명세서가 없습니다.');
      return;
    }

    const confirmMsg = `⚠️ 정말로 [${year}년 ${month}월] 급여 명세서를 일괄 발행하시겠습니까?\n\n• 발행 대상: 총 ${pendingItems.length}명\n\n발행 즉시 각 근로자의 모바일 앱으로 급여 명세서 알림이 발송되며, 확정 데이터를 조회할 수 있게 됩니다.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setActionLoading(true);
      await apiFetch(`/api/admin/payrolls/issue?year=${year}&month=${month}${selectedCompanyId ? `&companyId=${selectedCompanyId}` : ''}`, {
        method: 'POST',
        body: JSON.stringify({ items: pendingItems }),
      });
      alert('🎉 급여 명세서 일괄 발행 및 푸시 전송이 성공적으로 완료되었습니다!');
      // 목록 리로드
      loadPayrolls();
    } catch (err: any) {
      alert(err.message || '발행 처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 타이틀 헤더 */}
      <div className="flex justify-between items-start" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{ fontSize: '28px', fontWeight: '800', color: '#1E293B' }}>
            💵 급여 대장 및 명세서 발행
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium" style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>
            근로자별 근무 일수를 정산하고, 4대보험 공제액을 제한 실수령액 명세서를 일괄 승인하여 발행합니다.
          </p>
        </div>

        {/* 일괄 발행 버튼 */}
        <button
          onClick={handleIssueAll}
          disabled={loading || actionLoading || payrolls.filter(p => !p.confirmed).length === 0}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition"
          style={{
            padding: '10px 20px',
            backgroundColor: payrolls.filter(p => !p.confirmed).length > 0 ? '#2563EB' : '#94A3B8',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: payrolls.filter(p => !p.confirmed).length > 0 ? 'pointer' : 'not-allowed',
            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.15)'
          }}
        >
          {actionLoading ? '일괄 발행 처리 중...' : '💵 급여 명세서 일괄 발행'}
        </button>
      </div>

      {/* 필터 바 */}
      <div 
        className="flex gap-4 p-5 rounded-2xl border border-slate-200" 
        style={{ 
          display: 'flex', 
          gap: '16px', 
          backgroundColor: '#FFFFFF', 
          padding: '20px', 
          borderRadius: '16px', 
          border: '1px solid #E2E8F0',
          alignItems: 'center'
        }}
      >
        {/* 연도 필터 */}
        <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ fontSize: '10px', fontWeight: '700', color: '#94A3B8' }}>정산 연도</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 bg-white"
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', color: '#475569', outline: 'none' }}
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        </div>

        {/* 월 필터 */}
        <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ fontSize: '10px', fontWeight: '700', color: '#94A3B8' }}>정산 월</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 bg-white"
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', color: '#475569', outline: 'none' }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
        </div>

        {/* 근무지 필터 */}
        <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" style={{ fontSize: '10px', fontWeight: '700', color: '#94A3B8' }}>근무지 필터</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 bg-white"
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', color: '#475569', outline: 'none' }}
          >
            <option value="">전체 근무지</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 정산 대장 목록 카드 */}
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
            <button onClick={loadPayrolls} className="ml-4 text-xs font-bold text-blue-600 hover:underline ml-3" style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>다시 시도</button>
          </div>
        ) : payrolls.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm" style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            선택한 월에 근무 중인 근로자 혹은 정산 대상 데이터가 존재하지 않습니다.
          </div>
        ) : (
          <div className="w-full overflow-x-auto" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full border-collapse text-left text-sm text-slate-600" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px' }}>
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100" style={{ backgroundColor: '#F8FAFC', fontSize: '11px', color: '#64748B' }}>
                <tr>
                  <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>근로자 (이메일)</th>
                  <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>소속 근무지</th>
                  <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>출근 일수</th>
                  <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>지급 총액 (기본+수당)</th>
                  <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>세금 공제액</th>
                  <th className="px-6 py-4 font-black" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', fontWeight: '900' }}>실수령액 (Net Pay)</th>
                  <th className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>발행 상태</th>
                  <th className="px-6 py-4 text-center" style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>명세 상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100" style={{ backgroundColor: '#FFFFFF' }}>
                {payrolls.map((p) => (
                  <tr key={`${p.userId}-${p.companyId}`} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                      <div className="font-bold text-slate-800" style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{p.userName}</div>
                      <div className="text-xs text-slate-400 mt-1" style={{ fontSize: '11px', color: '#94A3B8' }}>{p.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700" style={{ padding: '16px 24px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>
                      🏢 {p.companyName}
                      <span className="block text-[11px] font-bold text-slate-400 mt-0.5" style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700' }}>{p.position}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700" style={{ padding: '16px 24px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>
                      📅 {p.workedDays}일 출근
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700" style={{ padding: '16px 24px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #F1F5F9' }}>
                      ₩{p.totalGross.toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 text-red-500 font-semibold" style={{ padding: '16px 24px', fontSize: '13px', color: '#EF4444', borderBottom: '1px solid #F1F5F9' }}>
                      -₩{p.totalDeduction.toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 font-black text-blue-600" style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '900', color: '#2563EB', borderBottom: '1px solid #F1F5F9' }}>
                      ₩{p.netPay.toLocaleString()}원
                    </td>
                    <td className="px-6 py-4" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                      {p.confirmed ? (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          발행 완료
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
                          발행 대기
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center" style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedItem(p)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                        style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', cursor: 'pointer', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}
                      >
                        🔎 열람
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 급여 명세 상세 보기 모달 */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-8"
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: '480px',
              borderRadius: '24px',
              border: '1px solid #E2E8F0',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '24px' }}>
              <div>
                <h3 className="text-lg font-black text-slate-800" style={{ fontSize: '18px', fontWeight: '900', color: '#1E293B', margin: 0 }}>
                  📄 급여 명세 상세 내역
                </h3>
                <span className="text-xs text-slate-400 mt-1 block" style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                  {year}년 {month}월 지급분
                </span>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
                style={{ border: 'none', backgroundColor: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            {/* 수령자 및 정보 */}
            <div className="mb-6 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 flex flex-col gap-2" style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs text-slate-400 font-semibold" style={{ fontSize: '12px', color: '#94A3B8' }}>수령자</span>
                <span className="text-xs font-bold text-slate-700" style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>{selectedItem.userName} ({selectedItem.position})</span>
              </div>
              <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs text-slate-400 font-semibold" style={{ fontSize: '12px', color: '#94A3B8' }}>소속 근무지</span>
                <span className="text-xs font-bold text-slate-700" style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>{selectedItem.companyName}</span>
              </div>
              <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs text-slate-400 font-semibold" style={{ fontSize: '12px', color: '#94A3B8' }}>실제 근무 일수</span>
                <span className="text-xs font-bold text-slate-700" style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>{selectedItem.workedDays}일</span>
              </div>
            </div>

            {/* 정산 디테일 내역 */}
            <div className="flex flex-col gap-4 mb-6" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {/* 1. 지급 항목 */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', marginBottom: '8px', margin: 0 }}>➕ 지급 항목 (Gross Pay)</h4>
                <div className="flex flex-col gap-2 pl-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
                  <div className="flex justify-between text-xs text-slate-600" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>기본급</span>
                    <span>₩{selectedItem.basePay.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>주휴수당</span>
                    <span>₩{selectedItem.holidayPay.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>연장근로수당 (승인분)</span>
                    <span>₩{selectedItem.overtimePay.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>야간근로수당</span>
                    <span>₩{selectedItem.nightPay.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 border-t border-slate-100 pt-2" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: '#1E293B', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
                    <span>지급 합계</span>
                    <span>₩{selectedItem.totalGross.toLocaleString()}원</span>
                  </div>
                </div>
              </div>

              {/* 2. 공제 항목 */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2" style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', marginBottom: '8px', margin: 0 }}>➖ 공제 항목 (Deductions)</h4>
                <div className="flex flex-col gap-2 pl-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
                  <div className="flex justify-between text-xs text-slate-600" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>국민연금 (4.5%)</span>
                    <span className="text-red-500">-₩{selectedItem.nationalPension.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>건강보험 (3.54%)</span>
                    <span className="text-red-500">-₩{selectedItem.healthInsurance.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>고용보험 (0.9%)</span>
                    <span className="text-red-500">-₩{selectedItem.employmentInsurance.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>근로소득세</span>
                    <span className="text-red-500">-₩{selectedItem.incomeTax.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 border-t border-slate-100 pt-2" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: '#1E293B', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
                    <span>공제 합계</span>
                    <span className="text-red-500">-₩{selectedItem.totalDeduction.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 실수령액 */}
            <div 
              className="p-4 rounded-2xl flex justify-between items-center bg-blue-50 border border-blue-100"
              style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #DBEAFE',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span className="text-sm font-extrabold text-blue-800" style={{ fontSize: '14px', fontWeight: '800', color: '#1E40AF' }}>최종 실수령액 (Net Pay)</span>
              <span className="text-lg font-black text-blue-600" style={{ fontSize: '18px', fontWeight: '900', color: '#2563EB' }}>₩{selectedItem.netPay.toLocaleString()}원</span>
            </div>

            {/* 하단 닫기 */}
            <button
              onClick={() => setSelectedItem(null)}
              className="mt-6 w-full py-2.5 rounded-xl text-sm font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '10px 0',
                borderRadius: '12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#475569',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              창 닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
