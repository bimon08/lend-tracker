'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  Plus,
  Clock,
  Users,
  TrendingUp,
  Loader2,
  CheckCircle2,
  ChevronRight,
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
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [expandedTxns, setExpandedTxns] = useState<{ id: string; type: 'lend' | 'borrow'; amount: number; remaining: number; note?: string; date: Date }[]>([]);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');

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

  // Load outstanding transactions when expanding a person card
  const toggleExpand = async (personId: string) => {
    if (expandedPerson === personId) {
      setExpandedPerson(null);
      setExpandedTxns([]);
      setSelectedTxnId(null);
      setPayAmount('');
      return;
    }

    setExpandedPerson(personId);
    setSelectedTxnId(null);
    setPayAmount('');

    const txns = await dataLayer.getTransactions({ personId });
    const outstanding = txns.filter(t => t.status === 'pending' || t.status === 'partial');

    const txnData = [];
    for (const txn of outstanding) {
      const payments = await dataLayer.getPayments(txn.id);
      const paid = payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = txn.amount - paid;
      if (remaining > 0) {
        txnData.push({
          id: txn.id,
          type: txn.type,
          amount: txn.amount,
          remaining,
          note: txn.note,
          date: txn.date,
        });
      }
    }
    setExpandedTxns(txnData);
    if (txnData.length > 0) {
      setSelectedTxnId(txnData[0].id);
    }
  };
  // Record a payment against a selected transaction
  const handleRecordPayment = async (txnId: string) => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;

    await dataLayer.addPayment({
      id: crypto.randomUUID(),
      transactionId: txnId,
      amount,
      date: new Date(),
      note: 'Quick payment',
      createdAt: new Date(),
    });

    setPayAmount('');
    setSelectedTxnId(null);
    setExpandedPerson(null);
    setExpandedTxns([]);
    await refreshAll();
  };

  // Mark all outstanding transactions as settled for a person
  const handleMarkSettled = async (personId: string) => {
    const txns = await dataLayer.getTransactions({ personId });
    const outstanding = txns.filter(t => t.status === 'pending' || t.status === 'partial');

    for (const txn of outstanding) {
      // Calculate remaining and add a payment to settle it
      const payments = await dataLayer.getPayments(txn.id);
      const paid = payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = txn.amount - paid;
      if (remaining > 0) {
        await dataLayer.addPayment({
          id: crypto.randomUUID(),
          transactionId: txn.id,
          amount: remaining,
          date: new Date(),
          note: 'Settled',
          createdAt: new Date(),
        });
      }
    }

    setExpandedPerson(null);
    await refreshAll();
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

  const netBalance = summary?.netBalance || 0;

  return (
    <div className="mx-auto max-w-lg px-4 pt-2 pb-24">
      {ToastElement}

      {/* Pending Changes Modal */}
      {showPendingModal && (
        <PendingChangesModal onDismiss={() => setShowPendingModal(false)} />
      )}

      {/* Persistent pending banner */}
      {hasPending && !showPendingModal && (
        <div
          className="glass-card animate-in mb-4 cursor-pointer overflow-hidden rounded-2xl bg-amber-500/5! p-3.5"
          style={{ borderColor: 'rgba(245, 158, 11, 0.15)' }}
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

      {/* Header */}
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
          <p className="mt-0.5 text-sm text-white/70">Your money, managed</p>
        </div>
      </div>

      {/* Summary Cards — Glass */}
      <div className="mb-5 flex flex-col gap-2.5">
        {/* Lent + Borrowed row */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="glass-card animate-in flex items-center gap-2.5 rounded-2xl px-3.5 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/70">
              <ArrowUpRight size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-medium text-white/70">Lent Out</p>
              <p className="text-base font-bold leading-tight text-white">
                {summaryLoading ? '—' : formatCurrency(summary?.totalLentOutstanding || 0)}
              </p>
            </div>
          </div>

          <div className="glass-card animate-in flex items-center gap-2.5 rounded-2xl px-3.5 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/70">
              <ArrowDownLeft size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-medium text-white/70">Borrowed</p>
              <p className="text-base font-bold leading-tight text-white">
                {summaryLoading ? '—' : formatCurrency(summary?.totalBorrowedOutstanding || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Net Balance — full width glass */}
        <div className="glass-card animate-in flex items-center justify-between rounded-2xl px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/70">
              <Scale size={15} />
            </div>
            <div>
              <p className="text-[0.65rem] font-medium text-white/70">Net Balance</p>
              <p className="text-[0.65rem] text-white/70">
                {netBalance > 0 ? 'Others owe you more' : netBalance < 0 ? 'You owe others more' : 'All settled'}
              </p>
            </div>
          </div>
          <p className="text-lg font-bold text-white">
            {summaryLoading ? '—' : `${netBalance >= 0 ? '+' : ''}${formatCurrency(netBalance)}`}
          </p>
        </div>

        {/* Profit card */}
        {summary && summary.totalProfit > 0 && (
          <div className="glass-card animate-in flex items-center justify-between rounded-2xl px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white/70">
                <TrendingUp size={15} />
              </div>
              <p className="text-[0.65rem] font-medium text-white/70">Total Profit</p>
            </div>
            <p className="text-base font-bold text-white">
              +{formatCurrency(summary.totalProfit)}
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions — Glass buttons */}
      <div className="mb-6 flex gap-3">
        <button
          className="glass-card flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 font-semibold text-white transition-all active:scale-[0.97]"
          onClick={() => openAdd('lend')}
          id="quick-lend"
        >
          <Plus size={18} /> Lend Money
        </button>
        <button
          className="glass-card flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 font-semibold text-white transition-all active:scale-[0.97]"
          onClick={() => openAdd('borrow')}
          id="quick-borrow"
        >
          <Plus size={18} /> Borrow Money
        </button>
      </div>

      {/* People with outstanding balances */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/70">
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
              const isExpanded = expandedPerson === person.id;
              return (
                <div key={person.id} className="glass-card animate-in rounded-2xl" id={`person-${person.id}`}>
                  {/* Card header — tap to expand */}
                  <button
                    className="flex w-full items-center gap-3.5 p-3.5 text-left"
                    onClick={() => toggleExpand(person.id)}
                  >
                    <UserAvatar name={person.name} size={42} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{person.name}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs">
                        {person.lentOutstanding > 0 && (
                          <span className="flex items-center gap-0.5 text-white/70">
                            <ArrowUpRight size={10} /> {formatCurrency(person.lentOutstanding)}
                          </span>
                        )}
                        {person.lentOutstanding > 0 && person.borrowedOutstanding > 0 && (
                          <span className="h-1 w-1 rounded-full bg-white/20" />
                        )}
                        {person.borrowedOutstanding > 0 && (
                          <span className="flex items-center gap-0.5 text-white/70">
                            <ArrowDownLeft size={10} /> {formatCurrency(person.borrowedOutstanding)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold text-white">
                        {net >= 0 ? '+' : ''}{formatCurrency(net)}
                      </p>
                      <p className="text-[0.7rem] text-white/70">
                        {net > 0 ? 'owes you' : net < 0 ? 'you owe' : 'settled'}
                      </p>
                    </div>
                  </button>

                  {/* Expandable quick actions */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/10 px-3.5 pb-3.5 pt-3">
                          {/* Outstanding transactions list */}
                          {expandedTxns.length > 0 && (
                            <div className="mb-3 flex flex-col gap-1.5">
                              <p className="text-[0.65rem] font-medium text-white/40 uppercase tracking-wider">Outstanding</p>
                              {expandedTxns.map((txn) => {
                                const isSelected = selectedTxnId === txn.id;
                                return (
                                  <div key={txn.id}>
                                    <button
                                      onClick={() => {
                                        setSelectedTxnId(isSelected ? null : txn.id);
                                        setPayAmount('');
                                      }}
                                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-all ${
                                        isSelected ? 'bg-white/12' : 'bg-white/5'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {txn.type === 'lend' ? (
                                          <ArrowUpRight size={12} className="text-emerald-400" />
                                        ) : (
                                          <ArrowDownLeft size={12} className="text-orange-400" />
                                        )}
                                        <span className="text-xs text-white/70">
                                          {txn.type === 'lend' ? 'Lent' : 'Borrowed'} {formatCurrency(txn.amount)}
                                          {txn.note && <span className="text-white/40"> · {txn.note}</span>}
                                        </span>
                                      </div>
                                      <span className="text-xs font-semibold text-white">
                                        {formatCurrency(txn.remaining)}
                                      </span>
                                    </button>

                                    {/* Payment input for selected transaction */}
                                    <AnimatePresence>
                                      {isSelected && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className="overflow-hidden"
                                        >
                                          <div className="mt-1.5 flex items-center gap-2 pl-1">
                                            <input
                                              type="number"
                                              inputMode="decimal"
                                              placeholder="Amount"
                                              value={payAmount}
                                              onChange={(e) => setPayAmount(e.target.value)}
                                              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/25"
                                              autoFocus
                                            />
                                            <button
                                              onClick={() => handleRecordPayment(txn.id)}
                                              className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-all active:scale-95"
                                            >
                                              Record
                                            </button>
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Action buttons row */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMarkSettled(person.id)}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 py-2 text-xs font-semibold text-emerald-400 transition-all active:scale-95"
                            >
                              <CheckCircle2 size={14} /> Mark Settled
                            </button>
                            <button
                              onClick={() => router.push(`/person/${person.id}`)}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/8 py-2 text-xs font-semibold text-white/70 transition-all active:scale-95"
                            >
                              View Details <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
