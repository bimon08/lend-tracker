'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('pwa-dismissed')) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa-dismissed', '1');
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px)+8px)] left-4 right-4 z-40 mx-auto max-w-lg animate-[slideUp_0.3s_ease-out]">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
        <Image
          src="/icons/icon-192.png"
          alt="LendTracker"
          width={40}
          height={40}
          className="shrink-0 rounded-xl"
        />
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-200">Install LendTracker</p>
          <p className="text-[0.65rem] text-slate-500">1.3 MB · Works offline</p>
        </div>
        <button
          className="rounded-lg bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-400 transition-colors hover:bg-violet-500/25"
          onClick={handleInstall}
        >
          Install
        </button>
        <button
          className="rounded-lg p-1.5 text-slate-600 hover:text-slate-400"
          onClick={handleDismiss}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
