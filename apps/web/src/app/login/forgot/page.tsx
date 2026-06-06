'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-gray-50">
      <div className="flex items-center px-5 h-14">
        <Link href="/login" className="flex items-center gap-1 text-gray-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-sm">로그인으로</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6">
        {!sent ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                    fill="#3B82F6"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center">비밀번호 찾기</h2>
            <p className="text-sm text-gray-500 text-center mt-2 mb-6">
              가입한 이메일로 재설정 링크를 보내드립니다
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="가입한 이메일 주소"
                required
                className="h-12 rounded-xl border border-gray-200 px-4 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button
                type="submit"
                className="h-12 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors"
              >
                재설정 링크 보내기
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="text-5xl mb-4">📬</div>
            <h3 className="text-lg font-bold text-gray-900">이메일을 확인하세요</h3>
            <p className="text-sm text-gray-500 mt-2 mb-6">
              <strong>{email}</strong>로<br />
              비밀번호 재설정 링크를 보냈습니다
            </p>
            <button
              onClick={() => router.replace('/login')}
              className="h-12 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors"
            >
              로그인으로 이동
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
