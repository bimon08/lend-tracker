'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react';
import { usePersonsWithSummaries } from '@/lib/hooks';
import { formatCurrency } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';
import AddPersonModal from '@/components/AddPersonModal';
import UserAvatar from '@/components/UserAvatar';
import { useToast } from '@/components/Toast';

type TabFilter = 'all' | 'lent' | 'borrowed';

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'lent', label: 'Lent' },
  { key: 'borrowed', label: 'Borrowed' },
];

export default function PeoplePage() {
  const router = useRouter();
  const { data: persons, loading, refetch } = usePersonsWithSummaries();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [showAddPerson, setShowAddPerson] = useState(false);
  const { showToast, ToastElement } = useToast();

  const filtered = (persons || []).filter((p) => {
    // Search filter
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Tab filter
    if (activeTab === 'lent') return p.lentOutstanding > 0;
    if (activeTab === 'borrowed') return p.borrowedOutstanding > 0;
    return true;
  });

  const getEmptyMessage = () => {
    if (searchQuery) return { title: 'No results', desc: 'Try a different search term' };
    if (activeTab === 'lent') return { title: 'No active lending', desc: 'You haven\'t lent money to anyone yet' };
    if (activeTab === 'borrowed') return { title: 'No active borrowing', desc: 'You haven\'t borrowed money from anyone yet' };
    return { title: 'No people yet', desc: 'Add a transaction to see people here' };
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-2 pb-24">
      <div className="mb-5 py-1">
        <h1 className="text-2xl font-bold tracking-tight">People</h1>
        <p className="mt-0.5 text-sm text-slate-400">Everyone you transact with</p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl bg-slate-800/60 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? tab.key === 'lent'
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                  : tab.key === 'borrowed'
                    ? 'bg-amber-500/20 text-amber-400 shadow-sm'
                    : 'bg-violet-500/20 text-violet-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            id={`tab-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
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
          id="search-people"
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title={getEmptyMessage().title}
          description={getEmptyMessage().desc}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((person) => {
            const net = person.lentOutstanding - person.borrowedOutstanding;
            return (
              <div
                key={person.id}
                className="animate-in flex cursor-pointer items-center gap-3.5 rounded-2xl border border-white/5 bg-slate-800/40 p-3.5 transition-colors hover:bg-slate-800/60 active:scale-[0.98]"
                onClick={() => router.push(`/person/${person.id}`)}
                id={`person-${person.id}`}
              >
                <UserAvatar name={person.name} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{person.name}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    {person.lentOutstanding > 0 && (
                      <span className="flex items-center gap-0.5 text-emerald-500">
                        <ArrowUpRight size={10} /> {formatCurrency(person.lentOutstanding)}
                      </span>
                    )}
                    {person.lentOutstanding > 0 && person.borrowedOutstanding > 0 && (
                      <span className="h-1 w-1 rounded-full bg-slate-600" />
                    )}
                    {person.borrowedOutstanding > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-500">
                        <ArrowDownLeft size={10} /> {formatCurrency(person.borrowedOutstanding)}
                      </span>
                    )}
                    {person.lentOutstanding === 0 && person.borrowedOutstanding === 0 && (
                      <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-500">
                        All Settled
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-bold" style={{ color: net > 0 ? '#34d399' : net < 0 ? '#fbbf24' : '#64748b' }}>
                    {net >= 0 ? '+' : ''}{formatCurrency(net)}
                  </p>
                  <p className="text-[0.7rem] text-slate-500">
                    {net > 0 ? 'owes you' : net < 0 ? 'you owe' : 'settled'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddPersonModal
        isOpen={showAddPerson}
        onClose={() => setShowAddPerson(false)}
        onSuccess={() => { refetch(); showToast('Person added!'); }}
      />

      {/* FAB */}
      <button
        className="fixed bottom-20 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 transition-transform active:scale-90"
        onClick={() => setShowAddPerson(true)}
        id="fab-people"
      >
        <Plus size={24} className="text-white" />
      </button>
      {ToastElement}
    </div>
  );
}
