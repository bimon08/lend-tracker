import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';
import SyncInitializer from '@/components/SyncInitializer';
import RegisterSW from '@/components/RegisterSW';
import PullToRefresh from '@/components/PullToRefresh';
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
        {/* Fixed background for backdrop-filter to blur */}
        <div className="bg-layer" aria-hidden="true" />

        {/* SVG Liquid Glass displacement filter */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
          <defs>
            <filter id="liquid-glass-filter" colorInterpolationFilters="sRGB">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.015"
                numOctaves="3"
                seed="2"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="8"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageview />
          </Suspense>
          <PullToRefresh>
            <main>{children}</main>
          </PullToRefresh>
          <BottomNav />
          <PWAInstallPrompt />
          <OfflineSyncBanner />
          <SyncInitializer />
          <RegisterSW />
        </PostHogProvider>
      </body>
    </html>
  );
}
