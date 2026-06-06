'use client';
import { useState, useEffect } from 'react';
import { Notification } from '@/types';
import { mockNotifications } from '@/mocks/data/notifications';
import { formatDate } from '@/lib/utils';

const TYPE_ICON: Record<string, string> = {
  payroll_issued: '💰',
  leave_approved: '✅',
  leave_rejected: '❌',
  overtime_approved: '⏰',
  overtime_rejected: '🚫',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(({ notifications: n }) => setNotifications(n)).catch(() => {});
  }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-gray-900">알림</h1>
          {unread > 0 && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">{unread}</span>}
        </div>
        {unread > 0 && (
          <button onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
            className="text-xs text-blue-500 font-medium">모두 읽음</button>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 pb-24">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-4xl">🔔</p>
            <p className="text-sm text-gray-400">알림이 없습니다</p>
          </div>
        ) : notifications.map(n => (
          <button key={n.id} onClick={() => markRead(n.id)}
            className={`w-full text-left rounded-2xl border px-4 py-4 flex items-start gap-3 transition-all ${n.read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100'}`}>
            <span className="text-2xl mt-0.5 flex-shrink-0">{TYPE_ICON[n.type] ?? '📣'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-semibold leading-snug ${n.read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.body}</p>
              <p className="text-xs text-gray-400 mt-1.5">{n.createdAt.slice(0, 10)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
