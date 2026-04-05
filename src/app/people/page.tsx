'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { usePersonsWithSummaries } from '@/lib/hooks';
import { formatCurrency, getInitials, getAvatarColor } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';

export default function PeoplePage() {
  const router = useRouter();
  const { data: persons, loading } = usePersonsWithSummaries();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = (persons || []).filter((p) => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">People</h1>
          <p className="page-subtitle">Everyone you transact with</p>
        </div>
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
          id="search-people"
        />
      </div>

      {/* Person List */}
      {loading ? (
        <div className="transaction-list">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title={searchQuery ? 'No results' : 'No people yet'}
          description={
            searchQuery
              ? 'Try a different search term'
              : 'Add a transaction to see people here'
          }
        />
      ) : (
        <div className="transaction-list">
          {filtered.map((person) => {
            const net = person.lentOutstanding - person.borrowedOutstanding;
            return (
              <div
                key={person.id}
                className="card card-clickable person-card animate-in"
                onClick={() => router.push(`/person/${person.id}`)}
                id={`person-${person.id}`}
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
                    {person.lentOutstanding > 0 && (
                      <>
                        <span style={{ color: 'var(--color-lend)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <ArrowUpRight size={10} />
                          {formatCurrency(person.lentOutstanding)}
                        </span>
                      </>
                    )}
                    {person.lentOutstanding > 0 && person.borrowedOutstanding > 0 && (
                      <span className="dot" />
                    )}
                    {person.borrowedOutstanding > 0 && (
                      <span style={{ color: 'var(--color-borrow)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <ArrowDownLeft size={10} />
                        {formatCurrency(person.borrowedOutstanding)}
                      </span>
                    )}
                    {person.lentOutstanding === 0 && person.borrowedOutstanding === 0 && (
                      <span className="status-badge settled">All Settled</span>
                    )}
                  </div>
                </div>
                <div className="person-balance">
                  <div
                    className="person-balance-amount"
                    style={{
                      color:
                        net > 0
                          ? 'var(--color-lend-light)'
                          : net < 0
                          ? 'var(--color-borrow-light)'
                          : 'var(--color-text-tertiary)',
                    }}
                  >
                    {net >= 0 ? '+' : ''}{formatCurrency(net)}
                  </div>
                  <div className="person-balance-label">
                    {net > 0 ? 'owes you' : net < 0 ? 'you owe' : 'settled'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
