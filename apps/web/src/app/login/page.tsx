'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';

const schema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요').min(1, '이메일을 입력해주세요'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요'),
  remember: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      const resData = await fetchApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      
      setAuth(resData.access_token, resData.user);
      if (!resData.user.onboardingCompleted) {
        router.replace('/onboarding/wage-type');
      } else {
        router.replace('/home');
      }
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : '로그인에 실패했습니다');
    }
  };

  return (
    <div
      className="min-h-dvh flex flex-col justify-center py-8"
      style={{ background: 'transparent', width: '100%', boxSizing: 'border-box' }}
    >
      {/* 상단 헤더 (앱 아바타 & 타이틀) */}
      <div className="flex flex-col items-center px-6" style={{ paddingBottom: '24px' }}>
        <div
          style={{
            width: 72,
            height: 72,
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-vacation) 100%)',
            borderRadius: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            marginBottom: 16,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
          </svg>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
          근무관리
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, fontWeight: 500 }}>
          출퇴근 · 급여 · 휴가 한 번에
        </p>
      </div>

      {/* 로그인 폼 카드 */}
      <div style={{ padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
        <div 
          className="glass-card"
          style={{
            width: '100%',
            borderRadius: 28, padding: '28px 24px',
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            boxSizing: 'border-box',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 20 }}>로그인</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            
            {/* 이메일 */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>이메일</label>
              <input
                {...register('email')}
                type="text"
                placeholder="example@company.com"
                style={{
                  width: '100%', height: 46, borderRadius: 14,
                  border: errors.email ? '1px solid var(--color-vacation)' : '1px solid rgba(255, 255, 255, 0.5)',
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
                  e.target.style.border = errors.email ? '1px solid var(--color-vacation)' : '1px solid rgba(255, 255, 255, 0.5)';
                  e.target.style.boxShadow = 'none';
                }}
                autoComplete="username"
              />
              {errors.email && (
                <p style={{ fontSize: 11, color: 'var(--color-vacation)', fontWeight: 600, marginTop: 2 }}>⚠ {errors.email.message}</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>비밀번호</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  style={{
                    width: '100%', height: 46, borderRadius: 14,
                    border: errors.password ? '1px solid var(--color-vacation)' : '1px solid rgba(255, 255, 255, 0.5)',
                    background: 'rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    padding: '0 40px 0 14px', fontSize: 14, fontWeight: 600,
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
                    e.target.style.border = errors.password ? '1px solid var(--color-vacation)' : '1px solid rgba(255, 255, 255, 0.5)';
                    e.target.style.boxShadow = 'none';
                  }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {errors.password && (
                <p style={{ fontSize: 11, color: 'var(--color-vacation)', fontWeight: 600, marginTop: 2 }}>⚠ {errors.password.message}</p>
              )}
            </div>

            {/* 체크박스 & 비밀번호 찾기 */}
            <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  {...register('remember')}
                  type="checkbox"
                  className="w-4 h-4 rounded accent-blue-500"
                />
                로그인 상태 유지
              </label>
              <Link href="/login/forgot" style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>
                비밀번호 찾기
              </Link>
            </div>

            {serverError && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.2)',
                borderRadius: 14,
                padding: '12px 16px',
                fontSize: 13, color: 'var(--color-danger)', fontWeight: 600
              }}>
                {serverError}
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="glass-btn-primary transition-all duration-100"
              style={{
                height: 54, width: '100%', borderRadius: 16, border: 'none',
                color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 8,
              }}
              onMouseDown={e => {
                e.currentTarget.style.transform = 'scale(0.97)';
                e.currentTarget.style.opacity = '0.95';
              }}
              onMouseUp={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.opacity = '1';
              }}
              onTouchStart={e => {
                e.currentTarget.style.transform = 'scale(0.97)';
                e.currentTarget.style.opacity = '0.95';
              }}
              onTouchEnd={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.opacity = '1';
              }}
            >
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 회원가입으로 이동 */}
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>아직 계정이 없으신가요? </span>
            <Link href="/login/register" style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>
              회원가입
            </Link>
          </div>

          {/* 테스트 계정 가이드 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: 14,
            padding: '10px 14px',
            marginTop: 20,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', margin: 0 }}>
              💡 테스트 계정 정보
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              이메일: 아무 이메일 형식 입력 / 비밀번호: password123
            </p>
          </div>
        </div>
      </div>

      <div className="h-12" />
    </div>
  );
}
