'use client';
import { useEffect, useRef } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapHeight?: '40vh' | '60vh' | '80vh' | 'auto';
}

const snapMax: Record<string, string> = {
  '40vh': '40vh',
  '60vh': '60vh',
  '80vh': '80vh',
  'auto': '85vh',
};

export function BottomSheet({ open, onClose, title, children, snapHeight = '60vh' }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'flex-end',
      maxWidth: 390, left: '50%', transform: 'translateX(-50%)',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.42)',
          backdropFilter: 'blur(2px)',
          animation: 'bsIn 0.2s ease',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'relative', width: '100%',
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          display: 'flex', flexDirection: 'column',
          maxHeight: snapMax[snapHeight],
          animation: 'bsUp 0.28s cubic-bezier(0.32,0.72,0,1)',
          overflow: 'hidden',
        }}
      >
        {/* 드래그 핸들 */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          paddingTop: 12, paddingBottom: 4, flexShrink: 0,
        }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: '#E5E7EB' }} />
        </div>

        {/* 타이틀 헤더 */}
        {title && (
          <div style={{
            padding: '10px 20px 12px',
            borderBottom: '1px solid #F3F4F6',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 99, border: 'none',
                background: '#F3F4F6', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#6B7280', fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 콘텐츠 */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '20px 20px',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes bsIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes bsUp  { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  );
}
