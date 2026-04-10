'use client';

import { Button } from '@heroui/react';
import { Lock, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UpgradePromptProps {
  message?: string;
}

export default function UpgradePrompt({ message }: UpgradePromptProps) {
  const router = useRouter();

  return (
    <div className="animate-in flex flex-col items-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5 px-6 py-8 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/20">
        <Lock size={24} className="text-white" />
      </div>
      <h3 className="mb-1 text-base font-bold text-slate-100">
        Pro Feature
      </h3>
      <p className="mb-5 max-w-[260px] text-sm text-slate-400">
        {message || 'Upgrade to Pro to unlock unlimited access to all your people and transactions.'}
      </p>
      <Button
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-violet-500/25"
        onPress={() => router.push('/pricing')}
        id="upgrade-btn"
      >
        <Crown size={16} /> Upgrade to Pro — ₹20/mo
      </Button>
    </div>
  );
}
