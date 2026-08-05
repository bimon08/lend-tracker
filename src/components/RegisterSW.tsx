'use client';

import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Listen for SW update message to auto-reload
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('SW registered:', reg.scope);

        // Check for updates on every page load
        reg.update();

        // When a new SW is found and installed, activate it immediately
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // New SW is active — page will auto-reload via SW_UPDATED message
            }
          });
        });
      })
      .catch((err) => {
        console.log('SW registration failed:', err);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return null;
}
