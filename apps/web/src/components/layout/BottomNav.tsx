'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ACTIVE = '#111827';
const IDLE   = '#9CA3AF';

const tabs = [
  {
    href: '/home',
    label: '홈',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill={active ? ACTIVE : IDLE} />
      </svg>
    ),
  },
  {
    href: '/payroll',
    label: '급여',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="2.5" stroke={active ? ACTIVE : IDLE} strokeWidth="1.8" />
        <path d="M2 10h20" stroke={active ? ACTIVE : IDLE} strokeWidth="1.8" />
        <rect x="6" y="14" width="4" height="2" rx="1" fill={active ? ACTIVE : IDLE} />
      </svg>
    ),
  },
  {
    href: '/calendar',
    label: '캘린더',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2.5" stroke={active ? ACTIVE : IDLE} strokeWidth="1.8" />
        <path d="M16 2v4M8 2v4M3 10h18" stroke={active ? ACTIVE : IDLE} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8"  cy="15" r="1.1" fill={active ? ACTIVE : IDLE} />
        <circle cx="12" cy="15" r="1.1" fill={active ? ACTIVE : IDLE} />
        <circle cx="16" cy="15" r="1.1" fill={active ? ACTIVE : IDLE} />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: '설정',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={active ? ACTIVE : IDLE} strokeWidth="1.8" />
        <path d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77"
          stroke={active ? ACTIVE : IDLE} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 w-full bg-white z-40 safe-bottom"
      style={{
        maxWidth: 390,
        left: '50%',
        transform: 'translateX(-50%)',
        borderTop: '1px solid #F0F0F2',
      }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-0.5 flex-1 py-2 relative"
            >
              <div className="relative">
                {tab.icon(active)}
                {tab.href === '/home' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[10px] font-semibold tracking-tight',
                active ? 'text-gray-900' : 'text-gray-400'
              )}>
                {tab.label}
              </span>
              {active && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gray-900" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
