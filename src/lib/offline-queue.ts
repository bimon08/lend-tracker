'use client';

import { generateId } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QueuedAction {
  id: string;
  action: string;
  args: unknown[];
  createdAt: string;
  retries: number;
}

const QUEUE_KEY = 'lendtracker_offline_queue';

// ─── Queue Management ────────────────────────────────────────────────────────

function getQueue(): QueuedAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedAction[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function addToQueue(action: string, args: unknown[]) {
  const queue = getQueue();
  queue.push({
    id: generateId(),
    action,
    args,
    createdAt: new Date().toISOString(),
    retries: 0,
  });
  saveQueue(queue);
  window.dispatchEvent(new CustomEvent('offline-queue-update', { detail: { count: queue.length } }));
}

export function getQueueCount(): number {
  return getQueue().length;
}

export function removeFromQueue(id: string) {
  const queue = getQueue().filter(item => item.id !== id);
  saveQueue(queue);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-queue-update', { detail: { count: queue.length } }));
  }
}

export function clearQueue() {
  saveQueue([]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-queue-update', { detail: { count: 0 } }));
  }
}

// ─── Sync with Conflict Checking ─────────────────────────────────────────────

export async function syncQueueWithConflictCheck(
  executor: (action: string, args: unknown[]) => Promise<void>,
  conflictChecker: (item: QueuedAction) => Promise<'ok' | 'conflict'>
): Promise<{ synced: number; failed: number; conflicted: number }> {
  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, conflicted: 0 };

  let synced = 0;
  let failed = 0;
  let conflicted = 0;

  for (const item of queue) {
    // Check for conflicts on update operations
    const status = await conflictChecker(item);
    if (status === 'conflict') {
      // Remove from queue — the conflict modal will handle resolution
      removeFromQueue(item.id);
      conflicted++;
      return { synced, failed, conflicted }; // Pause sync for user input
    }

    try {
      await executor(item.action, item.args);
      removeFromQueue(item.id);
      synced++;
    } catch (e) {
      console.error('Sync failed for', item.action, e);
      item.retries++;
      if (item.retries >= 5) {
        removeFromQueue(item.id); // Give up after 5 retries
      }
      failed++;
    }
  }

  return { synced, failed, conflicted };
}

// ─── Simple Sync (no conflict checking) ──────────────────────────────────────

export async function syncQueue(
  executor: (action: string, args: unknown[]) => Promise<void>
): Promise<{ synced: number; failed: number }> {
  const result = await syncQueueWithConflictCheck(executor, async () => 'ok');
  return { synced: result.synced, failed: result.failed };
}

// ─── Online Check ────────────────────────────────────────────────────────────

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}
