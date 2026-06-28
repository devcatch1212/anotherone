'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminToken } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      router.replace('/login');
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50" style={{ minHeight: '100vh', backgroundColor: '#F0F2F5' }}>
      <Sidebar />
      <div style={{ paddingLeft: '256px', minHeight: '100vh', boxSizing: 'border-box' }}>
        <main className="p-8 max-w-7xl mx-auto" style={{ padding: '32px', maxWidth: '1280px', margin: '0 auto', boxSizing: 'border-box' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
