// ─── Offline Cache ─────────────────────────────────────────────────────────
// Caches Supabase read results in localStorage so the app can show
// the last-synced data when offline.

const CACHE_PREFIX = 'lt_cache_';

export function setCache(key: string, data: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      data,
      ts: Date.now(),
    }));
  } catch { /* quota exceeded, ignore */ }
}

export function getCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data } = JSON.parse(raw);
    return data as T;
  } catch {
    return null;
  }
}
