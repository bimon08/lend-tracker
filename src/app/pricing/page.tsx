'use client';

import { Card, Button } from '@heroui/react';
import {
  Check,
  X,
  Crown,
  Zap,
  Clock,
  ArrowLeft,
  MessageCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/lib/hooks';
import { isProUser, getTrialDaysLeft, isTrialExpired } from '@/lib/db';

const FREE_FEATURES = [
  { text: 'Up to 3 people', included: true },
  { text: 'Up to 10 transactions', included: true },
  { text: 'Record payments', included: true },
  { text: 'Cloud sync', included: true },
  { text: 'Export data', included: false },
  { text: 'Import data', included: false },
  { text: 'Unlimited people', included: false },
  { text: 'Unlimited transactions', included: false },
  { text: 'Priority support', included: false },
];

const PRO_FEATURES = [
  { text: 'Unlimited people', included: true },
  { text: 'Unlimited transactions', included: true },
  { text: 'Record payments', included: true },
  { text: 'Cloud sync', included: true },
  { text: 'Export data', included: true },
  { text: 'Import data', included: true },
  { text: 'Due date reminders', included: true },
  { text: 'Priority support', included: true },
  { text: 'Early access to features', included: true },
];

export default function PricingPage() {
  const router = useRouter();
  const { data: subscription } = useSubscription();

  const isPro = isProUser(subscription);
  const daysLeft = getTrialDaysLeft(subscription);
  const trialExpired = isTrialExpired(subscription);

  const handleContactUs = () => {
    window.open(
      'mailto:pixelthread.dev@gmail.com?subject=LendTracker%20Pro%20Upgrade&body=Hi%2C%20I%20would%20like%20to%20upgrade%20to%20LendTracker%20Pro.',
      '_blank'
    );
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-2 pb-24">
      <button
        className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
        onClick={() => router.back()}
      >
        <ArrowLeft size={18} /> Back
      </button>

      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
          <Crown size={24} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Choose Your Plan</h1>
        <p className="mt-1 text-sm text-slate-400">
          Start free, upgrade when you grow
        </p>
      </div>

      {/* Trial Banner */}
      {subscription?.status === 'trialing' && daysLeft > 0 && (
        <div className="animate-in mb-5 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
              <Clock size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300">
                Pro Trial Active — {daysLeft} days left
              </p>
              <p className="text-xs text-slate-400">
                You have full Pro access. Upgrade before it ends!
              </p>
            </div>
          </div>
        </div>
      )}

      {trialExpired && (
        <div className="animate-in mb-5 overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/10 to-pink-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20">
              <Zap size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-300">
                Your Pro trial has expired
              </p>
              <p className="text-xs text-slate-400">
                Upgrade now to keep unlimited access
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="flex flex-col gap-4">
        {/* Free Plan */}
        <Card className="relative border border-white/5 bg-slate-800/40 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-300">Free</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              For personal use
            </p>
          </div>
          <div className="mb-5">
            <span className="text-4xl font-extrabold text-slate-200">₹0</span>
            <span className="ml-1 text-sm text-slate-500">/month</span>
          </div>

          <div className="mb-5 space-y-2.5">
            {FREE_FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                {f.included ? (
                  <Check size={16} className="shrink-0 text-emerald-500" />
                ) : (
                  <X size={16} className="shrink-0 text-slate-600" />
                )}
                <span className={f.included ? 'text-slate-300' : 'text-slate-600'}>
                  {f.text}
                </span>
              </div>
            ))}
          </div>

          {!isPro && !subscription?.status?.includes('trial') && (
            <div className="rounded-xl bg-slate-700/40 py-2.5 text-center text-sm font-semibold text-slate-400">
              Current Plan
            </div>
          )}
        </Card>

        {/* Pro Plan */}
        <Card className="relative overflow-hidden border-2 border-violet-500/30 bg-slate-800/40 p-5">
          {/* Popular badge */}
          <div className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-white shadow-lg shadow-violet-500/20">
            Most Popular
          </div>

          {/* Glow effect */}
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative mb-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-violet-300">
              <Crown size={18} className="text-amber-400" /> Pro
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Unlimited everything
            </p>
          </div>

          <div className="relative mb-2">
            <span className="text-4xl font-extrabold text-white">₹20</span>
            <span className="ml-1 text-sm text-slate-400">/month</span>
          </div>
          <p className="mb-5 inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
            2 months free trial included
          </p>

          <div className="mb-5 space-y-2.5">
            {PRO_FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <Check size={16} className="shrink-0 text-violet-400" />
                <span className="text-slate-200">{f.text}</span>
              </div>
            ))}
          </div>

          {isPro ? (
            <div className="rounded-xl bg-gradient-to-r from-violet-600/20 to-purple-600/20 py-2.5 text-center text-sm font-semibold text-violet-300">
              {subscription?.status === 'trialing' ? `Trial Active — ${daysLeft} days left` : 'Current Plan'}
            </div>
          ) : (
            <Button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition-transform active:scale-[0.98]"
              onPress={handleContactUs}
              id="upgrade-btn"
            >
              <MessageCircle size={16} /> Contact Us to Upgrade
            </Button>
          )}
        </Card>
      </div>

      {/* FAQ-like info */}
      <div className="mt-6 rounded-2xl border border-white/5 bg-slate-800/30 p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">How it works</h3>
        <div className="space-y-3 text-xs text-slate-400">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[0.6rem] font-bold text-emerald-500">1</span>
            <p>Start with a <strong className="text-slate-300">2-month free Pro trial</strong> — no credit card required</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[0.6rem] font-bold text-emerald-500">2</span>
            <p>After the trial, you&apos;ll be on the <strong className="text-slate-300">Free plan</strong> with limited features</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[0.6rem] font-bold text-emerald-500">3</span>
            <p>Contact us anytime to <strong className="text-slate-300">upgrade to Pro</strong> for just ₹20/month</p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-[0.7rem] text-slate-600">
        Questions? Email us at pixelthread.dev@gmail.com
      </p>
    </div>
  );
}
