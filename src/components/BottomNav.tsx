'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/lend', label: 'Lent', icon: ArrowUpRight },
  { href: '/borrow', label: 'Borrowed', icon: ArrowDownLeft },
  { href: '/people', label: 'People', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" id="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive ? 'active' : ''}`}
            id={`nav-${item.label.toLowerCase()}`}
          >
            <Icon size={22} />
            <span className="nav-item-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
