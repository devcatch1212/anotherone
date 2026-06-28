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
    <aside className="glass-sidebar fixed bottom-0 top-0 left-0 w-64 flex flex-col z-20 border-r border-slate-200/50 bg-white/40">
      {/* 로고 영역 */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200/50">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            AnotherOne Admin
          </span>
        </Link>
      </div>

      {/* 관리자 프로필 */}
      <div className="p-6 border-b border-slate-200/50 bg-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
            {admin?.name?.substring(0, 2) || '관리'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-slate-800 truncate">{admin?.name || '관리자'}</h4>
            <p className="text-xs text-slate-400 truncate">{admin?.email || 'admin@anotherone.kr'}</p>
          </div>
        </div>
      </div>

      {/* 메뉴 링크 */}
      <nav className="flex-1 p-4 space-y-1">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
            pathname === '/dashboard' || pathname.startsWith('/dashboard/companies')
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10'
              : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
          }`}
        >
          <span>🏢</span>
          <span>근무지 목록</span>
        </Link>
      </nav>

      {/* 하단 로그아웃 */}
      <div className="p-4 border-t border-slate-200/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50/50 transition cursor-pointer"
        >
          <span>🚪</span>
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
