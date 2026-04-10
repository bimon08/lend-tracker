'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@heroui/react';
import { ArrowUpRight, Plus, Search } from 'lucide-react';
import { usePersonsWithSummaries } from '@/lib/hooks';
import { formatCurrency, getInitials, getAvatarColor } from '@/lib/utils';
import AddTransactionModal from '@/components/AddTransactionModal';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';

export default function LendPage() {
  const router = useRouter();
  const { data: persons, loading, refetch } = usePersonsWithSummaries('lend');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'settled'>('all');
  const { showToast, ToastElement } = useToast();

  const filtered = (persons || []).filter((p) => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter === 'active' && p.lentOutstanding === 0) return false;
    if (statusFilter === 'settled' && p.lentOutstanding > 0) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-lg px-4 pt-2 pb-24">
      {ToastElement}

      <div className="mb-5 py-1">
        <h1 className="text-2xl font-bold tracking-tight">Money Lent</h1>
        <p className="mt-0.5 text-sm text-slate-400">People who owe you</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search people..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-800/60 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500/50"
          id="search-lend"
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {(['all', 'active', 'settled'] as const).map((f) => (
          <button
            key={f}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === f
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-300'
            }`}
            onClick={() => setStatusFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Settled'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ArrowUpRight size={28} />}
          title={searchQuery ? 'No results' : 'No money lent'}
          description={searchQuery ? 'Try a different search term' : "Tap + to record when you lend money to someone"}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((person) => (
            <div
              key={person.id}
              className="animate-in flex cursor-pointer items-center gap-3.5 rounded-2xl border border-white/5 bg-slate-800/40 p-3.5 transition-colors hover:bg-slate-800/60 active:scale-[0.98]"
              onClick={() => router.push(`/person/${person.id}`)}
              id={`person-lend-${person.id}`}
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ background: getAvatarColor(person.name) }}
              >
                {getInitials(person.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{person.name}</p>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <span>{person.transactionCount} txn{person.transactionCount !== 1 ? 's' : ''}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-600" />
                  <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                    person.lentOutstanding === 0 ? 'bg-emerald-500/12 text-emerald-500' : 'bg-red-500/12 text-red-500'
                  }`}>
                    {person.lentOutstanding === 0 ? 'Settled' : 'Active'}
                  </span>
                </div>
                {person.lentOutstanding > 0 && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-700/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, ((person.totalLent - person.lentOutstanding) / person.totalLent) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-base font-bold" style={{ color: person.lentOutstanding > 0 ? '#34d399' : '#64748b' }}>
                  {formatCurrency(person.lentOutstanding)}
                </p>
                <p className="text-[0.7rem] text-slate-500">outstanding</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { refetch(); showToast('Lending recorded!'); }}
        defaultType="lend"
      />

      {/* FAB */}
      <button
        className="fixed bottom-20 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 transition-transform active:scale-90"
        onClick={() => setShowAddModal(true)}
        id="fab-lend"
      >
        <Plus size={24} className="text-white" />
      </button>
    </div>
  );
}
