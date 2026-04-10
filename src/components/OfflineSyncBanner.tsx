'use client';

import { useState, useEffect, useCallback } from 'react';
import { CloudOff, Loader2 } from 'lucide-react';
import { getQueueCount, syncQueueWithConflictCheck, isOnline, type QueuedAction } from '@/lib/offline-queue';
import { dataLayer } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';
import ConflictModal, { type ConflictData } from '@/components/ConflictModal';

// Execute a non-conflicting action
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

// Check if an update action conflicts with the server
async function checkConflict(item: QueuedAction): Promise<ConflictData | null> {
  // Only updates can conflict
  if (item.action !== 'updatePerson') return null;

  const supabase = createClient();
  const id = item.args[0] as string;
  const offlineUpdates = item.args[1] as Record<string, unknown>;

  const { data: serverRow } = await supabase
    .from('persons')
    .select('*')
    .eq('id', id)
    .single();

  if (!serverRow) return null; // Record deleted on server, no conflict

  // If server was updated after the offline change was queued, it's a conflict
  const serverUpdatedAt = serverRow.updated_at
    ? new Date(serverRow.updated_at).getTime()
    : new Date(serverRow.created_at).getTime();
  const offlineQueuedAt = new Date(item.createdAt).getTime();

  if (serverUpdatedAt > offlineQueuedAt) {
    return {
      queuedAction: { action: item.action, args: item.args, createdAt: item.createdAt },
      serverData: serverRow,
      offlineData: { ...serverRow, ...offlineUpdates },
      label: `Update: ${serverRow.name || 'Unknown'}`,
    };
  }

  return null; // No conflict, offline change is newer
}

export default function OfflineSyncBanner() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const [conflict, setConflict] = useState<ConflictData | null>(null);
  const [conflictItem, setConflictItem] = useState<QueuedAction | null>(null);
  const [remainingConflicts, setRemainingConflicts] = useState(0);

  const updateCount = useCallback(() => {
    setPendingCount(getQueueCount());
  }, []);

  const doSync = useCallback(async () => {
    if (syncing || conflict) return;
    const count = getQueueCount();
    if (count === 0) return;

    setSyncing(true);
    try {
      await syncQueueWithConflictCheck(
        executeAction,
        async (item) => {
          const c = await checkConflict(item);
          if (c) {
            // Pause sync and show conflict modal
            setConflict(c);
            setConflictItem(item);
            setSyncing(false);
            return 'conflict';
          }
          return 'ok';
        }
      );
    } catch (e) {
      console.error('Sync error:', e);
    } finally {
      setSyncing(false);
      updateCount();
    }
  }, [syncing, conflict, updateCount]);

  const handleResolve = useCallback(async (choice: 'server' | 'offline') => {
    if (!conflictItem) return;

    if (choice === 'offline') {
      // Apply offline changes
      try {
        await executeAction(conflictItem.action, conflictItem.args);
      } catch (e) {
        console.error('Failed to apply offline change:', e);
      }
    }
    // If 'server', we just skip — server version stays

    setConflict(null);
    setConflictItem(null);
    updateCount();

    // Continue syncing remaining items
    setTimeout(() => doSync(), 500);
  }, [conflictItem, updateCount, doSync]);

  const handleSkip = useCallback(() => {
    setConflict(null);
    setConflictItem(null);
    updateCount();
    setTimeout(() => doSync(), 500);
  }, [updateCount, doSync]);

  useEffect(() => {
    updateCount();
    setOnline(isOnline());

    const handleOnline = () => {
      setOnline(true);
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
    if (online && getQueueCount() > 0 && !conflict) {
      doSync();
    }
  }, [online, doSync, conflict]);

  return (
    <>
      {/* Conflict Modal */}
      {conflict && (
        <ConflictModal
          conflict={conflict}
          onResolve={handleResolve}
          onSkip={handleSkip}
          remaining={remainingConflicts}
        />
      )}

      {/* Status Banner */}
      {(pendingCount > 0 || !online) && (
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
      )}
    </>
  );
}
