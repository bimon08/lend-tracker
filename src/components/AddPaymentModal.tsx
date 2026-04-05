'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { dataLayer } from '@/lib/db';
import { generateId, formatInputDate, formatCurrency } from '@/lib/utils';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transactionId: string;
  transactionType: 'lend' | 'borrow';
  outstanding: number;
}

export default function AddPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  transactionId,
  transactionType,
  outstanding,
}: AddPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(formatInputDate(new Date()));
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDate(formatInputDate(new Date()));
      setNote('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setLoading(true);
    try {
      await dataLayer.addPayment({
        id: generateId(),
        transactionId,
        amount: Number(amount),
        date: new Date(date),
        note: note.trim() || undefined,
        createdAt: new Date(),
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to add payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const setFullAmount = () => {
    setAmount(String(outstanding));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} id="add-payment-modal">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-header">
          <h2 className="modal-title">Record Payment</h2>
          <button className="modal-close" onClick={onClose} id="payment-modal-close">
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}
          >
            Outstanding
          </span>
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color:
                transactionType === 'lend'
                  ? 'var(--color-lend-light)'
                  : 'var(--color-borrow-light)',
            }}
          >
            {formatCurrency(outstanding)}
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Amount */}
          <div className="form-group">
            <label className="form-label">Payment Amount</label>
            <div className="form-input-with-icon">
              <span className="form-input-icon">₹</span>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max={outstanding}
                step="any"
                required
                id="input-payment-amount"
              />
            </div>
            {outstanding > 0 && (
              <button
                type="button"
                onClick={setFullAmount}
                style={{
                  marginTop: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--color-info)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'var(--transition-fast)',
                }}
                id="btn-full-amount"
              >
                Pay Full Amount ({formatCurrency(outstanding)})
              </button>
            )}
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label">Payment Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              id="input-payment-date"
            />
          </div>

          {/* Note */}
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Payment note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              id="input-payment-note"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={`btn ${
              transactionType === 'lend' ? 'btn-lend' : 'btn-borrow'
            }`}
            disabled={loading}
            id="submit-payment"
          >
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </form>
      </div>
    </div>
  );
}
