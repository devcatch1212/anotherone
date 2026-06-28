'use client';

import { useRouter, usePathname } from 'next/navigation';
import { removeAdminToken, getAdminUser } from '@/lib/auth';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    setAdmin(getAdminUser());
  }, []);

  const handleLogout = () => {
    removeAdminToken();
    router.push('/login');
  };

  return (
    <aside 
      className="glass-sidebar fixed bottom-0 top-0 left-0 flex flex-col z-20 bg-white border-r border-slate-200"
      style={{ 
        width: '256px', 
        minWidth: '256px', 
        maxWidth: '256px', 
        boxSizing: 'border-box' 
      }}
    >
      {/* 로고 영역 */}
      <div 
        className="h-20 flex items-center px-6 border-b border-slate-100"
        style={{ 
          height: '80px', 
          borderBottom: '1px solid #F1F5F9', 
          boxSizing: 'border-box', 
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Link href="/dashboard" className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span 
            className="text-xl font-extrabold text-[#1E3A8A] tracking-tight"
            style={{ fontSize: '20px', fontWeight: '800', color: '#1E3A8A' }}
          >
            AnotherOne Admin
          </span>
        </Link>
      </div>

      {/* 관리자 프로필 */}
      <div 
        className="p-6 border-b border-slate-100 bg-slate-50/30"
        style={{ padding: '24px', borderBottom: '1px solid #F1F5F9', boxSizing: 'border-box' }}
      >
        <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0"
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '9999px', 
              backgroundColor: '#EFF6FF', 
              border: '1px solid #DBEAFE', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#2563EB', 
              fontWeight: '700', 
              fontSize: '14px',
              flexShrink: 0
            }}
          >
            {admin?.name?.substring(0, 2) || '관리'}
          </div>
          <div className="overflow-hidden" style={{ overflow: 'hidden' }}>
            <h4 
              className="text-sm font-bold text-slate-800 truncate" 
              style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', margin: 0 }}
            >
              {admin?.name || '관리자'}
            </h4>
            <p 
              className="text-xs text-slate-400 truncate" 
              style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0' }}
            >
              {admin?.email || 'admin@anotherone.kr'}
            </p>
          </div>
        </div>
      </div>

      {/* 메뉴 링크 */}
      <nav className="flex-1 p-4 space-y-1" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
            pathname === '/dashboard' || (pathname.startsWith('/dashboard/companies') && !pathname.includes('requests'))
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            textDecoration: 'none'
          }}
        >
          <span style={{ fontSize: '16px' }}>🏢</span>
          <span>근무지 목록</span>
        </Link>

        <Link
          href="/dashboard/requests"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
            pathname.startsWith('/dashboard/requests')
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            textDecoration: 'none'
          }}
        >
          <span style={{ fontSize: '16px' }}>⏰</span>
          <span>근태 관리</span>
        </Link>

        <Link
          href="/dashboard/payroll"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
            pathname.startsWith('/dashboard/payroll')
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            textDecoration: 'none'
          }}
        >
          <span style={{ fontSize: '16px' }}>💵</span>
          <span>급여 정산</span>
        </Link>

      </nav>

      {/* 하단 설정 & 로그아웃 */}
      <div 
        className="p-4 border-t border-slate-100 flex flex-col gap-2"
        style={{ padding: '16px', borderTop: '1px solid #F1F5F9', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
            pathname.startsWith('/dashboard/settings')
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            textDecoration: 'none'
          }}
        >
          <span style={{ fontSize: '16px' }}>⚙️</span>
          <span>설정</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition cursor-pointer"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#EF4444',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <span style={{ fontSize: '16px' }}>🚪</span>
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
