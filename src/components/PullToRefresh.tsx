'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Check, ArrowDown, Loader2 } from 'lucide-react';
import { fullSync } from '@/lib/syncEngine';

const PULL_THRESHOLD = 70;
const MAX_PULL = 110;

type RefreshState = 'idle' | 'pulling' | 'threshold' | 'refreshing' | 'done';

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RefreshState>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pulling = useRef(false);

  const isScrolledToTop = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isScrolledToTop()) return;
    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
    pulling.current = false;
  }, [isScrolledToTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (state === 'refreshing' || state === 'done') return;

    const y = e.touches[0].clientY;
    const diff = y - startY.current;

    // Only activate when pulling down from top
    if (diff < 0 || !isScrolledToTop()) {
      if (pulling.current) {
        pulling.current = false;
        setPullDistance(0);
        setState('idle');
      }
      return;
    }

    // Prevent default browser pull-to-refresh
    if (diff > 10) {
      e.preventDefault();
      pulling.current = true;
    }

    if (!pulling.current) return;

    // Apply resistance — diminishing returns as you pull further
    const resistance = Math.min(diff * 0.45, MAX_PULL);
    currentY.current = y;
    setPullDistance(resistance);

    if (resistance >= PULL_THRESHOLD) {
      setState('threshold');
    } else {
      setState('pulling');
    }
  }, [state, isScrolledToTop]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setState('refreshing');
      setPullDistance(PULL_THRESHOLD);
      try {
        await fullSync();
      } catch {
        // sync error handled by syncEngine
      }
      setState('done');
      // Show checkmark briefly
      await new Promise(r => setTimeout(r, 1000));
      setState('idle');
      setPullDistance(0);
    } else {
      setState('idle');
      setPullDistance(0);
    }
  }, [pullDistance]);

  useEffect(() => {
    const opts: AddEventListenerOptions = { passive: false };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, opts);
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Disable default browser pull-to-refresh
  useEffect(() => {
    document.body.style.overscrollBehaviorY = 'contain';
    return () => {
      document.body.style.overscrollBehaviorY = '';
    };
  }, []);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const showIndicator = state !== 'idle';

  return (
    <div ref={containerRef}>
      {/* Pull indicator */}
      <div
        className="ptr-indicator"
        style={{
          height: showIndicator ? pullDistance : 0,
          opacity: showIndicator ? 1 : 0,
          transition: state === 'pulling' || state === 'threshold'
            ? 'none'
            : 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
        }}
      >
        <div className="ptr-content">
          {state === 'refreshing' ? (
            <div className="ptr-icon ptr-spin">
              <Loader2 size={20} />
            </div>
          ) : state === 'done' ? (
            <div className="ptr-icon ptr-done">
              <Check size={20} />
            </div>
          ) : (
            <div
              className="ptr-icon"
              style={{
                transform: `rotate(${state === 'threshold' ? 180 : progress * 180}deg)`,
                opacity: 0.4 + progress * 0.6,
                transition: state === 'threshold' ? 'transform 0.2s ease' : 'none',
              }}
            >
              <ArrowDown size={20} />
            </div>
          )}
          <span className="ptr-label">
            {state === 'refreshing'
              ? 'Syncing…'
              : state === 'done'
                ? 'All synced!'
                : state === 'threshold'
                  ? 'Release to sync'
                  : 'Pull to sync'}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}
