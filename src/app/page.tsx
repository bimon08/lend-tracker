'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function DashboardPage() {
  const router = useRouter();
  const { data: summary, loading: summaryLoading, refetch: refetchSummary } = useSummary();
  const {
    data: recentTxns,
    loading: recentLoading,
    refetch: refetchRecent,
  } = useRecentTransactions(8);
  const [showAddModal, setShowAddModal] = useState(false);
  const [defaultType, setDefaultType] = useState<'lend' | 'borrow'>('lend');
  const [personNames, setPersonNames] = useState<Map<string, string>>(new Map());
  const { showToast, ToastElement } = useToast();

  // Load person names for recent transactions
  const loadPersonNames = useCallback(async () => {
    if (!recentTxns || recentTxns.length === 0) return;
    const names = new Map<string, string>();
    for (const txn of recentTxns) {
      if (!names.has(txn.personId)) {
        const person = await dataLayer.getPerson(txn.personId);
        if (person) names.set(person.id, person.name);
      }
    }
    setPersonNames(names);
  }, [recentTxns]);

  // Load names when recent transactions change
  useEffect(() => {
    loadPersonNames();
  }, [loadPersonNames]);

  // Reload everything
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

  return (
    <div className="page-container">
      {ToastElement}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">LendTracker</h1>
          <p className="page-subtitle">Your money, managed</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid animate-in">
        <div className="summary-card lend">
          <div className="summary-card-icon">
            <ArrowUpRight size={18} />
          </div>
          <div className="summary-card-label">Lent Out</div>
          <div className="summary-card-value">
            {summaryLoading ? '—' : formatCurrency(summary?.totalLentOutstanding || 0)}
          </div>
          {summary && summary.activeLendCount > 0 && (
            <div className="summary-card-count">
              {summary.activeLendCount} active
            </div>
          )}
        </div>

        <div className="summary-card borrow">
          <div className="summary-card-icon">
            <ArrowDownLeft size={18} />
          </div>
          <div className="summary-card-label">Borrowed</div>
          <div className="summary-card-value">
            {summaryLoading
              ? '—'
              : formatCurrency(summary?.totalBorrowedOutstanding || 0)}
          </div>
          {summary && summary.activeBorrowCount > 0 && (
            <div className="summary-card-count">
              {summary.activeBorrowCount} active
            </div>
          )}
        </div>

        <div className="summary-card net">
          <div className="summary-card-icon">
            <Scale size={18} />
          </div>
          <div className="summary-card-label">Net Balance</div>
          <div
            className="summary-card-value"
            style={{
              color:
                (summary?.netBalance || 0) > 0
                  ? 'var(--color-lend-light)'
                  : (summary?.netBalance || 0) < 0
                  ? 'var(--color-borrow-light)'
                  : 'var(--color-text-secondary)',
            }}
          >
            {summaryLoading
              ? '—'
              : `${(summary?.netBalance || 0) >= 0 ? '+' : ''}${formatCurrency(
                  summary?.netBalance || 0
                )}`}
          </div>
          <div className="summary-card-count">
            {(summary?.netBalance || 0) > 0
              ? 'Others owe you more'
              : (summary?.netBalance || 0) < 0
              ? 'You owe others more'
              : 'All settled'}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button
          className="quick-action-btn lend"
          onClick={() => openAdd('lend')}
          id="quick-lend"
        >
          <Plus size={18} />
          Lend Money
        </button>
        <button
          className="quick-action-btn borrow"
          onClick={() => openAdd('borrow')}
          id="quick-borrow"
        >
          <Plus size={18} />
          Borrow Money
        </button>
      </div>

      {/* Recent Activity */}
      <div className="section-header">
        <h2 className="section-title">Recent Activity</h2>
      </div>

      {recentLoading ? (
        <div className="transaction-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : !recentTxns || recentTxns.length === 0 ? (
        <EmptyState
          icon={<Clock size={28} />}
          title="No transactions yet"
          description="Start by lending or borrowing money to see your activity here"
        />
      ) : (
        <div className="transaction-list">
          {recentTxns.map((txn) => {
            const name = personNames.get(txn.personId) || '...';
            return (
              <div
                key={txn.id}
                className="card card-clickable transaction-card animate-in"
                onClick={() => router.push(`/transaction/${txn.id}`)}
                id={`txn-${txn.id}`}
              >
                <div
                  className="transaction-avatar"
                  style={{ background: getAvatarColor(name) }}
                >
                  {getInitials(name)}
                </div>
                <div className="transaction-info">
                  <div className="transaction-name">{name}</div>
                  <div className="transaction-meta">
                    <span className={`type-badge ${txn.type}`}>
                      {txn.type === 'lend' ? (
                        <ArrowUpRight size={10} />
                      ) : (
                        <ArrowDownLeft size={10} />
                      )}
                      {txn.type === 'lend' ? 'Lent' : 'Borrowed'}
                    </span>
                    <span className="dot" />
                    <span className="transaction-date">
                      {formatRelativeDate(txn.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="transaction-amounts">
                  <div className={`transaction-amount ${txn.type}`}>
                    {formatCurrency(txn.amount)}
                  </div>
                  <div className={`status-badge ${txn.status}`}>
                    {getStatusLabel(txn.status)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refreshAll}
        defaultType={defaultType}
      />
    </div>
  );
}
