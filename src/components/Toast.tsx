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

  const bgColor =
    toast.type === 'success'
      ? 'bg-emerald-500/90'
      : toast.type === 'error'
      ? 'bg-red-500/90'
      : 'bg-blue-500/90';

  const ToastElement: ReactNode = toast.visible ? (
    <div
      className={`fixed left-1/2 top-4 z-[9999] -translate-x-1/2 animate-in rounded-full ${bgColor} px-5 py-2.5 text-sm font-medium text-white shadow-lg backdrop-blur-sm`}
    >
      {toast.message}
    </div>
  ) : null;

  return { showToast, ToastElement };
}
