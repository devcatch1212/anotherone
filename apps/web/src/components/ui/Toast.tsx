'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const icons: Record<ToastType, string> = {
    success: '✓', error: '✕', warning: '⚠', info: 'ℹ',
  };

  const colors: Record<ToastType, string> = {
    success: 'bg-emerald-50/95 border-emerald-100 text-emerald-900',
    error: 'bg-rose-50/95 border-rose-100 text-rose-900',
    warning: 'bg-amber-50/95 border-amber-100 text-amber-900',
    info: 'bg-sky-50/95 border-sky-100 text-sky-900',
  };

  const iconColors: Record<ToastType, string> = {
    success: 'text-emerald-600 bg-emerald-100/60',
    error: 'text-rose-600 bg-rose-100/60',
    warning: 'text-amber-600 bg-amber-100/60',
    info: 'text-sky-600 bg-sky-100/60',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2.5 w-[calc(100%-32px)] max-w-[340px] pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-sm font-semibold shadow-lg backdrop-blur-sm pointer-events-auto',
              colors[t.type]
            )}
            style={{ 
              animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.05)'
            }}
          >
            <span className={cn('flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0', iconColors[t.type])}>
              {icons[t.type]}
            </span>
            <span className="flex-1 leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideDown { 
          from { opacity: 0; transform: translateY(-16px) scale(0.96); } 
          to { opacity: 1; transform: translateY(0) scale(1); } 
        }
      `}</style>
    </ToastContext.Provider>
  );
}
