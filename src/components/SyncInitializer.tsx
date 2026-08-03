'use client';

import { useEffect } from 'react';
import { initSync, setCachedUserId } from '@/lib/syncEngine';
import { createClient } from '@/lib/supabase/client';

export default function SyncInitializer() {
  useEffect(() => {
    // Cache the user ID for offline use
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCachedUserId(user.id);
      }
    }).catch(() => {
      // Supabase unreachable, rely on cached user ID
    });

    // Initialize the sync engine
    initSync();
  }, []);

  return null;
}
