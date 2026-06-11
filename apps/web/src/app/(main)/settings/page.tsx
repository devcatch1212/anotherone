'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { handleGlobalLogout } from '@/utils/logout';

const WAGE_TYPE_LABEL: Record<string, string> = { hourly: '시급제', daily: '일급제' };

export default function SettingsPage() {
  const router = useRouter();
  const { user, currentCompanyId } = useAuthStore();
  const [appVersion, setAppVersion] = useState('v1.0.0');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    await handleGlobalLogout();
  };

  const handleWithdraw = async () => {
    try {
      const res = await fetchApi('/api/settings/withdraw', { method: 'POST' });
      toast(res.message || '회원 탈퇴가 처리되었습니다.', 'success');
      await handleGlobalLogout();
    } catch (e: any) {
      toast(e.message || '회원 탈퇴 처리에 실패했습니다.', 'error');
    } finally {
      setShowWithdraw(false);
    }
  };

  const employment = user?.employments?.find(e => e.companyId === currentCompanyId) || user?.employments?.[0];

  const wageLabel = employment?.wageType === 'hourly'
    ? `시급 ${(employment?.hourlyWage ?? 0).toLocaleString()}원`
    : `일급 ${(employment?.dailyWage ?? 0).toLocaleString()}원`;

  const menuSections = [
    {
      title: '급여 & 근무지',
      items: [
        { label: '급여 유형', value: WAGE_TYPE_LABEL[employment?.wageType ?? 'hourly'], icon: '⚙️', href: '/settings/profile?focus=wageType' },
        { label: '급여', value: wageLabel, icon: '💵', href: '/settings/profile?focus=wage' },
        { label: '회사명', value: employment?.company?.name || '미등록', icon: '🏭', href: '/settings/profile?focus=companyName' },
        { label: '근무지 주소', value: employment?.company?.address || '미등록', icon: '📍', href: '/settings/profile?focus=companyAddress' },
      ],
    },
  ];

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'transparent' }}>
      
      {/* 상단 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
          설정
        </h1>
      </div>

      <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* 프로필 카드 (Gen Z 그라데이션 글로우 스타일) */}
        <div className="glass-card" style={{
          borderRadius: 24, padding: '20px',
          display: 'flex', alignItems: 'center', gap: 16,
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
        }}>
          {/* 아바타 영역 (그라디언트 + 네온 링) */}
          <div style={{
            width: 60, height: 60, borderRadius: 20,
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-vacation) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff',
            boxShadow: '0 8px 20px 0 rgba(99, 102, 241, 0.25)',
            border: '2px solid rgba(255, 255, 255, 0.8)',
          }}>
            {(user?.name ?? '?')[0]}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {user?.name ?? '사용자'}
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
              {user?.email ?? 'email@company.com'}
            </p>
          </div>
        </div>

        {/* 메뉴 섹션들 */}
        {menuSections.map(section => (
          <div key={section.title} className="glass-card" style={{
            borderRadius: 24, overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
          }}>
            {/* 섹션 제목 */}
            <div style={{
              padding: '14px 20px 8px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
            }}>
              <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {section.title}
              </h2>
            </div>
            
            {section.items.map((item, idx) => (
              item.href ? (
                <Link key={item.label} href={item.href}
                  className="transition-all active:bg-white/40 duration-300"
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 20px', textDecoration: 'none',
                    borderBottom: idx < section.items.length - 1 ? '1px solid rgba(0, 0, 0, 0.03)' : 'none',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{item.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.value}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M9 18l6-6-6-6" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </Link>
              ) : (
                <div key={item.label}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 20px',
                    borderBottom: idx < section.items.length - 1 ? '1px solid rgba(0, 0, 0, 0.03)' : 'none',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.value}
                  </span>
                </div>
              )
            ))}
          </div>
        ))}

        {/* 시스템 / 기타 설정 정보 */}
        <div className="glass-card" style={{
          borderRadius: 24, overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
        }}>
          {/* 앱 버전 */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>📱</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>앱 버전</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>v1.0.0</span>
          </div>

          {/* 이용약관 */}
          <Link href="/settings/terms"
            className="transition-all active:bg-white/40 duration-300"
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', textDecoration: 'none',
              borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>📄</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>이용약관</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>

          {/* 개인정보처리방침 */}
          <Link href="/settings/privacy"
            className="transition-all active:bg-white/40 duration-300"
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', textDecoration: 'none',
              borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>🛡️</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>개인정보처리방침</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>

          {/* 비밀번호 변경 */}
          <Link href="/settings/profile?tab=password"
            className="transition-all active:bg-white/40 duration-300"
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', textDecoration: 'none',
              borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>🔒</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>비밀번호 변경</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>

          {/* 로그아웃 */}
          <button onClick={handleLogout}
            className="transition-all active:bg-red-500/10 duration-300"
            style={{
              width: '100%', border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 20px', cursor: 'pointer',
              color: 'var(--color-danger)', fontSize: 13, fontWeight: 700,
              textAlign: 'left',
            }}>
            <span>🚪</span>
            <span>로그아웃</span>
          </button>

          {/* 회원 탈퇴 */}
          <button onClick={() => setShowWithdraw(true)}
            className="transition-all active:bg-red-500/10 duration-300"
            style={{
              width: '100%', border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 20px', cursor: 'pointer',
              color: 'var(--color-danger)', fontSize: 12, fontWeight: 500,
              textAlign: 'left',
              opacity: 0.7,
              borderTop: '1px solid rgba(0, 0, 0, 0.03)'
            }}>
            <span>👤❌</span>
            <span>회원 탈퇴</span>
          </button>
        </div>

      </div>



      {/* 회원 탈퇴 모달 */}
      {showWithdraw && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 20
        }}>
          <div className="glass-card" style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            borderRadius: 24, padding: 24, width: '100%', maxWidth: 350,
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-danger)', margin: 0 }}>회원 탈퇴</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
              정말 회원 탈퇴를 진행하시겠습니까?<br />
              탈퇴 시 즉시 로그아웃되며, 기존에 누적된 출퇴근 및 급여 데이터는 안전하게 보존됩니다.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowWithdraw(false)}
                style={{
                  flex: 1, height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)',
                  background: '#fff', color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                }}>
                취소
              </button>
              <button onClick={handleWithdraw}
                style={{
                  flex: 1, height: 44, borderRadius: 12, border: 'none',
                  background: 'var(--color-danger)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                }}>
                탈퇴하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
