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
  Phone,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/lib/hooks';
import { isProUser, getTrialDaysLeft, isTrialExpired } from '@/lib/db';

const FREE_FEATURES = [
  { text: 'Up to 5 people', included: true },
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

  const handleWhatsApp = () => {
    window.open(
      'https://wa.me/918837011018?text=Hi%2C%20I%20would%20like%20to%20upgrade%20to%20LendTracker%20Pro%20%28%E2%82%B920%2Fmonth%29.',
      '_blank'
    );
  };

  const handleCall = () => {
    window.open('tel:+918837011018');
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
            <div className="flex gap-2">
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-transform active:scale-[0.97]"
                onClick={handleWhatsApp}
                id="whatsapp-btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#fff" d="M4.9,43.3l2.7-9.8C5.9,30.6,5,27.3,5,24C5,13.5,13.5,5,24,5c5.1,0,9.8,2,13.4,5.6C41,14.2,43,18.9,43,24c0,10.5-8.5,19-19,19c0,0,0,0,0,0h0c-3.2,0-6.3-0.8-9.1-2.3L4.9,43.3z"/>
                  <path fill="#40c351" d="M35.2,12.8c-3-3-6.9-4.6-11.2-4.6C15.3,8.2,8.2,15.3,8.2,24c0,3,0.8,5.9,2.4,8.4L11,33l-1.6,5.8l6-1.6l0.6,0.3c2.4,1.4,5.2,2.2,8,2.2h0c8.7,0,15.8-7.1,15.8-15.8C39.8,19.8,38.2,15.8,35.2,12.8z"/>
                  <path fill="#fff" fillRule="evenodd" d="M19.3,16c-0.4-0.8-0.7-0.8-1.1-0.8c-0.3,0-0.6,0-0.9,0s-0.8,0.1-1.3,0.6c-0.4,0.5-1.7,1.6-1.7,4s1.7,4.6,1.9,4.9s3.3,5.3,8.1,7.2c4,1.6,4.8,1.3,5.7,1.2c0.9-0.1,2.8-1.1,3.2-2.3c0.4-1.1,0.4-2.1,0.3-2.3c-0.1-0.2-0.4-0.3-0.9-0.6s-2.8-1.4-3.2-1.5c-0.4-0.2-0.8-0.2-1.1,0.2c-0.3,0.5-1.2,1.5-1.5,1.9c-0.3,0.3-0.6,0.4-1,0.1c-0.5-0.2-2-0.7-3.8-2.4c-1.4-1.3-2.4-2.8-2.6-3.3c-0.3-0.5,0-0.7,0.2-1c0.2-0.2,0.5-0.6,0.7-0.8c0.2-0.3,0.3-0.5,0.5-0.8c0.2-0.3,0.1-0.6,0-0.8C20.6,19.3,19.7,17,19.3,16z" clipRule="evenodd"/>
                </svg>
                WhatsApp
              </button>
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 py-3 text-sm font-semibold text-violet-300 transition-transform active:scale-[0.97]"
                onClick={handleCall}
                id="call-btn"
              >
                <Phone size={16} /> Call Us
              </button>
            </div>
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
        Questions? WhatsApp or call +91 88370 11018
      </p>
    </div>
  );
}
