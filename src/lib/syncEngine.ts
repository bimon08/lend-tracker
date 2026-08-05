'use client';

import { localDb } from './localDb';
import { createClient } from '@/lib/supabase/client';

// ─── Sync Status ─────────────────────────────────────────────────────────────

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

let syncStatus: SyncStatus = 'idle';
let lastSyncTime: number = 0;
let pendingCount: number = 0;
let lastSyncHadChanges: boolean = false;
const listeners = new Set<(status: SyncStatus, pending: number, hadChanges: boolean) => void>();

export function getSyncStatus() { return syncStatus; }
export function getLastSyncTime() { return lastSyncTime; }
export function getPendingSyncCount() { return pendingCount; }
export function getLastSyncHadChanges() { return lastSyncHadChanges; }

export function onSyncStatusChange(cb: (status: SyncStatus, pending: number, hadChanges: boolean) => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function setSyncStatus(status: SyncStatus) {
  syncStatus = status;
  listeners.forEach(cb => cb(status, pendingCount, lastSyncHadChanges));
}

async function updatePendingCount() {
  const p = await localDb.persons.where('_syncStatus').anyOf(['pending', 'deleted']).count();
  const t = await localDb.transactions.where('_syncStatus').anyOf(['pending', 'deleted']).count();
  const pm = await localDb.payments.where('_syncStatus').anyOf(['pending', 'deleted']).count();
  pendingCount = p + t + pm;
  listeners.forEach(cb => cb(syncStatus, pendingCount, lastSyncHadChanges));
}

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// ─── User ID Cache ───────────────────────────────────────────────────────────

export function getCachedUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lt_user_id');
}

export function setCachedUserId(userId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lt_user_id', userId);
}

export async function ensureUserId(): Promise<string> {
  const cached = getCachedUserId();
  if (cached) return cached;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCachedUserId(user.id);
      return user.id;
    }
  } catch {
    // Supabase unreachable
  }

  throw new Error('No user ID available');
}

// ─── Pull from Supabase → IndexedDB ─────────────────────────────────────────

export async function pullFromSupabase(): Promise<void> {
  if (!isOnline()) return;

  const supabase = createClient();

  // Collect IDs of locally-modified records so we don't overwrite them with server data.
  // Records with 'pending' or 'deleted' status have unsynced local changes that must be preserved.
  const localPendingPersonIds = new Set(
    (await localDb.persons.where('_syncStatus').anyOf(['pending', 'deleted']).toArray()).map(p => p.id)
  );
  const localPendingTxnIds = new Set(
    (await localDb.transactions.where('_syncStatus').anyOf(['pending', 'deleted']).toArray()).map(t => t.id)
  );
  const localPendingPaymentIds = new Set(
    (await localDb.payments.where('_syncStatus').anyOf(['pending', 'deleted']).toArray()).map(p => p.id)
  );

  // Fetch persons
  const { data: persons, error: e1 } = await supabase
    .from('persons')
    .select('*');
  if (!e1 && persons) {
    // Only put records that don't have local pending changes
    const safeToPut = persons.filter(p => !localPendingPersonIds.has(p.id));
    if (safeToPut.length > 0) {
      await localDb.persons.bulkPut(
        safeToPut.map(p => ({
          ...p,
          _syncStatus: 'synced' as const,
          _lastModified: Date.now(),
        }))
      );
    }
    // Remove local synced records that no longer exist on server (deleted from other device)
    const serverIds = new Set(persons.map(p => p.id));
    const localPersons = await localDb.persons.where('_syncStatus').equals('synced').toArray();
    const toDelete = localPersons.filter(p => !serverIds.has(p.id)).map(p => p.id);
    if (toDelete.length > 0) await localDb.persons.bulkDelete(toDelete);
  }

  const { data: transactions, error: e2 } = await supabase
    .from('transactions')
    .select('*');
  if (!e2 && transactions) {
    const safeToPut = transactions.filter(t => !localPendingTxnIds.has(t.id));
    if (safeToPut.length > 0) {
      await localDb.transactions.bulkPut(
        safeToPut.map(t => ({
          ...t,
          _syncStatus: 'synced' as const,
          _lastModified: Date.now(),
        }))
      );
    }
    const serverIds = new Set(transactions.map(t => t.id));
    const localTxns = await localDb.transactions.where('_syncStatus').equals('synced').toArray();
    const toDelete = localTxns.filter(t => !serverIds.has(t.id)).map(t => t.id);
    if (toDelete.length > 0) await localDb.transactions.bulkDelete(toDelete);
  }

  // Fetch payments
  const { data: payments, error: e3 } = await supabase
    .from('payments')
    .select('*');
  if (!e3 && payments) {
    const safeToPut = payments.filter(p => !localPendingPaymentIds.has(p.id));
    if (safeToPut.length > 0) {
      await localDb.payments.bulkPut(
        safeToPut.map(p => ({
          ...p,
          _syncStatus: 'synced' as const,
          _lastModified: Date.now(),
        }))
      );
    }
    const serverIds = new Set(payments.map(p => p.id));
    const localPayments = await localDb.payments.where('_syncStatus').equals('synced').toArray();
    const toDelete = localPayments.filter(p => !serverIds.has(p.id)).map(p => p.id);
    if (toDelete.length > 0) await localDb.payments.bulkDelete(toDelete);
  }
}

