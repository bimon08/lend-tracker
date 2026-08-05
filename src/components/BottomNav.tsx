'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import {
  LayoutDashboard,
  Users,
  Settings,
  Loader2,
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

  // Fetch pending change count for badge
  useEffect(() => {
    if (pathname === '/login' || pathname === '/employee-login') return;
    dataLayer.getPendingChangeCount().then(setPendingCount).catch(() => {});
    const interval = setInterval(() => {
      dataLayer.getPendingChangeCount().then(setPendingCount).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  // Hide bottom nav on login page
  if (pathname === '/login' || pathname === '/employee-login') return null;

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
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/5 bg-[#0a0e1a]/92 backdrop-blur-xl"
      style={{
        height: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
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
            className={`relative flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-colors ${
              isActive ? 'text-slate-100' : 'text-slate-500'
            }`}
            id={`nav-${item.label.toLowerCase()}`}
          >
            {isActive && (
              <span className="absolute -top-px left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-b-full bg-gradient-to-r from-sky-500 to-violet-500" />
            )}
            <span className="relative">
              {isLoading ? (
                <Loader2 size={22} className="animate-spin text-violet-400" />
              ) : (
                <Icon size={22} />
              )}
              {showBadge && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[0.55rem] font-bold text-black">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </span>
            <span className="text-[0.65rem] font-medium tracking-wide">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
