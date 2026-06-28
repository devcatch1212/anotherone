'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { setAdminToken, setAdminUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await apiFetch<{
        access_token: string;
        admin: { id: string; name: string; email: string };
      }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setAdminToken(data.access_token);
      setAdminUser(data.admin);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-[#F0F2F5]" style={{ backgroundColor: '#F0F2F5' }}>
      {/* 
        ★ 인라인 스타일 강제 주입 (Inline Style Force Injection) ★
        Tailwind 컴파일러 캐시 및 브라우저 HMR 오염 문제를 우회하기 위해,
        가장 강력한 우선순위를 갖는 인라인 style 속성으로 패딩(48px)과 완전 불투명 배경(#FFFFFF), 가로폭(440px)을 강제 적용합니다.
      */}
      <div 
        className="glass-card w-full rounded-2xl border border-slate-200 shadow-lg flex flex-col"
        style={{ 
          backgroundColor: '#FFFFFF',
          padding: '48px',
          maxWidth: '440px',
          boxSizing: 'border-box',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px'
        }}
      >
        
        {/* 헤더 로고 영역 */}
        <div className="text-center" style={{ textAlign: 'center' }}>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1E3A8A]" style={{ fontSize: '30px', fontWeight: '800', color: '#1E3A8A' }}>
            AnotherOne Admin
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500" style={{ marginTop: '8px', fontSize: '14px', color: '#64748B' }}>
            관리자 대시보드 로그인
          </p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 이메일 입력 필드 */}
          <div className="flex flex-col" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="text-[13px] font-bold text-slate-700" style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
              이메일 주소
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition duration-150 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '14px',
                color: '#1E293B',
                boxSizing: 'border-box'
              }}
              placeholder="admin@anotherone.kr"
              required
            />
          </div>

          {/* 비밀번호 입력 필드 */}
          <div className="flex flex-col" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="text-[13px] font-bold text-slate-700" style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition duration-150 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '14px',
                color: '#1E293B',
                boxSizing: 'border-box'
              }}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-500 font-medium" style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', fontSize: '12px', color: '#EF4444' }}>
              ⚠️ {error}
            </div>
          )}

          {/* 로그인 버튼 (w-[240px] 알약 모양) */}
          <div className="flex justify-center" style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
            <button
              type="submit"
              disabled={loading}
              className="glass-btn-primary rounded-full py-3 text-sm font-bold transition cursor-pointer shadow-md"
              style={{
                width: '240px',
                padding: '12px 0',
                borderRadius: '9999px',
                backgroundColor: '#3B82F6',
                border: '1px solid #2563EB',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>

        {/* 테스트 계정 정보 */}
        <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100 text-center" style={{ borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9', padding: '16px', textAlign: 'center' }}>
          <h4 className="text-xs font-bold text-slate-600 mb-2 tracking-wide" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>테스트 관리자 계정</h4>
          <div className="space-y-1.5 text-[11px] text-slate-500" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#64748B' }}>
            <p>이메일: <code className="font-mono text-blue-600 bg-white px-1.5 py-0.5 rounded border border-slate-100/50" style={{ fontFamily: 'monospace', color: '#2563EB', backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>admin@anotherone.kr</code></p>
            <p>비밀번호: <code className="font-mono text-blue-600 bg-white px-1.5 py-0.5 rounded border border-slate-100/50" style={{ fontFamily: 'monospace', color: '#2563EB', backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>Admin1234!</code></p>
          </div>
        </div>

      </div>
    </div>
  );
}
