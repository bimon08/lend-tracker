'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@heroui/react';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Trash2,
  Calendar,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useTransactionWithDetails } from '@/lib/hooks';
import { dataLayer } from '@/lib/db';
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  isOverdue,
  getDaysUntilDue,
} from '@/lib/utils';
import AddPaymentModal from '@/components/AddPaymentModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';

export default function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: txn, loading, refetch } = useTransactionWithDetails(id);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteTxn, setShowDeleteTxn] = useState(false);
  const [showDeletePayment, setShowDeletePayment] = useState<string | null>(null);
  const { showToast, ToastElement } = useToast();

  const handleDeleteTransaction = async () => {
    await dataLayer.deleteTransaction(id);
    showToast('Transaction deleted');
    router.back();
  };

  const handleDeletePayment = async (paymentId: string) => {
    await dataLayer.deletePayment(paymentId, id);
    await refetch();
    setShowDeletePayment(null);
    showToast('Payment deleted');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-2">
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (!txn) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-2">
        <button className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200" onClick={() => router.back()}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="py-10 text-center text-slate-500">Transaction not found</div>
      </div>
    );
  }

  const overdue = txn.dueDate && isOverdue(txn.dueDate) && txn.status !== 'settled';
  const daysLeft = txn.dueDate ? getDaysUntilDue(txn.dueDate) : null;

  return (
    <div className="mx-auto max-w-lg px-4 pt-2 pb-24">
      {ToastElement}

      <button className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200" onClick={() => router.back()} id="back-btn">
        <ArrowLeft size={18} /> Back
      </button>

      {/* Transaction Header */}
      <Card className="animate-in mb-4 border border-white/5 bg-slate-800/40 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            txn.type === 'lend' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
          }`}>
            {txn.type === 'lend' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
            {txn.type === 'lend' ? 'Lent' : 'Borrowed'}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            txn.status === 'settled' ? 'bg-emerald-500/12 text-emerald-500'
            : txn.status === 'partial' ? 'bg-amber-500/12 text-amber-500'
            : 'bg-red-500/12 text-red-500'
          }`}>
            {getStatusLabel(txn.status)}
          </span>
          {overdue && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/12 px-2.5 py-1 text-xs font-semibold text-red-400">
              <AlertCircle size={10} /> Overdue
            </span>
          )}
        </div>

        <p className="text-3xl font-bold" style={{ color: txn.type === 'lend' ? '#34d399' : '#fbbf24' }}>
          {formatCurrency(txn.amount)}
        </p>

        <p className="mt-1 cursor-pointer text-sm text-slate-400" onClick={() => router.push(`/person/${txn.personId}`)}>
          {txn.type === 'lend' ? 'Lent to' : 'Borrowed from'}{' '}
          <strong className="text-slate-100">{txn.personName}</strong>
        </p>

        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-slate-400"><Calendar size={12} /> Date</span>
            <span className="text-slate-200">{formatDate(txn.date)}</span>
          </div>
          {txn.dueDate && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-400"><Calendar size={12} /> Due Date</span>
              <span className={overdue ? 'text-red-400' : 'text-slate-200'}>
                {formatDate(txn.dueDate)}
                {daysLeft !== null && !overdue && daysLeft > 0 && <span className="ml-1.5 text-xs text-slate-500">({daysLeft}d left)</span>}
              </span>
            </div>
          )}
          {txn.note && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-400"><FileText size={12} /> Note</span>
              <span className="text-slate-200">{txn.note}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Paid</span>
            <span className="font-medium text-emerald-400">{formatCurrency(txn.totalPaid)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Outstanding</span>
            <span className="font-bold" style={{ color: txn.outstanding > 0 ? (txn.type === 'lend' ? '#34d399' : '#fbbf24') : '#64748b' }}>
              {formatCurrency(txn.outstanding)}
            </span>
          </div>
        </div>

        <div className="mt-3 flex justify-between text-[0.7rem] text-slate-500">
          <span>{Math.round(txn.progress)}% paid</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-700/50">
          <div
            className={`h-full rounded-full transition-all duration-500 ${txn.type === 'lend' ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
            style={{ width: `${txn.progress}%` }}
          />
        </div>
      </Card>

      {txn.status !== 'settled' && (
        <Button
          className={`mb-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white ${
            txn.type === 'lend' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' : 'bg-gradient-to-r from-amber-600 to-amber-500'
          }`}
          onPress={() => setShowPaymentModal(true)}
          id="record-payment-btn"
        >
          <Plus size={18} /> Record Payment
        </Button>
      )}

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Payment History</h2>

      {txn.payments.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No payments recorded yet</p>
      ) : (
        <div className="relative mb-5 space-y-0 pl-6">
          <div className="absolute bottom-1 left-2 top-1 w-0.5 rounded-full bg-white/5" />
          {txn.payments.map((payment) => (
            <div key={payment.id} className="relative py-2.5">
              <div className="absolute -left-[18px] top-4 h-2.5 w-2.5 rounded-full border-2 border-emerald-500 bg-slate-900" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-400">+{formatCurrency(payment.amount)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{formatDate(payment.date)}</span>
                  <button
                    className="rounded-md p-1 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => setShowDeletePayment(payment.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {payment.note && <p className="mt-0.5 text-xs text-slate-400">{payment.note}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center pb-6">
        <Button variant="ghost" className="text-red-400" onPress={() => setShowDeleteTxn(true)} id="delete-txn-btn">
          <Trash2 size={14} className="mr-1.5" /> Delete Transaction
        </Button>
      </div>

      <AddPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={async () => { await refetch(); showToast('Payment recorded!'); }}
        transactionId={id}
        transactionType={txn.type}
        outstanding={txn.outstanding}
      />

      <ConfirmDialog isOpen={showDeleteTxn} title="Delete Transaction" message="This will permanently delete this transaction and all its payments. This cannot be undone." confirmLabel="Delete" onConfirm={handleDeleteTransaction} onCancel={() => setShowDeleteTxn(false)} />
      <ConfirmDialog isOpen={!!showDeletePayment} title="Delete Payment" message="This will remove this payment record and update the outstanding balance." confirmLabel="Delete" onConfirm={() => showDeletePayment && handleDeletePayment(showDeletePayment)} onCancel={() => setShowDeletePayment(null)} />
    </div>
  );
}
