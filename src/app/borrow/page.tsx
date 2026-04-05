'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownLeft,
  Plus,
  Search,
} from 'lucide-react';
import { usePersonsWithSummaries } from '@/lib/hooks';
import {
  formatCurrency,
  getInitials,
  getAvatarColor,
} from '@/lib/utils';
import AddTransactionModal from '@/components/AddTransactionModal';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';

export default function BorrowPage() {
  const router = useRouter();
  const { data: persons, loading, refetch } = usePersonsWithSummaries('borrow');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'settled'>('all');
  const { showToast, ToastElement } = useToast();

  const filtered = (persons || []).filter((p) => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    if (statusFilter === 'active' && p.borrowedOutstanding === 0) return false;
    if (statusFilter === 'settled' && p.borrowedOutstanding > 0) return false;
    return true;
  });

  return (
    <div className="page-container">
      {ToastElement}

      <div className="page-header">
        <div>
          <h1 className="page-title">Money Borrowed</h1>
          <p className="page-subtitle">People you owe</p>
        </div>
        <button
          className="btn-icon"
          onClick={() => setShowAddModal(true)}
          id="add-borrow-btn"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="search-input-wrapper">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="form-input"
          placeholder="Search people..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          id="search-borrow"
        />
      </div>

      {/* Filters */}
      <div className="filter-bar">
        {(['all', 'active', 'settled'] as const).map((f) => (
          <button
            key={f}
            className={`filter-chip ${statusFilter === f ? 'active' : ''}`}
            onClick={() => setStatusFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Settled'}
          </button>
        ))}
      </div>

      {/* Person List */}
      {loading ? (
        <div className="transaction-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ArrowDownLeft size={28} />}
          title={searchQuery ? 'No results' : 'No money borrowed'}
          description={
            searchQuery
              ? 'Try a different search term'
              : "Tap + to record when you borrow money from someone"
          }
        />
      ) : (
        <div className="transaction-list">
          {filtered.map((person) => (
            <div
              key={person.id}
              className="card card-clickable person-card animate-in"
              onClick={() => router.push(`/person/${person.id}`)}
              id={`person-borrow-${person.id}`}
            >
              <div
                className="person-avatar"
                style={{ background: getAvatarColor(person.name) }}
              >
                {getInitials(person.name)}
              </div>
              <div className="person-info">
                <div className="person-name">{person.name}</div>
                <div className="person-stats">
                  <span>{person.transactionCount} transaction{person.transactionCount !== 1 ? 's' : ''}</span>
                  <span className="dot" />
                  <span
                    className={`status-badge ${
                      person.borrowedOutstanding === 0 ? 'settled' : 'pending'
                    }`}
                  >
                    {person.borrowedOutstanding === 0 ? 'Settled' : 'Active'}
                  </span>
                </div>
                {person.borrowedOutstanding > 0 && (
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill borrow"
                      style={{
                        width: `${Math.min(
                          100,
                          ((person.totalBorrowed - person.borrowedOutstanding) /
                            person.totalBorrowed) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="person-balance">
                <div
                  className="person-balance-amount"
                  style={{
                    color:
                      person.borrowedOutstanding > 0
                        ? 'var(--color-borrow-light)'
                        : 'var(--color-text-tertiary)',
                  }}
                >
                  {formatCurrency(person.borrowedOutstanding)}
                </div>
                <div className="person-balance-label">outstanding</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          refetch();
          showToast('Borrowing recorded!');
        }}
        defaultType="borrow"
      />
    </div>
  );
}
