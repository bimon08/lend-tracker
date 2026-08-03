'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2, Check, Cloud } from 'lucide-react';
import { onSyncStatusChange, getSyncStatus, getPendingSyncCount, fullSync } from '@/lib/syncEngine';

export default function OfflineSyncBanner() {
  const pathname = usePathname();
  const [status, setStatus] = useState(getSyncStatus());
  const [pending, setPending] = useState(getPendingSyncCount());
  const [online, setOnline] = useState(true);
  const [justSynced, setJustSynced] = useState(false);

  // Don't show on login page
  if (pathname === '/login') return null;

  useEffect(() => {
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const unsubscribe = onSyncStatusChange((newStatus, newPending) => {
      setStatus(newStatus);
      setPending(newPending);

      if (newStatus === 'idle' && newPending === 0) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 2000);
      }
    });

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't show banner when offline — indicated by dot on heading instead
  if (!online) return null;

  // Nothing to show when everything is synced and online
  if (status === 'idle' && pending === 0 && !justSynced) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center">
      <div className="mx-4 mt-[env(safe-area-inset-top,8px)] flex items-center gap-2 rounded-b-xl bg-slate-800/95 px-4 py-2 shadow-lg backdrop-blur-sm">
        {status === 'syncing' ? (
          <>
            <Loader2 size={14} className="animate-spin text-violet-400" />
            <span className="text-xs font-medium text-violet-300">
              Syncing{pending > 0 ? ` ${pending} change${pending > 1 ? 's' : ''}` : ''}...
            </span>
          </>
        ) : status === 'error' ? (
          <>
            <CloudOff size={14} className="text-red-400" />
            <span className="text-xs font-medium text-red-300">
              Sync failed
            </span>
            <button
              className="ml-1 rounded bg-red-500/20 px-2 py-0.5 text-[0.65rem] font-semibold text-red-300 hover:bg-red-500/30"
              onClick={() => fullSync()}
            >
              Retry
            </button>
          </>
        ) : pending > 0 ? (
          <>
            <Loader2 size={14} className="animate-spin text-amber-400" />
            <span className="text-xs font-medium text-amber-300">
              {pending} unsynced change{pending > 1 ? 's' : ''}
            </span>
          </>
        ) : justSynced ? (
          <>
            <Check size={14} className="text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">
              All synced
            </span>
          </>
        ) : (
          <>
            <Cloud size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-400">
              Connected
            </span>
          </>
        )}
      </div>
    </div>
  );
}