// ─── Push from IndexedDB → Supabase ─────────────────────────────────────────

export async function pushToSupabase(): Promise<{ pushed: number; failed: number }> {
  if (!isOnline()) return { pushed: 0, failed: 0 };

  const supabase = createClient();
  let pushed = 0;
  let failed = 0;

  // Push pending persons
  const pendingPersons = await localDb.persons.where('_syncStatus').equals('pending').toArray();
  for (const person of pendingPersons) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _syncStatus, _lastModified, ...row } = person;
      const { error } = await supabase.from('persons').upsert(row);
      if (!error) {
        await localDb.persons.update(person.id, { _syncStatus: 'synced' });
        pushed++;
      } else { failed++; }
    } catch { failed++; }
  }

  // Push deleted persons
  const deletedPersons = await localDb.persons.where('_syncStatus').equals('deleted').toArray();
  for (const person of deletedPersons) {
    try {
      await supabase.from('user_active_people').delete().eq('person_id', person.id);
      await supabase.from('payments').delete().eq('user_id', person.user_id);
      const { error } = await supabase.from('persons').delete().eq('id', person.id);
      if (!error) {
        await localDb.persons.delete(person.id);
        pushed++;
      } else { failed++; }
    } catch { failed++; }
  }

  // Push pending transactions
  const pendingTxns = await localDb.transactions.where('_syncStatus').equals('pending').toArray();
  for (const txn of pendingTxns) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _syncStatus, _lastModified, ...row } = txn;
      const { error } = await supabase.from('transactions').upsert(row);
      if (!error) {
        await localDb.transactions.update(txn.id, { _syncStatus: 'synced' });
        pushed++;
      } else { failed++; }
    } catch { failed++; }
  }

  // Push deleted transactions
  const deletedTxns = await localDb.transactions.where('_syncStatus').equals('deleted').toArray();
  for (const txn of deletedTxns) {
    try {
      await supabase.from('payments').delete().eq('transaction_id', txn.id);
      const { error } = await supabase.from('transactions').delete().eq('id', txn.id);
      if (!error) {
        await localDb.transactions.delete(txn.id);
        pushed++;
      } else { failed++; }
    } catch { failed++; }
  }

  // Push pending payments
  const pendingPayments = await localDb.payments.where('_syncStatus').equals('pending').toArray();
  for (const payment of pendingPayments) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _syncStatus, _lastModified, ...row } = payment;
      const { error } = await supabase.from('payments').upsert(row);
      if (!error) {
        await localDb.payments.update(payment.id, { _syncStatus: 'synced' });
        pushed++;
      } else { failed++; }
    } catch { failed++; }
  }

  // Push deleted payments
  const deletedPayments = await localDb.payments.where('_syncStatus').equals('deleted').toArray();
  for (const payment of deletedPayments) {
    try {
      const { error } = await supabase.from('payments').delete().eq('id', payment.id);
      if (!error) {
        await localDb.payments.delete(payment.id);
        pushed++;
      } else { failed++; }
    } catch { failed++; }
  }

  return { pushed, failed };
}

// ─── Full Sync ───────────────────────────────────────────────────────────────

let syncPromise: Promise<void> | null = null;

export async function fullSync(): Promise<void> {
  // Prevent concurrent syncs
  if (syncPromise) return syncPromise;

  if (!isOnline()) {
    setSyncStatus('offline');
    return;
  }

  syncPromise = (async () => {
    // Only show 'syncing' status if there are pending changes to push
    const hadPendingBefore = pendingCount > 0;
    if (hadPendingBefore) {
      setSyncStatus('syncing');
    }
    try {
      const pushResult = await pushToSupabase();
      await pullFromSupabase();
      lastSyncTime = Date.now();
      const prevPending = pendingCount;
      await updatePendingCount();
      // Track whether this sync actually did something meaningful
      lastSyncHadChanges = pushResult.pushed > 0 || (hadPendingBefore && prevPending !== pendingCount);
      // Notify hooks to re-render with fresh data from pull
      try {
        const { notifyDataChange } = await import('./hooks');
        notifyDataChange();
      } catch { /* hooks not loaded yet */ }
      setSyncStatus('idle');
    } catch (e) {
      console.error('Sync failed:', e);
      setSyncStatus('error');
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

// Notify sync engine that local data changed (triggers pending count update + background sync + UI refresh)
export async function notifyLocalChange() {
  await updatePendingCount();
  // Notify hooks to re-render with fresh data
  try {
    const { notifyDataChange } = await import('./hooks');
    notifyDataChange();
  } catch { /* hooks not loaded yet */ }
  // Debounced background sync
  if (isOnline()) {
    clearTimeout(syncDebounce);
    syncDebounce = setTimeout(() => fullSync(), 2000) as unknown as number;
  }
}
let syncDebounce: number;

// ─── Initialize ──────────────────────────────────────────────────────────────

let initialized = false;

export function initSync() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('online', () => {
    setSyncStatus('idle');
    fullSync();
  });

  window.addEventListener('offline', () => {
    setSyncStatus('offline');
  });

  // Initial sync
  if (isOnline()) {
    // Delay to let auth cookies settle
    setTimeout(() => fullSync(), 1500);
  } else {
    setSyncStatus('offline');
  }

  // Periodic sync every 5 minutes
  setInterval(() => {
    if (isOnline()) fullSync();
  }, 5 * 60 * 1000);
}
