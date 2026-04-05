'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
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
      <div className="page-container">
        <div className="skeleton skeleton-card" style={{ height: 200 }} />
      </div>
    );
  }

  if (!txn) {
    return (
      <div className="page-container">
        <button className="back-btn" onClick={() => router.back()}>
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="empty-state">
          <h3 className="empty-state-title">Transaction not found</h3>
        </div>
      </div>
    );
  }

  const overdue = txn.dueDate && isOverdue(txn.dueDate) && txn.status !== 'settled';
  const daysLeft = txn.dueDate ? getDaysUntilDue(txn.dueDate) : null;

  return (
    <div className="page-container">
      {ToastElement}

      <button className="back-btn" onClick={() => router.back()} id="back-btn">
        <ArrowLeft size={18} />
        Back
      </button>

      {/* Transaction Header */}
      <div className="txn-detail-header animate-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`type-badge ${txn.type}`}>
            {txn.type === 'lend' ? (
              <ArrowUpRight size={12} />
            ) : (
              <ArrowDownLeft size={12} />
            )}
            {txn.type === 'lend' ? 'Lent' : 'Borrowed'}
          </span>
          <span className={`status-badge ${txn.status}`}>
            {getStatusLabel(txn.status)}
          </span>
          {overdue && (
            <span className="overdue-indicator">
              <AlertCircle size={10} />
              Overdue
            </span>
          )}
        </div>

        <div className={`txn-detail-amount ${txn.type}`}>
          {formatCurrency(txn.amount)}
        </div>

        <div
          style={{
            fontSize: '0.85rem',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
          onClick={() => router.push(`/person/${txn.personId}`)}
        >
          {txn.type === 'lend' ? 'Lent to' : 'Borrowed from'}{' '}
          <strong style={{ color: 'var(--color-text-primary)' }}>
            {txn.personName}
          </strong>
        </div>

        <div className="txn-detail-info">
          <div className="txn-detail-row">
            <span className="txn-detail-label">
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Date
            </span>
            <span className="txn-detail-value">{formatDate(txn.date)}</span>
          </div>
          {txn.dueDate && (
            <div className="txn-detail-row">
              <span className="txn-detail-label">
                <Calendar size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Due Date
              </span>
              <span
                className="txn-detail-value"
                style={{
                  color: overdue
                    ? 'var(--color-danger)'
                    : 'var(--color-text-primary)',
                }}
              >
                {formatDate(txn.dueDate)}
                {daysLeft !== null && !overdue && daysLeft > 0 && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-text-tertiary)',
                      marginLeft: '6px',
                    }}
                  >
                    ({daysLeft}d left)
                  </span>
                )}
              </span>
            </div>
          )}
          {txn.note && (
            <div className="txn-detail-row">
              <span className="txn-detail-label">
                <FileText size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Note
              </span>
              <span className="txn-detail-value">{txn.note}</span>
            </div>
          )}
          <div className="txn-detail-row">
            <span className="txn-detail-label">Paid</span>
            <span className="txn-detail-value" style={{ color: 'var(--color-success)' }}>
              {formatCurrency(txn.totalPaid)}
            </span>
          </div>
          <div className="txn-detail-row">
            <span className="txn-detail-label">Outstanding</span>
            <span
              className="txn-detail-value"
              style={{
                color:
                  txn.outstanding > 0
                    ? txn.type === 'lend'
                      ? 'var(--color-lend-light)'
                      : 'var(--color-borrow-light)'
                    : 'var(--color-text-tertiary)',
                fontWeight: 700,
              }}
            >
              {formatCurrency(txn.outstanding)}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <span>{Math.round(txn.progress)}% paid</span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-bar-fill ${txn.type}`}
            style={{ width: `${txn.progress}%` }}
          />
        </div>
      </div>

      {/* Record Payment */}
      {txn.status !== 'settled' && (
        <button
          className={`btn ${txn.type === 'lend' ? 'btn-lend' : 'btn-borrow'}`}
          style={{ marginBottom: '20px' }}
          onClick={() => setShowPaymentModal(true)}
          id="record-payment-btn"
        >
          <Plus size={18} />
          Record Payment
        </button>
      )}

      {/* Payment History */}
      <div className="section-header">
        <h2 className="section-title">Payment History</h2>
      </div>

      {txn.payments.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '24px',
            color: 'var(--color-text-tertiary)',
            fontSize: '0.85rem',
          }}
        >
          No payments recorded yet
        </div>
      ) : (
        <div className="payment-timeline" style={{ marginBottom: '20px' }}>
          {txn.payments.map((payment) => (
            <div key={payment.id} className="payment-item">
              <div className="payment-item-header">
                <span className="payment-item-amount">
                  +{formatCurrency(payment.amount)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="payment-item-date">
                    {formatDate(payment.date)}
                  </span>
                  <button
                    className="btn-icon"
                    style={{
                      width: '24px',
                      height: '24px',
                      padding: 0,
                      borderColor: 'transparent',
                    }}
                    onClick={() => setShowDeletePayment(payment.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {payment.note && (
                <div className="payment-item-note">{payment.note}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Transaction */}
      <div className="delete-zone">
        <button
          className="btn btn-ghost btn-sm"
          style={{
            color: 'var(--color-danger)',
            borderColor: 'rgba(239, 68, 68, 0.2)',
          }}
          onClick={() => setShowDeleteTxn(true)}
          id="delete-txn-btn"
        >
          <Trash2 size={14} />
          Delete Transaction
        </button>
      </div>

      {/* Modals */}
      <AddPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={async () => {
          await refetch();
          showToast('Payment recorded!');
        }}
        transactionId={id}
        transactionType={txn.type}
        outstanding={txn.outstanding}
      />

      <ConfirmDialog
        isOpen={showDeleteTxn}
        title="Delete Transaction"
        message="This will permanently delete this transaction and all its payments. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteTransaction}
        onCancel={() => setShowDeleteTxn(false)}
      />

      <ConfirmDialog
        isOpen={!!showDeletePayment}
        title="Delete Payment"
        message="This will remove this payment record and update the outstanding balance."
        confirmLabel="Delete"
        onConfirm={() => showDeletePayment && handleDeletePayment(showDeletePayment)}
        onCancel={() => setShowDeletePayment(null)}
      />
    </div>
  );
}
