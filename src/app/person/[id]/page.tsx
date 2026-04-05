'use client';

import { useState, use, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Trash2,
} from 'lucide-react';
import { usePerson, usePersonSummary, useTransactions } from '@/lib/hooks';
import { dataLayer } from '@/lib/db';
import type { Payment } from '@/lib/db';
import {
  formatCurrency,
  formatDate,
  getInitials,
  getAvatarColor,
  getStatusLabel,
} from '@/lib/utils';
import AddTransactionModal from '@/components/AddTransactionModal';
import AddPaymentModal from '@/components/AddPaymentModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';

export default function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: person, loading: personLoading, refetch: refetchPerson } = usePerson(id);
  const { data: summary, refetch: refetchSummary } = usePersonSummary(id);
  const { data: transactions, refetch: refetchTxns } = useTransactions({
    personId: id,
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'lend' | 'borrow'>('lend');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{
    txnId: string;
    type: 'lend' | 'borrow';
    outstanding: number;
  } | null>(null);
  const [showDeletePerson, setShowDeletePerson] = useState(false);
  const [txnPayments, setTxnPayments] = useState<Map<string, Payment[]>>(new Map());
  const { showToast, ToastElement } = useToast();

  // Load payments for all transactions
  const loadPayments = useCallback(async () => {
    if (!transactions) return;
    const map = new Map<string, Payment[]>();
    for (const txn of transactions) {
      const payments = await dataLayer.getPayments(txn.id);
      map.set(txn.id, payments);
    }
    setTxnPayments(map);
  }, [transactions]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const refreshAll = async () => {
    await refetchPerson();
    await refetchSummary();
    await refetchTxns();
  };

  const handleDeletePerson = async () => {
    await dataLayer.deletePerson(id);
    showToast('Person deleted', 'success');
    router.push('/people');
  };

  const openPaymentModal = (
    txnId: string,
    type: 'lend' | 'borrow',
    outstanding: number
  ) => {
    setPaymentTarget({ txnId, type, outstanding });
    setShowPaymentModal(true);
  };

  if (personLoading) {
    return (
      <div className="page-container">
        <div className="skeleton skeleton-card" style={{ height: 200 }} />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="page-container">
        <EmptyState title="Person not found" description="This person doesn't exist" />
      </div>
    );
  }

  const net = (summary?.lentOutstanding || 0) - (summary?.borrowedOutstanding || 0);

  return (
    <div className="page-container">
      {ToastElement}

      {/* Back Button */}
      <button className="back-btn" onClick={() => router.back()} id="back-btn">
        <ArrowLeft size={18} />
        Back
      </button>

      {/* Hero Card */}
      <div className="detail-hero animate-in">
        <div
          className="detail-hero-avatar"
          style={{ background: getAvatarColor(person.name) }}
        >
          {getInitials(person.name)}
        </div>
        <div className="detail-hero-name">{person.name}</div>
        <div className="detail-hero-label">Net Balance</div>
        <div
          className={`detail-hero-balance ${
            net > 0 ? 'positive' : net < 0 ? 'negative' : 'zero'
          }`}
        >
          {net >= 0 ? '+' : ''}
          {formatCurrency(net)}
        </div>
        <div className="detail-hero-label">
          {net > 0
            ? 'owes you'
            : net < 0
            ? 'you owe'
            : 'all settled'}
        </div>

        <div className="detail-stats">
          <div className="detail-stat">
            <div
              className="detail-stat-value"
              style={{ color: 'var(--color-lend-light)' }}
            >
              {formatCurrency(summary?.lentOutstanding || 0)}
            </div>
            <div className="detail-stat-label">Lent Outstanding</div>
          </div>
          <div className="detail-stat">
            <div
              className="detail-stat-value"
              style={{ color: 'var(--color-borrow-light)' }}
            >
              {formatCurrency(summary?.borrowedOutstanding || 0)}
            </div>
            <div className="detail-stat-label">Borrowed Outstanding</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button
          className="quick-action-btn lend"
          onClick={() => {
            setAddType('lend');
            setShowAddModal(true);
          }}
          id="person-lend-btn"
        >
          <Plus size={16} />
          Lend
        </button>
        <button
          className="quick-action-btn borrow"
          onClick={() => {
            setAddType('borrow');
            setShowAddModal(true);
          }}
          id="person-borrow-btn"
        >
          <Plus size={16} />
          Borrow
        </button>
      </div>

      {/* Transactions */}
      <div className="section-header">
        <h2 className="section-title">Transactions</h2>
      </div>

      {!transactions || transactions.length === 0 ? (
        <EmptyState
          title="No transactions"
          description="Add a transaction with this person"
        />
      ) : (
        <div className="transaction-list">
          {transactions.map((txn) => {
            const payments = txnPayments.get(txn.id) || [];
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const outstanding = Math.max(0, txn.amount - totalPaid);
            const progress =
              txn.amount > 0
                ? Math.min(100, (totalPaid / txn.amount) * 100)
                : 100;

            return (
              <div key={txn.id} className="card animate-in" style={{ padding: '14px' }}>
                {/* Transaction header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`type-badge ${txn.type}`}>
                      {txn.type === 'lend' ? (
                        <ArrowUpRight size={10} />
                      ) : (
                        <ArrowDownLeft size={10} />
                      )}
                      {txn.type === 'lend' ? 'Lent' : 'Borrowed'}
                    </span>
                    <span className={`status-badge ${txn.status}`}>
                      {getStatusLabel(txn.status)}
                    </span>
                  </div>
                  <div
                    className={`transaction-amount ${txn.type}`}
                    style={{ fontSize: '1.1rem' }}
                  >
                    {formatCurrency(txn.amount)}
                  </div>
                </div>

                {/* Date & Note */}
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>
                  {formatDate(txn.date)}
                  {txn.note && <> · {txn.note}</>}
                  {txn.dueDate && (
                    <> · Due: {formatDate(txn.dueDate)}</>
                  )}
                </div>

                {/* Progress */}
                {txn.status !== 'settled' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                    <span>Paid: {formatCurrency(totalPaid)}</span>
                    <span>Left: {formatCurrency(outstanding)}</span>
                  </div>
                )}
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill ${txn.type}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Payment Timeline */}
                {payments.length > 0 && (
                  <div className="payment-timeline" style={{ marginTop: '12px' }}>
                    {payments.map((payment) => (
                      <div key={payment.id} className="payment-item">
                        <div className="payment-item-header">
                          <span className="payment-item-amount">
                            +{formatCurrency(payment.amount)}
                          </span>
                          <span className="payment-item-date">
                            {formatDate(payment.date)}
                          </span>
                        </div>
                        {payment.note && (
                          <div className="payment-item-note">{payment.note}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Record Payment Button */}
                {txn.status !== 'settled' && (
                  <button
                    className={`btn btn-sm ${
                      txn.type === 'lend' ? 'btn-lend' : 'btn-borrow'
                    }`}
                    style={{ marginTop: '12px' }}
                    onClick={() => openPaymentModal(txn.id, txn.type, outstanding)}
                    id={`record-payment-${txn.id}`}
                  >
                    <Plus size={14} />
                    Record Payment
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Person */}
      <div className="delete-zone">
        <button
          className="btn btn-ghost btn-sm"
          style={{
            color: 'var(--color-danger)',
            borderColor: 'rgba(239, 68, 68, 0.2)',
          }}
          onClick={() => setShowDeletePerson(true)}
          id="delete-person-btn"
        >
          <Trash2 size={14} />
          Delete Person & All Transactions
        </button>
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={async () => {
          await refreshAll();
          showToast('Transaction added!');
        }}
        defaultType={addType}
        defaultPersonName={person.name}
      />

      {paymentTarget && (
        <AddPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={async () => {
            await refreshAll();
            await loadPayments();
            showToast('Payment recorded!');
          }}
          transactionId={paymentTarget.txnId}
          transactionType={paymentTarget.type}
          outstanding={paymentTarget.outstanding}
        />
      )}

      <ConfirmDialog
        isOpen={showDeletePerson}
        title="Delete Person"
        message={`This will permanently delete ${person.name} and all their transactions and payments. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeletePerson}
        onCancel={() => setShowDeletePerson(false)}
      />
    </div>
  );
}
