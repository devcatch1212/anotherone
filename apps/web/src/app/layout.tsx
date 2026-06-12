import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui';
import { Analytics } from '@vercel/analytics/next';
import AppUpdateChecker from '@/components/AppUpdateChecker';
import { MSWProvider } from './msw-provider';

export const metadata: Metadata = {
  title: '근무 관리 - 출퇴근 & 급여 확인',
  description: '출퇴근 체크, 급여명세서 조회, 연차 관리를 한 곳에서',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#111827',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <AppUpdateChecker />
        {process.env.NODE_ENV === 'development' ? (
          <MSWProvider>
            <ToastProvider>{children}</ToastProvider>
          </MSWProvider>
        ) : (
          <ToastProvider>{children}</ToastProvider>
        )}
        <Analytics />
      </body>
    </html>
  );
}
