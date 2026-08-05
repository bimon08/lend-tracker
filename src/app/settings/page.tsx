'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Download,
  Upload,
  Trash2,
  ChevronRight,
  Cloud,
  Info,
  LogOut,
  UsersRound,
} from 'lucide-react';
import { dataLayer } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export default function SettingsPage() {
  const router = useRouter();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastElement } = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || null);
        setUserName(user.user_metadata?.full_name || user.user_metadata?.name || null);
        setUserAvatar(user.user_metadata?.avatar_url || null);
      }
    });
  }, []);

  const handleExport = async () => {
    try {
      const jsonData = await dataLayer.exportAllData();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lendtracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Export failed', 'error');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const result = await dataLayer.importData(text);
      showToast(
        `Imported ${result.personsCount} people, ${result.transactionsCount} transactions, ${result.paymentsCount} payments`
      );
    } catch (error) {
      console.error('Import failed:', error);
      showToast('Import failed — invalid file', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearAll = async () => {
    try {
      await dataLayer.clearAllData();
      setShowClearConfirm(false);
      showToast('All data cleared');
    } catch (error) {
      console.error('Clear failed:', error);
      showToast('Failed to clear data', 'error');
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const SettingsItem = ({
    icon: Icon,
    title,
    subtitle,
    onClick,
    danger,
    id,
    children,
  }: {
    icon: React.ElementType;
    title: string;
    subtitle: string;
    onClick?: () => void;
    danger?: boolean;
    id?: string;
    children?: React.ReactNode;
  }) => (
    <div
      className={`flex items-center gap-3.5 rounded-xl px-3.5 py-3 transition-all ${
        onClick ? 'cursor-pointer active:scale-[0.99] active:bg-white/5' : ''
      } ${danger ? 'active:bg-red-500/5' : ''}`}
      onClick={onClick}
      id={id}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ${
          danger ? 'bg-red-500/10 text-red-400' : 'bg-white/10 text-white/60'
        }`}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-white'}`}>
          {title}
        </p>
        <p className="text-xs text-white/40">{subtitle}</p>
      </div>
      {children}
      {onClick && <ChevronRight size={16} className="text-white/20" />}
    </div>
  );

  return (
    <div className="mx-auto max-w-lg px-4 pt-2 pb-24">
      {ToastElement}

      <div className="mb-5 py-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-0.5 text-sm text-white/50">Manage your account &amp; data</p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
        {/* Account */}
        <motion.div variants={fadeUp}>
          <p className="mb-2 px-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white/40">
            Account
          </p>
          <div className="glass-card overflow-hidden rounded-2xl p-1">
            <SettingsItem
              icon={() => (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                  {(userName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              title={userName || 'User'}
              subtitle={userEmail || 'Loading...'}
            />
            <SettingsItem
              icon={LogOut}
              title="Sign Out"
              subtitle="Sign out of your account"
              onClick={handleSignOut}
              id="sign-out-btn"
            />
          </div>
        </motion.div>

        {/* Team */}
        <motion.div variants={fadeUp}>
          <p className="mb-2 px-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white/40">
            Team
          </p>
          <div className="glass-card overflow-hidden rounded-2xl p-1">
            <SettingsItem
              icon={UsersRound}
              title="Employee Access"
              subtitle="Generate access codes & review changes"
              onClick={() => router.push('/employees')}
              id="employee-access"
            />
          </div>
        </motion.div>

        {/* Data Management */}
        <motion.div variants={fadeUp}>
          <p className="mb-2 px-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white/40">
            Data Management
          </p>
          <div className="glass-card overflow-hidden rounded-2xl p-1">
            <SettingsItem
              icon={Download}
              title="Export Data"
              subtitle="Download all data as JSON backup"
              onClick={handleExport}
              id="export-data"
            />
            <SettingsItem
              icon={Upload}
              title={importing ? 'Importing...' : 'Import Data'}
              subtitle="Restore from a JSON backup file"
              onClick={() => fileInputRef.current?.click()}
              id="import-data"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </motion.div>

        {/* About */}
        <motion.div variants={fadeUp}>
          <p className="mb-2 px-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white/40">
            About
          </p>
          <div className="glass-card overflow-hidden rounded-2xl p-1">
            <SettingsItem
              icon={Cloud}
              title="Storage"
              subtitle="Offline-first (local) · Syncs to cloud when online"
            />
            <SettingsItem
              icon={Info}
              title="LendTracker"
              subtitle="v3.0.0 · Offline-First Edition · by Pixel Thread"
            />
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div variants={fadeUp}>
          <p className="mb-2 px-1 text-[0.65rem] font-semibold uppercase tracking-wider text-red-400/60">
            Danger Zone
          </p>
          <div className="glass-card overflow-hidden rounded-2xl border-red-500/15! p-1">
            <SettingsItem
              icon={Trash2}
              title="Clear All Data"
              subtitle="Permanently delete everything. Cannot be undone."
              onClick={() => setShowClearConfirm(true)}
              danger
              id="clear-all-data"
            />
          </div>
        </motion.div>
      </motion.div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear All Data?"
        message="This will permanently delete ALL your people, transactions, and payments. Export your data first if you want to keep it. This action cannot be undone."
        confirmLabel="Delete Everything"
        onConfirm={handleClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
