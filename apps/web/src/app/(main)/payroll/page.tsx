'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PayrollRecord } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/Toast';

export default function PayrollPage() {
  const { user, currentEmploymentId } = useAuthStore();
  const { toast } = useToast();
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');

  useEffect(() => {
    if (currentEmploymentId) {
      setSelectedEmpId(currentEmploymentId);
    } else if (user?.employments && user.employments.length > 0) {
      setSelectedEmpId(user.employments[0].id);
    }
  }, [currentEmploymentId, user]);

  useEffect(() => {
    if (!selectedEmpId) return;
    fetchApi(`/api/payroll?employmentId=${selectedEmpId}`)
      .then(res => setRecords(res.records || []))
      .catch(e => {
        console.error('payroll fetch error', e);
        toast('급여명세서를 불러오는 데 실패했습니다.', 'error');
      });
  }, [selectedEmpId, toast]);

  const annualTotal     = records.reduce((s, r) => s + r.netPay, 0);
  const annualGross     = records.reduce((s, r) => s + r.totalGross, 0);
  const annualDeduction = records.reduce((s, r) => s + r.totalDeduction, 0);
  const year = records[0]?.year ?? new Date().getFullYear();

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 80 }}>

      {/* 헤더 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '48px 20px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>
          급여명세서
        </h1>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* 근무지 선택 필터 */}
        {user?.employments && user.employments.length > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            borderRadius: 16, padding: '10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', flexShrink: 0 }}>근무지 선택</span>
            <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)}
              style={{
                border: 'none', background: 'transparent',
                fontSize: 13, fontWeight: 800, color: 'var(--color-primary)',
                outline: 'none', cursor: 'pointer', textAlign: 'right', direction: 'rtl',
                maxWidth: 200, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'
              }}>
              {user.employments.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.company.name} ({emp.isActive ? '근무 중' : '근무 종료'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 연간 요약 카드 */}
        <div className="glass-card-primary" style={{
          borderRadius: 20, padding: '20px 20px 18px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', right: -20, top: -20,
            width: 100, height: 100, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }} />
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginBottom: 4 }}>
            {year}년 연간 실수령액
          </p>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 14 }}>
            {formatCurrency(annualTotal)}
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>총 지급액</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{formatCurrency(annualGross)}</p>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.15)' }} />
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>총 공제액</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{formatCurrency(annualDeduction)}</p>
            </div>
          </div>
        </div>

        {/* 월별 리스트 */}
        <div className="glass-card" style={{
          borderRadius: 20, overflow: 'hidden',
        }}>
          {records.map((r, idx) => (
            <Link key={r.id} href={`/payroll/${r.id}`}
              className="transition-all active:bg-white/40 duration-700"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', textDecoration: 'none',
                borderBottom: idx < records.length - 1 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
              }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: 3 }}>
                  {r.year}년 {r.month}월
                </p>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.3px', marginBottom: 3 }}>
                  {formatCurrency(r.netPay)}
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {r.paidAt ? `지급일 ${r.paidAt.slice(0, 10)}` : '정산 중'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {r.confirmed && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-success)',
                    padding: '4px 10px', borderRadius: 99,
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}>확인완료</span>
                )}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
