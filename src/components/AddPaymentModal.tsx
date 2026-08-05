'use client';

import { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { formatCurrency, formatInputDate, generateId, parseAmountInput } from '@/lib/utils';
import { dataLayer } from '@/lib/db';
import AmountInput from '@/components/AmountInput';
import DatePicker from '@/components/DatePicker';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transactionId: string;
  transactionType: 'lend' | 'borrow';
  outstanding: number;
  onDeleteTransaction?: (txnId: string) => void | Promise<void>;
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
  const [autoSettle, setAutoSettle] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDate(formatInputDate(new Date()));
      setNote('');
      setSettledView(false);
      setDeleting(false);
      setAutoSettle(false);
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
        await onDeleteTransaction(transactionId);
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
        className="animate-in glass-card w-full max-w-lg rounded-t-2xl p-6 shadow-2xl sm:mx-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {settledView ? (
          /* Settled confirmation screen */
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 size={36} className="text-emerald-400" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-white">Transaction Settled!</h3>
            <p className="mb-6 text-sm text-white/50">
              This transaction is fully paid. Would you like to delete it?
            </p>

            <div className="flex w-full flex-col gap-2.5">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/15 py-2.5 text-sm font-semibold text-red-400 transition-all active:scale-[0.98]"
                onClick={handleDelete}
                disabled={deleting}
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
              </button>
              <button
                className="w-full rounded-xl bg-white/5 py-2.5 text-sm font-semibold text-white/70 transition-all active:scale-[0.98]"
                onClick={onClose}
              >
                Keep It
              </button>
            </div>
          </div>
        ) : (
          /* Payment form */
          <>
            <h3 className="mb-4 text-lg font-bold text-white">Record Payment</h3>

            {/* Outstanding badge */}
            <div className="mb-5 flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
              <span className="text-xs text-white/40">Outstanding</span>
              <span
                className="text-base font-bold"
                style={{ color: transactionType === 'lend' ? '#34d399' : '#fbbf24' }}
              >
                {formatCurrency(outstanding)}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/40">Payment Amount</label>
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/40">₹</span>
                    <AmountInput
                      value={amount}
                      onChange={(val) => { if (!autoSettle) setAmount(val); }}
                      placeholder="0"
                      required
                      className={`w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-8 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25 ${autoSettle ? 'opacity-60 cursor-not-allowed' : ''}`}
                      disabled={autoSettle}
                    />
                  </div>
                  {outstanding > 0 && (
                    <label
                      className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all select-none ${
                        autoSettle
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/5 text-white/40 border border-white/10'
                      }`}
                      id="auto-settle-label"
                    >
                      <input
                        type="checkbox"
                        checked={autoSettle}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAutoSettle(checked);
                          if (checked) {
                            setAmount(String(outstanding));
                          } else {
                            setAmount('');
                          }
                        }}
                        className="sr-only"
                        id="auto-settle-checkbox"
                      />
                      <span className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                        autoSettle
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-white/30 bg-transparent'
                      }`}>
                        {autoSettle && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      Settle
                    </label>
                  )}
                </div>
              </div>

              <DatePicker
                value={date}
                onChange={setDate}
                label="Payment Date"
                required
              />

              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/40">Note (optional)</label>
                <input
                  type="text"
                  placeholder="Payment note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
                  transactionType === 'lend'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {loading ? 'Recording...' : 'Record Payment'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

