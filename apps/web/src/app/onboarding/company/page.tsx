'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/store/onboarding.store';
import { StepIndicator } from '@/components/ui';
import Script from 'next/script';

// 카카오 주소 API 타입 (window.daum)
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    daum: any;
  }
}

export default function CompanyPage() {
  const router = useRouter();
  const {
    setCompanyInfo,
    companyName: savedName,
    companyAddress: savedAddr,
  } = useOnboardingStore();
  const [companyName, setCompanyName] = useState(savedName);
  const [companyAddress, setCompanyAddress] = useState(savedAddr);
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [error, setError] = useState('');

  // 카카오 주소 검색 실행
  const openAddressSearch = () => {
    if (typeof window !== 'undefined' && window.daum) {
      new window.daum.Postcode({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        oncomplete: (data: any) => {
          setCompanyAddress(data.address);
          // 실제 백엔드에서는 주소 → 좌표 변환 API 호출
          // Mock: 강남구 테헤란로 152 좌표 사용
          setLat(37.5004);
          setLng(127.0368);
        },
      }).open();
    } else {
      // 카카오 스크립트 없을 때 Mock 처리
      setCompanyAddress('서울특별시 강남구 테헤란로 152 (Mock 주소)');
      setLat(37.5004);
      setLng(127.0368);
    }
  };

  const handleNext = () => {
    setError('');
    if (!companyName.trim()) {
      setError('회사명을 입력해주세요');
      return;
    }
    if (!companyAddress.trim()) {
      setError('회사 주소를 선택해주세요');
      return;
    }
    setCompanyInfo({ companyName, companyAddress, companyLat: lat, companyLng: lng });
    router.push('/onboarding/complete');
  };

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'transparent' }}>
      
      {/* 상단 반투명 헤더 */}
      <div 
        style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
          padding: '48px 20px 16px',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <StepIndicator steps={3} current={2} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)' }}>2/3</span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
          회사 정보 입력
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, fontWeight: 500 }}>
          출퇴근 인증을 위해 근무지 위치를 등록해주세요
        </p>
      </div>

      <div style={{ padding: '20px 20px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* 회사 정보 카드 */}
        <div 
          className="glass-card"
          style={{
            borderRadius: 24, padding: '24px 20px',
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            display: 'flex', flexDirection: 'column', gap: 20
          }}
        >
          {/* 회사명 */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>회사명</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="(주)회사이름"
              style={{
                width: '100%', height: 46, borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.5)',
                background: 'rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '0 14px', fontSize: 14, fontWeight: 600,
                color: 'var(--color-text-primary)', outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
              onFocus={e => {
                e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                e.target.style.border = '1px solid var(--color-primary)';
                e.target.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.25)';
              }}
              onBlur={e => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                e.target.style.border = '1px solid rgba(255, 255, 255, 0.5)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* 회사 주소 */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>회사 주소</label>
            <div style={{ display: 'flex', gap: 8, width: '100%', boxSizing: 'border-box' }}>
              <input
                type="text"
                value={companyAddress}
                readOnly
                placeholder="주소 검색 버튼을 눌러주세요"
                style={{
                  flex: 1, minWidth: 0, height: 46, borderRadius: 14,
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  padding: '0 14px', fontSize: 13, fontWeight: 600,
                  color: 'var(--color-text-primary)', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={openAddressSearch}
                style={{
                  height: 46, padding: '0 16px',
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, #6366F1 100%)',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  borderRadius: 14, border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                  flexShrink: 0, whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
                onMouseDown={e => {
                  e.currentTarget.style.transform = 'scale(0.97)';
                  e.currentTarget.style.opacity = '0.95';
                }}
                onMouseUp={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.opacity = '1';
                }}
              >
                주소 검색
              </button>
            </div>
            {companyAddress && (
              <div 
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 12, padding: '10px 14px', marginTop: 6
                }}
              >
                <span style={{ fontSize: 14 }}>📍</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)' }}>{companyAddress}</span>
              </div>
            )}
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, fontWeight: 500 }}>
              💡 등록된 주소 기준 반경 100m 이내에서 출퇴근이 가능합니다
            </p>
          </div>

          {error && (
            <div 
              style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.2)',
                borderRadius: 14, padding: '12px 16px',
                fontSize: 13, color: 'var(--color-danger)', fontWeight: 600
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* 이전 / 다음 단계 버튼 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                height: 50, borderRadius: 16, border: 'none',
                background: 'rgba(0, 0, 0, 0.05)',
                color: 'var(--color-text-secondary)', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'none'}
            >
              ← 이전
            </button>
            <button
              type="button"
              onClick={handleNext}
              style={{
                height: 50, borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, #6366F1 100%)',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 6px 16px rgba(99, 102, 241, 0.2)',
                transition: 'all 0.2s'
              }}
              onMouseDown={e => {
                e.currentTarget.style.transform = 'scale(0.97)';
                e.currentTarget.style.opacity = '0.95';
              }}
              onMouseUp={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.opacity = '1';
              }}
            >
              다음 단계 →
            </button>
          </div>
        </div>
      </div>
      <Script 
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" 
        strategy="afterInteractive"
      />
    </div>
  );
}
