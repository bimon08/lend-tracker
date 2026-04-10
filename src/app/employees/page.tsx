'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@heroui/react';
import {
  ArrowLeft,
  Key,
  Copy,
  Check,
  X,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  UserPlus,
  DollarSign,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { dataLayer, type EmployeeKey, type PendingChange } from '@/lib/db';
import { useToast } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function EmployeesPage() {
  const router = useRouter();
  const { showToast, ToastElement } = useToast();

  const [keys, setKeys] = useState<EmployeeKey[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [k, p] = await Promise.all([
        dataLayer.getEmployeeKeys(),
        dataLayer.getPendingChanges(),
      ]);
      setKeys(k);
      setPendingChanges(p);
    } catch (e) {
      console.error('Failed to load employee data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerate = async () => {
    if (!newKeyLabel.trim()) return;
    setGenerating(true);
    try {
      const result = await dataLayer.generateEmployeeKey(newKeyLabel.trim());
      showToast(`Key created: ${result.keyCode}`);
      setNewKeyLabel('');
      setShowGenerate(false);
      fetchData();
    } catch (e) {
      console.error('Failed to generate key:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (keyCode: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(keyCode);
      setCopiedId(keyId);
      showToast('Code copied!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Failed to copy');
    }
  };

  const handleToggle = async (keyId: string, currentActive: boolean) => {
    try {
      await dataLayer.toggleEmployeeKey(keyId, !currentActive);
      fetchData();
      showToast(currentActive ? 'Key deactivated' : 'Key activated');
    } catch (e) {
      console.error('Failed to toggle key:', e);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dataLayer.deleteEmployeeKey(deleteTarget);
      setDeleteTarget(null);
      fetchData();
      showToast('Key deleted');
    } catch (e) {
      console.error('Failed to delete key:', e);
    }
  };

  const handleReview = async (changeId: string, approved: boolean) => {
    try {
      await dataLayer.reviewPendingChange(changeId, approved);
      fetchData();
      showToast(approved ? 'Change approved!' : 'Change rejected');
    } catch (e) {
      console.error('Failed to review change:', e);
    }
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'add_person': return UserPlus;
      case 'add_transaction': return DollarSign;
      case 'add_payment': return CreditCard;
      default: return AlertCircle;
    }
  };

  const getChangeLabel = (type: string) => {
    switch (type) {
      case 'add_person': return 'Add Person';
      case 'add_transaction': return 'Add Transaction';
      case 'add_payment': return 'Record Payment';
      case 'edit_transaction': return 'Edit Transaction';
      case 'delete_transaction': return 'Delete Transaction';
      case 'delete_payment': return 'Delete Payment';
      default: return type;
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-2 pb-24">
      {ToastElement}

      <button
        className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
        onClick={() => router.back()}
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className="mb-6 py-1">
        <h1 className="text-2xl font-bold tracking-tight">Employee Access</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Generate codes for employees & review their changes
        </p>
      </div>

      {/* Generate Key Section */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Access Codes
          </p>
          {!showGenerate && (
            <button
              className="rounded-lg bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-400 transition-colors hover:bg-violet-500/25"
              onClick={() => setShowGenerate(true)}
            >
              + Generate New
            </button>
          )}
        </div>

        {showGenerate && (
          <Card className="animate-in mb-4 border border-violet-500/20 bg-slate-800/40 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-200">New Access Code</p>
            <input
              type="text"
              placeholder="Employee name or label"
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              autoFocus
              className="mb-3 w-full rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500/50"
            />
            <div className="flex gap-2">
              <Button
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-2 text-sm font-semibold text-white"
                isDisabled={generating || !newKeyLabel.trim()}
                onPress={handleGenerate}
              >
                {generating ? 'Generating...' : 'Generate Code'}
              </Button>
              <Button
                className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-sm text-slate-300"
                onPress={() => { setShowGenerate(false); setNewKeyLabel(''); }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Keys List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-violet-500" />
          </div>
        ) : keys.length === 0 ? (
          <Card className="border border-white/5 bg-slate-800/30 p-6 text-center">
            <Key size={28} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm text-slate-500">No access codes yet</p>
            <p className="mt-1 text-xs text-slate-600">
              Generate a code to give an employee view & edit access
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {keys.map((key) => (
              <Card
                key={key.id}
                className={`border p-3.5 ${
                  key.isActive
                    ? 'border-white/5 bg-slate-800/40'
                    : 'border-white/5 bg-slate-800/20 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    key.isActive ? 'bg-violet-500/15 text-violet-400' : 'bg-slate-700/40 text-slate-500'
                  }`}>
                    <Key size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-200">
                      {key.label || 'Unnamed'}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <code className="rounded bg-slate-700/60 px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-emerald-400">
                        {key.keyCode}
                      </code>
                      <button
                        className="text-slate-500 hover:text-slate-300"
                        onClick={() => handleCopy(key.keyCode, key.id)}
                      >
                        {copiedId === key.id ? (
                          <Check size={14} className="text-emerald-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-300"
                      onClick={() => handleToggle(key.id, key.isActive)}
                      title={key.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {key.isActive ? (
                        <ToggleRight size={20} className="text-emerald-400" />
                      ) : (
                        <ToggleLeft size={20} />
                      )}
                    </button>
                    <button
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                      onClick={() => setDeleteTarget(key.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Pending Changes */}
      <div className="mb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Pending Changes {pendingChanges.length > 0 && (
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[0.6rem] font-bold text-amber-400">
              {pendingChanges.length}
            </span>
          )}
        </p>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-violet-500" />
          </div>
        ) : pendingChanges.length === 0 ? (
          <Card className="border border-white/5 bg-slate-800/30 p-6 text-center">
            <Clock size={28} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm text-slate-500">No pending changes</p>
            <p className="mt-1 text-xs text-slate-600">
              Employee edits will appear here for your approval
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {pendingChanges.map((change) => {
              const ChangeIcon = getChangeIcon(change.changeType);
              return (
                <Card key={change.id} className="border border-amber-500/15 bg-slate-800/40 p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                      <ChangeIcon size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-200">
                        {getChangeLabel(change.changeType)}
                      </p>
                      <p className="text-xs text-slate-500">
                        by {change.employeeLabel || change.employeeKeyCode || 'Unknown'} · {new Date(change.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Payload summary */}
                  <div className="mb-3 rounded-lg bg-slate-900/50 p-2.5 text-xs text-slate-400">
                    {change.changeType === 'add_person' && (
                      <p>Name: <span className="text-slate-200">{String(change.payload.name)}</span></p>
                    )}
                    {change.changeType === 'add_transaction' && (
                      <>
                        <p>Type: <span className="text-slate-200">{String(change.payload.type)}</span></p>
                        <p>Amount: <span className="text-slate-200">₹{String(change.payload.amount)}</span></p>
                      </>
                    )}
                    {change.changeType === 'add_payment' && (
                      <p>Amount: <span className="text-slate-200">₹{String(change.payload.amount)}</span></p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 py-2 text-sm font-semibold text-emerald-400"
                      onPress={() => handleReview(change.id, true)}
                    >
                      <Check size={16} /> Approve
                    </Button>
                    <Button
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500/10 py-2 text-sm font-semibold text-red-400"
                      onPress={() => handleReview(change.id, false)}
                    >
                      <X size={16} /> Reject
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-white/5 bg-slate-800/30 p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">How Employee Access Works</h3>
        <div className="space-y-3 text-xs text-slate-400">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[0.6rem] font-bold text-violet-500">1</span>
            <p>Generate an <strong className="text-slate-300">access code</strong> and share it with your employee</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[0.6rem] font-bold text-violet-500">2</span>
            <p>Employee uses the code to <strong className="text-slate-300">log in</strong> (no Google account needed)</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[0.6rem] font-bold text-violet-500">3</span>
            <p>Any edits they make are <strong className="text-slate-300">sent to you for approval</strong></p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[0.6rem] font-bold text-violet-500">4</span>
            <p>You <strong className="text-slate-300">approve or reject</strong> each change here</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Access Code"
        message="This will permanently revoke this employee's access. They won't be able to log in anymore."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
