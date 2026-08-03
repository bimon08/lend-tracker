import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';
import SyncInitializer from '@/components/SyncInitializer';
import { PostHogProvider, PostHogPageview } from '@/lib/posthog';

export const metadata: Metadata = {
  title: 'LendTracker — Track Money Lent & Borrowed',
  description:
    'Track who owes you money and who you owe. Record partial payments, set due dates, and manage all your IOUs in one place.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LendTracker',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0e1a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="pb-20">
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageview />
          </Suspense>
          <main>{children}</main>
          <BottomNav />
          <PWAInstallPrompt />
          <OfflineSyncBanner />
          <SyncInitializer />
        </PostHogProvider>
      </body>
    </html>
  );
}
