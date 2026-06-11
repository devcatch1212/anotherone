'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';

export default function TermsPage() {
  const router = useRouter();
  const [content, setContent] = useState('이용약관을 불러오는 중입니다...');
  const [version, setVersion] = useState('');

  useEffect(() => {
    fetchApi('/api/legal/terms')
      .then(res => {
        setContent(res.content);
        setVersion(res.version);
      })
      .catch(() => {
        setContent('이용약관을 불러올 수 없습니다. 다시 시도해주세요.');
      });
  }, []);

  const card: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.04)',
    borderRadius: 20,
    padding: '24px 20px',
  };

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 80 }}>
      {/* 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => router.back()} 
          className="transition-all active:bg-white/40"
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', 
            borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer'
          }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="var(--color-text-primary)" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.3px', margin: 0 }}>
          이용약관
        </h1>
      </div>

      {/* 본문 콘텐츠 */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={card}>
          {version && (
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 16 }}>
              시행일자: {version}
            </p>
          )}
          <div style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--color-text-secondary)',
            whiteSpace: 'pre-wrap',
          }}>
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
