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
  // Dispatch event so UI can react
  window.dispatchEvent(new CustomEvent('offline-queue-update', { detail: { count: queue.length } }));
}

export function getQueueCount(): number {
  return getQueue().length;
}

export function clearQueue() {
  saveQueue([]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-queue-update', { detail: { count: 0 } }));
  }
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export async function syncQueue(
  executor: (action: string, args: unknown[]) => Promise<void>
): Promise<{ synced: number; failed: number }> {
  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: QueuedAction[] = [];

  for (const item of queue) {
    try {
      await executor(item.action, item.args);
      synced++;
    } catch (e) {
      console.error('Sync failed for', item.action, e);
      item.retries++;
      if (item.retries < 5) {
        remaining.push(item);
      }
      failed++;
    }
  }

  saveQueue(remaining);
  window.dispatchEvent(
    new CustomEvent('offline-queue-update', { detail: { count: remaining.length } })
  );

  return { synced, failed };
}

// ─── Online Check ────────────────────────────────────────────────────────────

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}
