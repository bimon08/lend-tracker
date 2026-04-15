'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@heroui/react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  Plus,
  Clock,
} from 'lucide-react';
import { useSummary, useRecentTransactions } from '@/lib/hooks';
import { dataLayer } from '@/lib/db';
import {
  formatCurrency,
  formatRelativeDate,
  getInitials,
  getAvatarColor,
  getStatusLabel,
} from '@/lib/utils';
import AddTransactionModal from '@/components/AddTransactionModal';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import PendingChangesModal from '@/components/PendingChangesModal';

export default function DashboardPage() {
  const router = useRouter();
  const { data: summary, loading: summaryLoading, refetch: refetchSummary } = useSummary();
  const { data: recentTxns, loading: recentLoading, refetch: refetchRecent } = useRecentTransactions(8);

  const [showAddModal, setShowAddModal] = useState(false);
  const [defaultType, setDefaultType] = useState<'lend' | 'borrow'>('lend');
  const [personNames, setPersonNames] = useState<Map<string, string>>(new Map());
  const [txnOutstanding, setTxnOutstanding] = useState<Map<string, number>>(new Map());
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const { showToast, ToastElement } = useToast();

  const loadPersonNames = useCallback(async () => {
    if (!recentTxns || recentTxns.length === 0) return;
    const names = new Map<string, string>();
    const outstanding = new Map<string, number>();
    for (const txn of recentTxns) {
      if (!names.has(txn.personId)) {
        try {
          const person = await dataLayer.getPerson(txn.personId);
          if (person) names.set(person.id, person.name);
        } catch {
          // Offline — try to get from cached persons list
          const { getCache } = await import('@/lib/offline-cache');
          const cached = getCache<{ id: string; name: string }[]>('persons');
          if (cached) {
            const p = cached.find((c) => c.id === txn.personId);
            if (p) names.set(p.id, p.name);
          }
        }
      }
      try {
        const payments = await dataLayer.getPayments(txn.id);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        outstanding.set(txn.id, Math.max(0, txn.amount - totalPaid));
      } catch {
        outstanding.set(txn.id, txn.amount); // Assume unresolved if offline
      }
    }
    setPersonNames(names);
    setTxnOutstanding(outstanding);
  }, [recentTxns]);

  useEffect(() => { loadPersonNames(); }, [loadPersonNames]);

  const refreshAll = async () => {
    await refetchSummary();
    await refetchRecent();
    await loadPersonNames();
    showToast('Transaction added!', 'success');
  };

  const openAdd = (type: 'lend' | 'borrow') => {
    setDefaultType(type);
    setShowAddModal(true);
  };

  // Check for pending changes on load
  useEffect(() => {
    dataLayer.getPendingChangeCount().then((count) => {
      if (count > 0) {
        setHasPending(true);
        setShowPendingModal(true);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-lg px-4 pt-2 pb-24">
      {ToastElement}

      {/* Pending Changes Modal */}
      {showPendingModal && (
        <PendingChangesModal onDismiss={() => setShowPendingModal(false)} />
      )}

      {/* Persistent pending banner — tappable to re-open modal */}
      {hasPending && !showPendingModal && (
        <div
          className="animate-in mb-4 cursor-pointer overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3.5"
          onClick={() => setShowPendingModal(true)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
              <Clock size={16} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-300">
                Employee changes need your review
              </p>
              <p className="text-[0.7rem] text-slate-400">Tap to approve or reject</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-5 flex items-center justify-between py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LendTracker</h1>
          <p className="mt-0.5 text-sm text-slate-400">Your money, managed</p>
        </div>
      </div>



      {/* Summary Cards */}
      <div className="animate-in mb-6 grid grid-cols-2 gap-3">
        <Card className="border border-white/5 bg-emerald-500/10 p-4">
          <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
            <ArrowUpRight size={18} />
          </div>
          <p className="text-xs font-medium text-slate-400">Lent Out</p>
          <p className="mt-1 text-xl font-bold text-emerald-400">
            {summaryLoading ? '—' : formatCurrency(summary?.totalLentOutstanding || 0)}
          </p>
          {summary && summary.activeLendCount > 0 && (
            <p className="mt-1 text-xs text-slate-500">{summary.activeLendCount} active</p>
          )}
        </Card>

        <Card className="border border-white/5 bg-amber-500/10 p-4">
          <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
            <ArrowDownLeft size={18} />
          </div>
          <p className="text-xs font-medium text-slate-400">Borrowed</p>
          <p className="mt-1 text-xl font-bold text-amber-400">
            {summaryLoading ? '—' : formatCurrency(summary?.totalBorrowedOutstanding || 0)}
          </p>
          {summary && summary.activeBorrowCount > 0 && (
            <p className="mt-1 text-xs text-slate-500">{summary.activeBorrowCount} active</p>
          )}
        </Card>

        <Card className="col-span-2 border border-white/5 bg-slate-800/40 p-4">
          <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-500">
            <Scale size={18} />
          </div>
          <p className="text-xs font-medium text-slate-400">Net Balance</p>
          <p
            className="mt-1 text-xl font-bold"
            style={{
              color: (summary?.netBalance || 0) > 0 ? '#34d399' : (summary?.netBalance || 0) < 0 ? '#fbbf24' : '#94a3b8',
            }}
          >
            {summaryLoading ? '—' : `${(summary?.netBalance || 0) >= 0 ? '+' : ''}${formatCurrency(summary?.netBalance || 0)}`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {(summary?.netBalance || 0) > 0 ? 'Others owe you more' : (summary?.netBalance || 0) < 0 ? 'You owe others more' : 'All settled'}
          </p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 flex gap-3">
        <Button
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-2.5 font-semibold text-white shadow-lg shadow-emerald-500/20"
          onPress={() => openAdd('lend')}
          id="quick-lend"
        >
          <Plus size={18} /> Lend Money
        </Button>
        <Button
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-2.5 font-semibold text-white shadow-lg shadow-amber-500/20"
          onPress={() => openAdd('borrow')}
          id="quick-borrow"
        >
          <Plus size={18} /> Borrow Money
        </Button>
      </div>

      {/* Recent Activity */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Recent Activity
      </h2>

      {recentLoading ? (
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      ) : !recentTxns || recentTxns.length === 0 ? (
        <EmptyState
          icon={<Clock size={28} />}
          title="No transactions yet"
          description="Start by lending or borrowing money to see your activity here"
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {recentTxns.map((txn) => {
            const name = personNames.get(txn.personId) || '...';
            const outstanding = txnOutstanding.get(txn.id) ?? txn.amount;
            return (
              <div
                key={txn.id}
                className="animate-in flex cursor-pointer items-center gap-3 rounded-2xl border border-white/5 bg-slate-800/40 p-3.5 transition-colors hover:bg-slate-800/60 active:scale-[0.98]"
                onClick={() => router.push(`/transaction/${txn.id}`)}
                id={`txn-${txn.id}`}
              >
                <div
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                  style={{ background: getAvatarColor(name) }}
                >
                  {getInitials(name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                      txn.type === 'lend' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
                    }`}>
                      {txn.type === 'lend' ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                      {txn.type === 'lend' ? 'Lent' : 'Borrowed'}
                    </span>
                    <span className="text-xs text-slate-500">{formatRelativeDate(txn.createdAt)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold" style={{ color: txn.type === 'lend' ? '#34d399' : '#fbbf24' }}>
                    {formatCurrency(outstanding)}
                  </p>
                  {outstanding < txn.amount && (
                    <p className="text-[0.7rem] text-slate-500">of {formatCurrency(txn.amount)}</p>
                  )}
                  <span className={`mt-0.5 inline-block rounded-full px-1.5 py-px text-[0.6rem] font-semibold ${
                    txn.status === 'settled' ? 'bg-emerald-500/12 text-emerald-500'
                    : txn.status === 'partial' ? 'bg-amber-500/12 text-amber-500'
                    : 'bg-red-500/12 text-red-500'
                  }`}>
                    {getStatusLabel(txn.status)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refreshAll}
        defaultType={defaultType}
      />
    </div>
  );
}
