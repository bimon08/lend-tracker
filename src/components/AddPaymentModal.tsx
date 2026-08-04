'use client';

import { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { formatCurrency, formatInputDate, generateId, parseAmountInput } from '@/lib/utils';
import { dataLayer } from '@/lib/db';
import AmountInput from '@/components/AmountInput';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transactionId: string;
  transactionType: 'lend' | 'borrow';
  outstanding: number;
  onDeleteTransaction?: (txnId: string) => void;
}

export default function AddPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  transactionId,
  transactionType,
  outstanding,
  onDeleteTransaction,
}: AddPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(formatInputDate(new Date()));
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [settledView, setSettledView] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDate(formatInputDate(new Date()));
      setNote('');
      setSettledView(false);
      setDeleting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseAmountInput(amount) <= 0) return;

    setLoading(true);
    try {
      const paymentAmount = parseAmountInput(amount);
      await dataLayer.addPayment({
        id: generateId(),
        transactionId,
        amount: paymentAmount,
        date: new Date(date),
        note: note.trim() || undefined,
        createdAt: new Date(),
      });
      onSuccess();

      // Check if this payment settles the transaction
      if (paymentAmount >= outstanding) {
        setSettledView(true);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Failed to add payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (onDeleteTransaction) {
        onDeleteTransaction(transactionId);
      } else {
        await dataLayer.deleteTransaction(transactionId);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={settledView ? undefined : onClose}
    >
      <div
        className="animate-in w-full max-w-lg rounded-t-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:mx-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {settledView ? (
          /* Settled confirmation screen */
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 size={36} className="text-emerald-400" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-slate-100">Transaction Settled!</h3>
            <p className="mb-6 text-sm text-slate-400">
              This transaction is fully paid. Would you like to delete it?
            </p>

            <div className="flex w-full flex-col gap-2.5">
              <Button
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/15 py-2.5 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/25 active:scale-[0.98]"
                onPress={handleDelete}
                isDisabled={deleting}
              >
                {deleting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-400/30 border-t-red-400" />
                    Deleting...
                  </span>
                ) : (
                  <>
                    <Trash2 size={15} /> Delete Transaction
                  </>
                )}
              </Button>
              <Button
                className="w-full rounded-xl bg-slate-800/60 py-2.5 text-sm font-semibold text-slate-300 transition-all hover:bg-slate-700 active:scale-[0.98]"
                onPress={onClose}
              >
                Keep It
              </Button>
            </div>
          </div>
        ) : (
          /* Payment form */
          <>
            <h3 className="mb-4 text-lg font-bold text-slate-100">Record Payment</h3>

            {/* Outstanding badge */}
            <div className="mb-5 flex items-center justify-between rounded-xl bg-slate-800/60 px-4 py-3">
              <span className="text-xs text-slate-400">Outstanding</span>
              <span
                className="text-base font-bold"
                style={{ color: transactionType === 'lend' ? '#34d399' : '#fbbf24' }}
              >
                {formatCurrency(outstanding)}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Payment Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                  <AmountInput
                    value={amount}
                    onChange={setAmount}
                    placeholder="0"
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-800/60 py-2.5 pl-8 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500/50"
                  />
                </div>
                {outstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(outstanding))}
                    className="mt-2 text-xs font-semibold text-blue-400 hover:text-blue-300"
                  >
                    Pay Full Amount ({formatCurrency(outstanding)})
                  </button>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Payment Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-violet-500/50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Note (optional)</label>
                <input
                  type="text"
                  placeholder="Payment note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500/50"
                />
              </div>

              <Button
                type="submit"
                isDisabled={loading}
                className={`w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] ${
                  transactionType === 'lend'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                    : 'bg-gradient-to-r from-amber-600 to-amber-500'
                }`}
              >
                {loading ? 'Recording...' : 'Record Payment'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
