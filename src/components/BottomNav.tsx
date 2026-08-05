'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Settings,
} from 'lucide-react';
import { dataLayer } from '@/lib/db';

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/people', label: 'People', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Prefetch all nav pages on mount for instant navigation
  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  // Fetch pending change count for badge
  useEffect(() => {
    if (pathname === '/login' || pathname === '/employee-login') return;
    dataLayer.getPendingChangeCount().then(setPendingCount).catch(() => {});
    const interval = setInterval(() => {
      dataLayer.getPendingChangeCount().then(setPendingCount).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  // Hide bottom nav on login page or before mount (prevents hydration mismatch)
  if (!mounted || pathname === '/login' || pathname === '/employee-login') return null;

  const handleNav = (href: string) => {
    if (href === pathname) return;
    setLoadingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  // Clear loading state when pathname changes
  if (loadingHref && pathname === loadingHref) {
    setTimeout(() => setLoadingHref(null), 0);
  }

  return (
    <nav
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-1.5"
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(30px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(30px) saturate(1.6)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: 'inset 0 0 2px 1px rgba(255,255,255,0.2), inset 0 0 8px 2px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.2)',
        marginBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      id="bottom-nav"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href));
        const isLoading = loadingHref === item.href && isPending;
        const showBadge = item.href === '/settings' && pendingCount > 0;

        return (
          <button
            key={item.href}
            onClick={() => handleNav(item.href)}
            className="relative flex items-center gap-2 rounded-full px-4 py-2.5 transition-colors"
            style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.5)' }}
            id={`nav-${item.label.toLowerCase()}`}
          >
            {/* Animated active pill background */}
            {isActive && (
              <motion.div
                layoutId="nav-active-pill"
                className="absolute inset-0 rounded-full bg-white/15"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}

            <span className="relative z-10">
              <Icon size={20} />
              {showBadge && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[0.55rem] font-bold text-black">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </span>

            <AnimatePresence mode="wait">
              {isActive && (
                <motion.span
                  key={item.href}
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="relative z-10 overflow-hidden whitespace-nowrap text-[0.7rem] font-semibold tracking-wide"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        );
      })}
    </nav>
  );
}
