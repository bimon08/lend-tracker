'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const fadeUp = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export default function PeoplePage() {
  const router = useRouter();
  const { data: persons, loading, refetch } = usePersonsWithSummaries();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [showAddPerson, setShowAddPerson] = useState(false);
  const { showToast, ToastElement } = useToast();

  const filtered = (persons || []).filter((p) => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
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
        <h1 className="text-2xl font-bold tracking-tight text-white">People</h1>
        <p className="mt-0.5 text-sm text-white/50">Everyone you transact with</p>
      </div>

      {/* Glass Tabs */}
      <div className="glass-card mb-4 flex gap-1 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.key ? 'text-white' : 'text-white/40'
            }`}
            id={`tab-${tab.key}`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="people-tab-active"
                className="absolute inset-0 rounded-lg bg-white/15"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Glass Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Search people..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="glass-card w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30"
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
        <motion.div className="flex flex-col gap-2.5" variants={stagger} initial="hidden" animate="show">
          {filtered.map((person) => {
            const net = person.lentOutstanding - person.borrowedOutstanding;
            return (
              <motion.div
                key={person.id}
                variants={fadeUp}
                className="glass-card flex cursor-pointer items-center gap-3.5 rounded-2xl p-3.5 transition-all active:scale-[0.98]"
                onClick={() => router.push(`/person/${person.id}`)}
                id={`person-${person.id}`}
              >
                <UserAvatar name={person.name} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{person.name}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    {person.lentOutstanding > 0 && (
                      <span className="flex items-center gap-0.5 text-white/70">
                        <ArrowUpRight size={10} /> {formatCurrency(person.lentOutstanding)}
                      </span>
                    )}
                    {person.lentOutstanding > 0 && person.borrowedOutstanding > 0 && (
                      <span className="h-1 w-1 rounded-full bg-white/20" />
                    )}
                    {person.borrowedOutstanding > 0 && (
                      <span className="flex items-center gap-0.5 text-white/70">
                        <ArrowDownLeft size={10} /> {formatCurrency(person.borrowedOutstanding)}
                      </span>
                    )}
                    {person.lentOutstanding === 0 && person.borrowedOutstanding === 0 && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-400">
                        All Settled
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-bold text-white">
                    {net >= 0 ? '+' : ''}{formatCurrency(net)}
                  </p>
                  <p className="text-[0.7rem] text-white/50">
                    {net > 0 ? 'owes you' : net < 0 ? 'you owe' : 'settled'}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <AddPersonModal
        isOpen={showAddPerson}
        onClose={() => setShowAddPerson(false)}
        onSuccess={() => { refetch(); showToast('Person added!'); }}
      />

      {/* Floating Glass FAB */}
      <button
        className="fixed bottom-20 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full transition-transform active:scale-90"
        style={{
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(30px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(30px) saturate(1.6)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: 'inset 0 0 2px 1px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={() => setShowAddPerson(true)}
        id="fab-people"
      >
        <Plus size={24} className="text-white" />
      </button>
      {ToastElement}
    </div>
  );
}
