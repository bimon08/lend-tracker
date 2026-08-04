'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@heroui/react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  Plus,
  Clock,
  Users,
} from 'lucide-react';
import { useSummary, usePersonsWithSummaries } from '@/lib/hooks';
import { dataLayer } from '@/lib/db';
import {
  formatCurrency,
} from '@/lib/utils';
import AddTransactionModal from '@/components/AddTransactionModal';
import EmptyState from '@/components/EmptyState';
import UserAvatar from '@/components/UserAvatar';
import { useToast } from '@/components/Toast';
import PendingChangesModal from '@/components/PendingChangesModal';

export default function DashboardPage() {
  const router = useRouter();
  const { data: summary, loading: summaryLoading, refetch: refetchSummary } = useSummary();
  const { data: persons, loading: personsLoading, refetch: refetchPersons } = usePersonsWithSummaries();

  const [showAddModal, setShowAddModal] = useState(false);
  const [defaultType, setDefaultType] = useState<'lend' | 'borrow'>('lend');

  const [showPendingModal, setShowPendingModal] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const { showToast, ToastElement } = useToast();

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);



  const refreshAll = async () => {
    await refetchSummary();
    await refetchPersons();
    showToast('Transaction added!', 'success');
  };

  const openAdd = (type: 'lend' | 'borrow') => {
    setDefaultType(type);
    setShowAddModal(true);
  };

  // Check for pending changes on load
  useEffect(() => {
    dataLayer.getPendingChangeCount().then((count: number) => {
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
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            LendTracker
            {!isOnline && (
              <span className="relative flex h-2.5 w-2.5" title="Offline — working locally">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
              </span>
            )}
          </h1>
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

      {/* People with outstanding balances */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Who Owes Who
      </h2>

      {personsLoading ? (
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      ) : (() => {
        const activePersons = (persons || []).filter(
          (p) => p.lentOutstanding > 0 || p.borrowedOutstanding > 0
        ).sort((a, b) => {
          const aAbs = Math.abs(a.lentOutstanding - a.borrowedOutstanding);
          const bAbs = Math.abs(b.lentOutstanding - b.borrowedOutstanding);
          return bAbs - aAbs;
        });

        if (activePersons.length === 0) {
          return (
            <EmptyState
              icon={<Users size={28} />}
              title="All settled up!"
              description="No outstanding balances — start by lending or borrowing money"
            />
          );
        }

        return (
          <div className="flex flex-col gap-2.5">
            {activePersons.map((person) => {
              const net = person.lentOutstanding - person.borrowedOutstanding;
              return (
                <div
                  key={person.id}
                  className="animate-in flex cursor-pointer items-center gap-3.5 rounded-2xl border border-white/5 bg-slate-800/40 p-3.5 transition-colors hover:bg-slate-800/60 active:scale-[0.98]"
                  onClick={() => router.push(`/person/${person.id}`)}
                  id={`person-${person.id}`}
                >
                  <UserAvatar name={person.name} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{person.name}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                      {person.lentOutstanding > 0 && (
                        <span className="flex items-center gap-0.5 text-emerald-500">
                          <ArrowUpRight size={10} /> {formatCurrency(person.lentOutstanding)}
                        </span>
                      )}
                      {person.lentOutstanding > 0 && person.borrowedOutstanding > 0 && (
                        <span className="h-1 w-1 rounded-full bg-slate-600" />
                      )}
                      {person.borrowedOutstanding > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-500">
                          <ArrowDownLeft size={10} /> {formatCurrency(person.borrowedOutstanding)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold" style={{ color: net > 0 ? '#34d399' : net < 0 ? '#fbbf24' : '#64748b' }}>
                      {net >= 0 ? '+' : ''}{formatCurrency(net)}
                    </p>
                    <p className="text-[0.7rem] text-slate-500">
                      {net > 0 ? 'owes you' : net < 0 ? 'you owe' : 'settled'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refreshAll}
        defaultType={defaultType}
      />
    </div>
  );
}
