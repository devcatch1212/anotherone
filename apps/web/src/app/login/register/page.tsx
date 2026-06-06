'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';

const schema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일 형식을 입력해주세요').min(1, '이메일을 입력해주세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
        }),
      });
      
      let json: any = {};
      try {
        json = await res.json();
      } catch (err) {
        throw new Error('서버 응답을 처리하는 중 오류가 발생했습니다. (API Fallback 작동 확인)');
      }

      if (!res.ok) throw new Error(json.message || '회원가입에 실패했습니다');
      
      // 회원가입 성공 시 즉시 자동 로그인(JWT 토큰 저장)
      setAuth(json.token, json.user);
      
      // 온보딩 미완료 유저이므로 온보딩 첫 단계로 리다이렉트
      router.replace('/onboarding/wage-type');
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : '회원가입에 실패했습니다');
    }
  };

  return (
    <div
      className="min-h-dvh flex flex-col justify-center py-8"
      style={{ background: 'transparent', width: '100%', boxSizing: 'border-box' }}
    >
      {/* 상단 헤더 */}
      <div className="flex flex-col items-center pb-6 px-6">
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
          계정 만들기
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, fontWeight: 500 }}>
          근무관리를 시작하기 위한 회원정보 입력
        </p>
      </div>

      {/* 가입 카드 */}
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
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 20 }}>회원가입</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            
            {/* 이름 */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>이름</label>
              <input
                {...register('name')}
                type="text"
                placeholder="홍길동"
                style={{
                  width: '100%', height: 44, borderRadius: 12,
                  border: errors.name ? '1px solid var(--color-vacation)' : '1px solid rgba(255, 255, 255, 0.5)',
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
                  e.target.style.border = errors.name ? '1px solid var(--color-vacation)' : '1px solid rgba(255, 255, 255, 0.5)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {errors.name && (
                <p style={{ fontSize: 11, color: 'var(--color-vacation)', fontWeight: 600, marginTop: 2 }}>⚠ {errors.name.message}</p>
              )}
            </div>

            {/* 이메일 */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>이메일</label>
              <input
                {...register('email')}
                type="text"
                placeholder="example@company.com"
                style={{
                  width: '100%', height: 44, borderRadius: 12,
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
              />
              {errors.email && (
                <p style={{ fontSize: 11, color: 'var(--color-vacation)', fontWeight: 600, marginTop: 2 }}>⚠ {errors.email.message}</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>비밀번호</label>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="6자 이상 입력"
                style={{
                  width: '100%', height: 44, borderRadius: 12,
                  border: errors.password ? '1px solid var(--color-vacation)' : '1px solid rgba(255, 255, 255, 0.5)',
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
                  e.target.style.border = errors.password ? '1px solid var(--color-vacation)' : '1px solid rgba(255, 255, 255, 0.5)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {errors.password && (
                <p style={{ fontSize: 11, color: 'var(--color-vacation)', fontWeight: 600, marginTop: 2 }}>⚠ {errors.password.message}</p>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>비밀번호 확인</label>
              <input
                {...register('confirmPassword')}
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호 재입력"
                style={{
                  width: '100%', height: 44, borderRadius: 12,
                  border: errors.confirmPassword ? '1px solid var(--color-vacation)' : '1px solid rgba(255, 255, 255, 0.5)',
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
                  e.target.style.border = errors.confirmPassword ? '1px solid var(--color-vacation)' : '1px solid rgba(255, 255, 255, 0.5)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {errors.confirmPassword && (
                <p style={{ fontSize: 11, color: 'var(--color-vacation)', fontWeight: 600, marginTop: 2 }}>⚠ {errors.confirmPassword.message}</p>
              )}
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

            {/* 가입 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="glass-btn-primary transition-all duration-100"
              style={{
                height: 50, width: '100%', borderRadius: 16, border: 'none',
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
              {isSubmitting ? '가입 중...' : '회원가입 완료'}
            </button>
          </form>

          {/* 로그인 화면으로 복귀 링크 */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>이미 계정이 있으신가요? </span>
            <Link href="/login" style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>
              로그인하기
            </Link>
          </div>

        </div>
      </div>

      <div className="h-12" />
    </div>
  );
}
