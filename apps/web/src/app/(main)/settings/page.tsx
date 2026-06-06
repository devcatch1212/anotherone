'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

const WAGE_TYPE_LABEL: Record<string, string> = { hourly: '시급제', daily: '일급제' };

export default function SettingsPage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
      clearAuth();
      router.replace('/login');
    });
  };

  const wageLabel = user?.wageType === 'hourly'
    ? `시급 ${(user?.hourlyWage ?? 0).toLocaleString()}원`
    : `일급 ${(user?.dailyWage ?? 0).toLocaleString()}원`;

  const menuSections = [
    {
      title: '급여 & 근무지',
      items: [
        { label: '급여 유형', value: WAGE_TYPE_LABEL[user?.wageType ?? 'hourly'], icon: '⚙️', href: '/settings/profile' },
        { label: '급여', value: wageLabel, icon: '💵', href: '/settings/profile' },
        { label: '회사명', value: user?.company?.name || '미등록', icon: '🏭', href: '/settings/profile' },
        { label: '근무지 주소', value: user?.company?.address || '미등록', icon: '📍', href: '/settings/profile' },
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
          <div onClick={() => setShowTerms(true)}
            className="transition-all active:bg-white/40 duration-300"
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', cursor: 'pointer',
              borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>📄</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>이용약관</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {/* 개인정보처리방침 */}
          <div onClick={() => setShowPrivacy(true)}
            className="transition-all active:bg-white/40 duration-300"
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', cursor: 'pointer',
              borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>🛡️</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>개인정보처리방침</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {/* 비밀번호 변경 */}
          <Link href="/settings/profile"
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
        </div>

      </div>

      {/* 이용약관 모달 */}
      {showTerms && (
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
            maxHeight: '75dvh', overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>이용약관</h3>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
              {`제 1 조 (목적)
본 약관은 "근무관리" 서비스의 이용 조건 및 절차에 관한 기본적인 사항을 규정합니다.

제 2 조 (이용자의 의무)
이용자는 본 서비스가 제공하는 출퇴근 기록 및 근무관리 기능을 신의성실의 원칙에 따라 올바르게 사용하여야 합니다.

제 3 조 (서비스의 제공)
본 서비스는 가상의 모의 근무관리 기능 및 온보딩 편의를 제공하며, 정식 출시 전 모의 테스트 환경을 지원합니다.`}
            </div>
            <button onClick={() => setShowTerms(false)}
              className="glass-btn-primary"
              style={{
                height: 44, width: '100%', borderRadius: 12, border: 'none',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer'
              }}>
              확인
            </button>
          </div>
        </div>
      )}

      {/* 개인정보처리방침 모달 */}
      {showPrivacy && (
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
            maxHeight: '75dvh', overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>개인정보처리방침</h3>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
              {`1. 개인정보의 수집 항목
본 서비스는 회원가입 및 본인 식별을 위해 이름, 이메일 주소를 수집합니다.

2. 개인정보의 이용 목적
수집된 정보는 근무관리 시뮬레이션 및 가상 데이터 통계 관리 목적으로만 제한적으로 사용됩니다.

3. 정보의 보유 및 파기
가입된 정보는 클라이언트 MSW(Mock Service Worker) 환경의 메모리 내에서만 유지되며, 브라우저 세션이 초기화되거나 로그아웃 시 파기됩니다.`}
            </div>
            <button onClick={() => setShowPrivacy(false)}
              className="glass-btn-primary"
              style={{
                height: 44, width: '100%', borderRadius: 12, border: 'none',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer'
              }}>
              확인
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
