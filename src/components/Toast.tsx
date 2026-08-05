'use client';

import { useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'success',
    visible: false,
  });

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      setToast({ message, type, visible: true });
      setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
    },
    []
  );

  const borderColor =
    toast.type === 'success'
      ? 'border-emerald-500/30'
      : toast.type === 'error'
      ? 'border-red-500/30'
      : 'border-blue-500/30';

  const ToastElement: ReactNode = toast.visible ? (
    <div
      className={`fixed left-1/2 top-4 z-[9999] -translate-x-1/2 animate-in rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-lg ${borderColor}`}
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(30px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(30px) saturate(1.6)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: 'inset 0 0 2px 1px rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {toast.message}
    </div>
  ) : null;

  return { showToast, ToastElement };
}
