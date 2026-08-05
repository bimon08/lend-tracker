'use client';

import { useState, use, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { usePerson, usePersonSummary, useTransactions } from '@/lib/hooks';
import { dataLayer } from '@/lib/db';
import type { Payment } from '@/lib/db';
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
} from '@/lib/utils';
import AddTransactionModal from '@/components/AddTransactionModal';
import AddPaymentModal from '@/components/AddPaymentModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import UserAvatar from '@/components/UserAvatar';
import { useToast } from '@/components/Toast';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export default function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: person, loading: personLoading, refetch: refetchPerson } = usePerson(id);
  const { data: summary, refetch: refetchSummary } = usePersonSummary(id);
  const { data: transactions, refetch: refetchTxns } = useTransactions({ personId: id });

  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'lend' | 'borrow'>('lend');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{
    txnId: string;
    type: 'lend' | 'borrow';
    outstanding: number;
  } | null>(null);
  const [showDeletePerson, setShowDeletePerson] = useState(false);
  const [deleteTxnId, setDeleteTxnId] = useState<string | null>(null);
  const [txnPayments, setTxnPayments] = useState<Map<string, Payment[]>>(new Map());
  const { showToast, ToastElement } = useToast();

  const loadPayments = useCallback(async () => {
    if (!transactions) return;
    const map = new Map<string, Payment[]>();
    for (const txn of transactions) {
      const payments = await dataLayer.getPayments(txn.id);
      map.set(txn.id, payments);
    }
    setTxnPayments(map);
  }, [transactions]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const refreshAll = async () => {
    await refetchPerson();
    await refetchSummary();
    await refetchTxns();
  };

  const handleDeletePerson = async () => {
    await dataLayer.deletePerson(id);
    showToast('Person deleted');
    router.push('/people');
  };

  const handleDeleteTransaction = async () => {
    if (!deleteTxnId) return;
    await dataLayer.deleteTransaction(deleteTxnId);
    setDeleteTxnId(null);
    await refreshAll();
    await loadPayments();
    showToast('Transaction deleted', 'success');
  };

  if (personLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-2 pb-24">
        <div className="mb-4 h-5 w-16 rounded skeleton" />
        <div className="mb-5 rounded-2xl glass-card p-5 text-center">
          <div className="mx-auto mb-3 h-16 w-16 rounded-full skeleton" />
          <div className="mx-auto mb-2 h-5 w-28 rounded skeleton" />
          <div className="mx-auto mb-1 h-3 w-20 rounded skeleton" />
          <div className="mx-auto mb-1 h-8 w-24 rounded skeleton" />
          <div className="mx-auto h-3 w-16 rounded skeleton" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="h-16 rounded-xl skeleton" />
            <div className="h-16 rounded-xl skeleton" />
          </div>
        </div>
        <div className="mb-5 flex gap-3">
          <div className="h-10 flex-1 rounded-xl skeleton" />
          <div className="h-10 flex-1 rounded-xl skeleton" />
        </div>
        <div className="mb-3 h-3 w-24 rounded skeleton" />
        <div className="flex flex-col gap-2.5">
          <div className="h-32 rounded-2xl skeleton" />
          <div className="h-32 rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  if (!person) {
    return <div className="mx-auto max-w-lg px-4 pt-2"><EmptyState title="Person not found" description="This person doesn't exist" /></div>;
  }

  const net = (summary?.lentOutstanding || 0) - (summary?.borrowedOutstanding || 0);

  return (
    <div className="mx-auto max-w-lg px-4 pt-2 pb-24">
      {ToastElement}

      <button className="mb-4 flex items-center gap-1 text-sm text-white/50 active:text-white" onClick={() => router.back()} id="back-btn">
        <ArrowLeft size={18} /> Back
      </button>

      <motion.div variants={stagger} initial="hidden" animate="show">
        {/* Hero Card */}
        <motion.div variants={fadeUp} className="glass-card mb-5 rounded-2xl p-5 text-center">
          <UserAvatar name={person.name} size={64} className="mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">{person.name}</h2>
          <p className="mt-0.5 text-xs text-white/40">Net Balance</p>
          <p className="text-2xl font-bold text-white">
            {net >= 0 ? '+' : ''}{formatCurrency(net)}
          </p>
          <p className="text-xs text-white/40">{net > 0 ? 'owes you' : net < 0 ? 'you owe' : 'all settled'}</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-base font-bold text-emerald-400">{formatCurrency(summary?.lentOutstanding || 0)}</p>
              <p className="text-[0.7rem] text-white/40">Lent Outstanding</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-base font-bold text-amber-400">{formatCurrency(summary?.borrowedOutstanding || 0)}</p>
              <p className="text-[0.7rem] text-white/40">Borrowed Outstanding</p>
            </div>
            {summary && summary.totalProfit > 0 && (
              <div className="col-span-2 flex items-center justify-between rounded-xl bg-white/5 p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-400" />
                  <p className="text-[0.7rem] font-medium text-white/40">Total Profit Earned</p>
                </div>
                <p className="text-base font-bold text-blue-400">+{formatCurrency(summary.totalProfit)}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="mb-5 flex gap-3">
          <button
            className="glass-card flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 font-semibold text-emerald-400 transition-all active:scale-[0.97]"
            onClick={() => { setAddType('lend'); setShowAddModal(true); }}
            id="person-lend-btn"
          >
            <Plus size={16} /> Lend
          </button>
          <button
            className="glass-card flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 font-semibold text-amber-400 transition-all active:scale-[0.97]"
            onClick={() => { setAddType('borrow'); setShowAddModal(true); }}
            id="person-borrow-btn"
          >
            <Plus size={16} /> Borrow
          </button>
        </motion.div>

        <motion.h2 variants={fadeUp} className="mb-3 text-[0.65rem] font-semibold uppercase tracking-wider text-white/40">Transactions</motion.h2>

        {!transactions || transactions.length === 0 ? (
          <EmptyState title="No transactions" description="Add a transaction with this person" />
        ) : (
          <motion.div className="flex flex-col gap-2.5" variants={stagger}>
            {transactions.map((txn) => {
              const payments = txnPayments.get(txn.id) || [];
              const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
              const outstanding = Math.max(0, txn.amount - totalPaid);
              const profit = Math.max(0, totalPaid - txn.amount);
              const progress = txn.amount > 0 ? Math.min(100, (totalPaid / txn.amount) * 100) : 100;

              return (
                <motion.div key={txn.id} variants={fadeUp} className="glass-card rounded-2xl p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                        txn.type === 'lend' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {txn.type === 'lend' ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                        {txn.type === 'lend' ? 'Lent' : 'Borrowed'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                        txn.status === 'settled' ? 'bg-emerald-500/12 text-emerald-400'
                        : txn.status === 'partial' ? 'bg-amber-500/12 text-amber-400'
                        : 'bg-red-500/12 text-red-400'
                      }`}>
                        {getStatusLabel(txn.status)}
                      </span>
                      {profit > 0 && (
                        <span className="flex items-center gap-0.5 rounded-full bg-blue-500/12 px-2 py-0.5 text-[0.65rem] font-semibold text-blue-400">
                          <TrendingUp size={9} /> +{formatCurrency(profit)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-lg font-bold text-white">
                          {formatCurrency(outstanding)}
                        </span>
                        {outstanding < txn.amount && (
                          <p className="text-[0.65rem] text-white/30">of {formatCurrency(txn.amount)}</p>
                        )}
                      </div>
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400 transition-colors active:bg-red-500/20"
                        onClick={() => setDeleteTxnId(txn.id)}
                        id={`delete-txn-${txn.id}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <p className="mb-2 text-xs text-white/40">
                    {formatDate(txn.date)}
                    {txn.note && <> · {txn.note}</>}
                    {txn.dueDate && <> · Due: {formatDate(txn.dueDate)}</>}
                  </p>

                  {(txn.status !== 'settled' || profit > 0) && (
                    <div className="mb-1 flex justify-between text-xs text-white/40">
                      <span>Paid: {formatCurrency(totalPaid)}</span>
                      {outstanding > 0 ? (
                        <span>Left: {formatCurrency(outstanding)}</span>
                      ) : profit > 0 ? (
                        <span className="font-semibold text-blue-400">Profit: +{formatCurrency(profit)}</span>
                      ) : null}
                    </div>
                  )}
                  <div className="h-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full transition-all ${txn.type === 'lend' ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {payments.length > 0 && (
                    <div className="relative mt-3 space-y-0 pl-6">
                      <div className="absolute bottom-1 left-2 top-1 w-0.5 rounded-full bg-white/5" />
                      {payments.map((payment) => (
                        <div key={payment.id} className="relative py-1.5">
                          <div className="absolute -left-[18px] top-3 h-2 w-2 rounded-full border-2 border-emerald-500 bg-[#0a0e1a]" />
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-emerald-400">+{formatCurrency(payment.amount)}</span>
                            <span className="text-xs text-white/30">{formatDate(payment.date)}</span>
                          </div>
                          {payment.note && <p className="text-xs text-white/40">{payment.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white transition-all active:scale-[0.97] ${
                      txn.type === 'lend' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                    }`}
                    onClick={() => setPaymentTarget({ txnId: txn.id, type: txn.type, outstanding })}
                    id={`record-payment-${txn.id}`}
                  >
                    <Plus size={14} /> Record Payment
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>

      <div className="flex justify-center py-6">
        <button className="text-sm text-red-400/60 active:text-red-400" onClick={() => setShowDeletePerson(true)} id="delete-person-btn">
          <Trash2 size={14} className="mr-1.5 inline" /> Delete Person & All Transactions
        </button>
      </div>

      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={async () => { await refreshAll(); showToast('Transaction added!'); }}
        defaultType={addType}
        defaultPersonName={person.name}
      />

      {paymentTarget && (
        <AddPaymentModal
          isOpen={showPaymentModal || !!paymentTarget}
          onClose={() => { setShowPaymentModal(false); setPaymentTarget(null); }}
          onSuccess={async () => { await refreshAll(); await loadPayments(); showToast('Payment recorded!'); }}
          transactionId={paymentTarget.txnId}
          transactionType={paymentTarget.type}
          outstanding={paymentTarget.outstanding}
          onDeleteTransaction={async (txnId) => {
            await dataLayer.deleteTransaction(txnId);
            setPaymentTarget(null);
            await refreshAll();
            await loadPayments();
            showToast('Transaction deleted', 'success');
          }}
        />
      )}

      <ConfirmDialog
        isOpen={showDeletePerson}
        title="Delete Person"
        message={`This will permanently delete ${person.name} and all their transactions and payments.`}
        confirmLabel="Delete"
        onConfirm={handleDeletePerson}
        onCancel={() => setShowDeletePerson(false)}
      />

      <ConfirmDialog
        isOpen={!!deleteTxnId}
        title="Delete Transaction"
        message="This will permanently delete this transaction and all its payments."
        confirmLabel="Delete"
        onConfirm={handleDeleteTransaction}
        onCancel={() => setDeleteTxnId(null)}
      />
    </div>
  );
}
