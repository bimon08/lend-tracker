'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@heroui/react';
import {
  Download,
  Upload,
  Trash2,
  ChevronRight,
  Cloud,
  Info,
  LogOut,
  User,
  UsersRound,
} from 'lucide-react';
import { dataLayer } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';

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
      className={`flex items-center gap-3.5 rounded-xl px-3.5 py-3 transition-colors ${
        onClick ? 'cursor-pointer hover:bg-white/5 active:scale-[0.99]' : ''
      } ${danger ? 'hover:bg-red-500/5' : ''}`}
      onClick={onClick}
      id={id}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ${
          danger ? 'bg-red-500/10 text-red-400' : 'bg-slate-700/50 text-slate-400'
        }`}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-slate-200'}`}>
          {title}
        </p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      {children}
      {onClick && <ChevronRight size={16} className="text-slate-600" />}
    </div>
  );

  return (
    <div className="mx-auto max-w-lg px-4 pt-2">
      {ToastElement}

      <div className="mb-5 py-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-slate-400">Manage your account &amp; data</p>
      </div>

      {/* Account */}
      <div className="mb-4">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Account
        </p>
        <Card className="overflow-hidden border border-white/5 bg-slate-800/40 p-1">
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
        </Card>
      </div>



      {/* Employee Access */}
      <div className="mb-4">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Team
        </p>
        <Card className="overflow-hidden border border-white/5 bg-slate-800/40 p-1">
          <SettingsItem
            icon={UsersRound}
            title="Employee Access"
            subtitle="Generate access codes & review changes"
            onClick={() => router.push('/employees')}
            id="employee-access"
          />
        </Card>
      </div>

      {/* Data Management */}
      <div className="mb-4">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Data Management
        </p>
        <Card className="overflow-hidden border border-white/5 bg-slate-800/40 p-1">
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
        </Card>
      </div>

      {/* About */}
      <div className="mb-4">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          About
        </p>
        <Card className="overflow-hidden border border-white/5 bg-slate-800/40 p-1">
          <SettingsItem
            icon={Cloud}
            title="Storage"
            subtitle="Cloud synced (Supabase) — access from any device"
          />
          <SettingsItem
            icon={Info}
            title="LendTracker"
            subtitle="v2.0.0 · Cloud Edition · by Pixel Thread"
          />
        </Card>
      </div>

      {/* Danger Zone */}
      <div className="mb-6">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-red-400">
          Danger Zone
        </p>
        <Card className="overflow-hidden border border-red-500/10 bg-slate-800/40 p-1">
          <SettingsItem
            icon={Trash2}
            title="Clear All Data"
            subtitle="Permanently delete everything. Cannot be undone."
            onClick={() => setShowClearConfirm(true)}
            danger
            id="clear-all-data"
          />
        </Card>
      </div>

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
