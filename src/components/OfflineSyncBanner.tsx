'use client';

import { useState, useEffect, useCallback } from 'react';
import { CloudOff, Loader2 } from 'lucide-react';
import { getQueueCount, syncQueue, isOnline } from '@/lib/offline-queue';
import { dataLayer } from '@/lib/db';

// Execute a queued action against the real data layer
async function executeAction(action: string, args: unknown[]) {
  switch (action) {
    case 'addPerson':
      await dataLayer.addPerson(args[0] as Parameters<typeof dataLayer.addPerson>[0]);
      break;
    case 'addTransaction':
      await dataLayer.addTransaction(args[0] as Parameters<typeof dataLayer.addTransaction>[0]);
      break;
    case 'addPayment':
      await dataLayer.addPayment(args[0] as Parameters<typeof dataLayer.addPayment>[0]);
      break;
    case 'updatePerson':
      await dataLayer.updatePerson(args[0] as string, args[1] as Parameters<typeof dataLayer.updatePerson>[1]);
      break;
    case 'deletePerson':
      await dataLayer.deletePerson(args[0] as string);
      break;
    case 'deleteTransaction':
      await dataLayer.deleteTransaction(args[0] as string);
      break;
    case 'deletePayment':
      await dataLayer.deletePayment(args[0] as string, args[1] as string);
      break;
    default:
      console.warn('Unknown offline action:', action);
  }
}

export default function OfflineSyncBanner() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);

  const updateCount = useCallback(() => {
    setPendingCount(getQueueCount());
  }, []);

  const doSync = useCallback(async () => {
    if (syncing) return;
    const count = getQueueCount();
    if (count === 0) return;

    setSyncing(true);
    try {
      await syncQueue(executeAction);
    } catch (e) {
      console.error('Sync error:', e);
    } finally {
      setSyncing(false);
      updateCount();
    }
  }, [syncing, updateCount]);

  useEffect(() => {
    updateCount();
    setOnline(isOnline());

    const handleOnline = () => {
      setOnline(true);
      // Auto-sync after a short delay
      setTimeout(() => doSync(), 1000);
    };
    const handleOffline = () => setOnline(false);
    const handleQueueUpdate = () => updateCount();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-update', handleQueueUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-update', handleQueueUpdate);
    };
  }, [updateCount, doSync]);

  // Auto-sync on mount if online and has pending
  useEffect(() => {
    if (online && getQueueCount() > 0) {
      doSync();
    }
  }, [online, doSync]);

  // Nothing to show
  if (pendingCount === 0 && online) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center">
      <div className="mx-4 mt-[env(safe-area-inset-top,8px)] flex items-center gap-2 rounded-b-xl bg-slate-800/95 px-4 py-2 shadow-lg backdrop-blur-sm">
        {!online ? (
          <>
            <CloudOff size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-amber-300">
              Offline{pendingCount > 0 ? ` · ${pendingCount} change${pendingCount > 1 ? 's' : ''} pending` : ''}
            </span>
          </>
        ) : syncing ? (
          <>
            <Loader2 size={14} className="animate-spin text-violet-400" />
            <span className="text-xs font-medium text-violet-300">
              Syncing {pendingCount} change{pendingCount > 1 ? 's' : ''}...
            </span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <Loader2 size={14} className="animate-spin text-amber-400" />
            <span className="text-xs font-medium text-amber-300">
              {pendingCount} unsynced change{pendingCount > 1 ? 's' : ''}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
