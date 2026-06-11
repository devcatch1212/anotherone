'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Notification } from '@/types';
import { mockNotifications } from '@/mocks/data/notifications';

const TYPE_ICON: Record<string, string> = {
  payroll_issued: '💰',
  leave_approved: '✅',
  leave_rejected: '❌',
  overtime_approved: '⏰',
  overtime_rejected: '🚫',
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(({ notifications: n }) => setNotifications(n))
      .catch(() => {});
  }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleReadAll = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      await Promise.all(
        unreadNotifications.map(n =>
          fetch(`/api/notifications/${n.id}/read`, { method: 'POST' })
        )
      );
    } catch (e) {
      console.error('알림 읽음 처리에 실패했습니다.', e);
    }
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'transparent' }}>
      
      {/* 상단 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.3px', margin: 0 }}>
              알림
            </h1>
            {unread > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 800, color: '#fff',
                background: 'var(--color-danger)', borderRadius: 10,
                padding: '2px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {unread}
              </span>
            )}
          </div>
        </div>

        {unread > 0 && (
          <button onClick={handleReadAll}
            className="transition-all active:opacity-60"
            style={{
              fontSize: 12, fontWeight: 700, color: 'var(--color-primary)',
              border: 'none', background: 'transparent', cursor: 'pointer',
              padding: '6px 12px', borderRadius: 8,
            }}>
            모두 읽음
          </button>
        )}
      </div>

      {/* 본문 콘텐츠 */}
      <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notifications.length === 0 ? (
          <div className="glass-card" style={{
            borderRadius: 24, padding: '40px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
          }}>
            <span style={{ fontSize: 36 }}>🔔</span>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-muted)', margin: 0 }}>알림이 없습니다</p>
          </div>
        ) : notifications.map(n => (
          <button key={n.id} onClick={() => markRead(n.id)}
            className="transition-all duration-300"
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              borderRadius: 20, padding: '16px 16px', display: 'flex', alignItems: 'start', gap: 12,
              background: n.read ? 'rgba(255, 255, 255, 0.45)' : 'rgba(59, 130, 246, 0.06)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: n.read ? '1px solid rgba(255, 255, 255, 0.6)' : '1px solid rgba(59, 130, 246, 0.2)',
              boxShadow: n.read ? 'none' : '0 8px 32px 0 rgba(59, 130, 246, 0.03)',
            }}>
            <span style={{ fontSize: 24, marginTop: 2, flexShrink: 0 }}>{TYPE_ICON[n.type] ?? '📣'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 8 }}>
                <p style={{
                  fontSize: 14, fontWeight: n.read ? 600 : 800, lineHeight: 1.4,
                  color: n.read ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                  margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {n.title}
                </p>
                {!n.read && (
                  <span style={{
                    width: 7, height: 7, background: 'var(--color-primary)', borderRadius: '50%',
                    flexShrink: 0, marginTop: 6,
                    boxShadow: '0 0 6px var(--color-primary)'
                  }} />
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.5, margin: 0 }}>
                {n.body}
              </p>
              <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 8, margin: 0 }}>
                {n.createdAt.slice(0, 10)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
