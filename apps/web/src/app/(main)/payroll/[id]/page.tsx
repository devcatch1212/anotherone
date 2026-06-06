'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PayrollRecord } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { mockPayroll } from '@/mocks/data/payroll';
import { useAuthStore } from '@/store/auth.store';

export default function PayrollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [record, setRecord] = useState<PayrollRecord | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const wageType = user?.wageType ?? 'hourly';

  useEffect(() => {
    fetch(`/api/payroll/${id}`)
      .then(r => r.json())
      .then(({ record: r }) => { setRecord(r); setConfirmed(r.confirmed); })
      .catch(() => {
        const r = mockPayroll.find(p => p.id === id) ?? mockPayroll[0];
        setRecord(r);
        setConfirmed(r.confirmed);
      });
  }, [id]);

  const handleConfirm = async () => {
    await fetch(`/api/payroll/${id}/confirm`, { method: 'POST' });
    setConfirmed(true);
  };

  if (!record) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '2.5px solid #E5E7EB', borderTopColor: '#111827',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  const income = [
    { label: '기본급',                                         amount: record.basePay },
    { label: wageType === 'hourly' ? '주휴수당' : '기본급 추가', amount: record.holidayPay },
    { label: '연장수당 (×1.5)',                                  amount: record.overtimePay },
    { label: '야간수당 (×0.5)',                                  amount: record.nightPay },
  ].filter(i => i.amount > 0);

  const deduction = [
    { label: '국민연금 (4.5%)',   amount: record.nationalPension },
    { label: '건강보험 (3.545%)', amount: record.healthInsurance },
    { label: '고용보험 (0.9%)',   amount: record.employmentInsurance },
    { label: '소득세',            amount: record.incomeTax },
  ].filter(d => d.amount > 0);

  const Row = ({ label, amount, color, bold }: {
    label: string; amount: number; color?: string; bold?: boolean;
  }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '13px 0',
    }}>
      <span style={{ fontSize: 14, color: bold ? '#111827' : '#6B7280', fontWeight: bold ? 600 : 400 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 600, color: color ?? '#111827' }}>
        {amount < 0 || color === '#E11D48' ? '-' : ''}{formatCurrency(Math.abs(amount))}
      </span>
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 40 }}>

      {/* 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
        padding: '48px 20px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => router.back()} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="var(--color-text-primary)" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          급여내역
        </button>
        <button onClick={() => window.print()} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"
              stroke="var(--color-text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          저장
        </button>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* 실수령액 카드 */}
        <div className="glass-card-primary" style={{
          borderRadius: 20, padding: '24px 20px 20px',
          position: 'relative', overflow: 'hidden', textAlign: 'center',
        }}>
          <div style={{
            position: 'absolute', right: -20, top: -20,
            width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
          }} />
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500, marginBottom: 6 }}>
            {record.year}년 {record.month}월 실수령액
          </p>
          <p style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.8px', marginBottom: 8 }}>
            {formatCurrency(record.netPay)}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 12 }}>
            지급일 {record.paidAt.slice(0, 10)} · {record.workedDays}일 근무
          </p>
          {/* 수신 상태 배지 */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 99,
              background: confirmed ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.15)',
              color: confirmed ? '#0F172A' : 'rgba(255, 255, 255, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}>
              {confirmed ? '✓ 수신 확인 완료' : '수신 확인 대기 중'}
            </span>
          </div>
        </div>

        {/* 수입 내역 */}
        <div className="glass-card" style={{
          borderRadius: 20,
          overflow: 'hidden', padding: '0 20px',
        }}>
          {/* 섹션 헤더 */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 0 4px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>수입 내역</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>
              +{formatCurrency(record.totalGross)}
            </span>
          </div>
          {income.map((item, idx) => (
            <div key={item.label} style={{
              borderBottom: idx < income.length - 1 ? '1px solid rgba(0, 0, 0, 0.03)' : 'none',
            }}>
              <Row label={item.label} amount={item.amount} />
            </div>
          ))}
          {/* 소계 */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0',
            borderTop: '1px solid rgba(0, 0, 0, 0.05)',
            marginTop: 2,
          }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>지급 합계</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
              +{formatCurrency(record.totalGross)}
            </span>
          </div>
        </div>

        {/* 공제 내역 */}
        <div className="glass-card" style={{
          borderRadius: 20,
          overflow: 'hidden', padding: '0 20px',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 0 4px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>공제 내역</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-danger)' }}>
              -{formatCurrency(record.totalDeduction)}
            </span>
          </div>
          {deduction.map((item, idx) => (
            <div key={item.label} style={{
              borderBottom: idx < deduction.length - 1 ? '1px solid rgba(0, 0, 0, 0.03)' : 'none',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '13px 0',
              }}>
                <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger)' }}>
                  -{formatCurrency(item.amount)}
                </span>
              </div>
            </div>
          ))}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0',
            borderTop: '1px solid rgba(0, 0, 0, 0.05)', marginTop: 2,
          }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>공제 합계</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-danger)' }}>
              -{formatCurrency(record.totalDeduction)}
            </span>
          </div>
        </div>

        {/* 최종 실수령액 */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20, padding: '18px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>최종 실수령액</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              {formatCurrency(record.totalGross)} - {formatCurrency(record.totalDeduction)}
            </p>
          </div>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            {formatCurrency(record.netPay)}
          </p>
        </div>

        {/* 수신 확인 버튼 */}
        {!confirmed ? (
          <button onClick={handleConfirm}
            className="transition-base"
            style={{
              height: 54, width: '100%', borderRadius: 14,
              background: 'var(--color-accent)', color: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 8px 24px 0 rgba(0, 240, 255, 0.18)',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '-0.2px',
            }}
            onMouseDown={e => {
              e.currentTarget.style.transform = 'scale(0.97)';
              e.currentTarget.style.opacity = '0.92';
            }}
            onMouseUp={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.opacity = '1';
            }}
            onTouchStart={e => {
              e.currentTarget.style.transform = 'scale(0.97)';
              e.currentTarget.style.opacity = '0.92';
            }}
            onTouchEnd={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.opacity = '1';
            }}
          >
            ✓ 수신 확인하기
          </button>
        ) : (
          <div style={{
            height: 54, borderRadius: 14,
            background: 'rgba(0, 240, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(0, 240, 255, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            color: 'var(--color-accent-dark)', fontWeight: 700, fontSize: 14,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="var(--color-accent-dark)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>수신 확인 완료</span>
          </div>
        )}

      </div>
    </div>
  );
}
