'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@heroui/react';
import {
  Check,
  X,
  ChevronRight,
  UserPlus,
  DollarSign,
  CreditCard,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { dataLayer, type PendingChange } from '@/lib/db';

interface PendingChangesModalProps {
  onDismiss: () => void;
}

export default function PendingChangesModal({ onDismiss }: PendingChangesModalProps) {
  const [changes, setChanges] = useState<PendingChange[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const fetchChanges = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dataLayer.getPendingChanges();
      setChanges(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChanges();
  }, [fetchChanges]);

  const handleAction = async (approved: boolean) => {
    const change = changes[currentIndex];
    if (!change) return;
    setActing(true);
    try {
      await dataLayer.reviewPendingChange(change.id, approved);
      const remaining = changes.filter((_, i) => i !== currentIndex);
      setChanges(remaining);
      if (currentIndex >= remaining.length && remaining.length > 0) {
        setCurrentIndex(remaining.length - 1);
      }
      if (remaining.length === 0) {
        onDismiss();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActing(false);
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

  const getPayloadSummary = (change: PendingChange) => {
    const p = change.payload;
    switch (change.changeType) {
      case 'add_person':
        return [{ label: 'Name', value: String(p.name) }];
      case 'add_transaction':
        return [
          { label: 'Type', value: String(p.type) },
          { label: 'Amount', value: `₹${p.amount}` },
          { label: 'Person', value: String(p.person_name || p.person_id || '') },
        ];
      case 'add_payment':
        return [
          { label: 'Amount', value: `₹${p.amount}` },
          { label: 'Note', value: String(p.note || '—') },
        ];
      default:
        return [{ label: 'Details', value: JSON.stringify(p).slice(0, 60) }];
    }
  };

  if (loading) return null;
  if (changes.length === 0) return null;

  const current = changes[currentIndex];
  if (!current) return null;
  const ChangeIcon = getChangeIcon(current.changeType);
  const summary = getPayloadSummary(current);

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="animate-in w-full max-w-md rounded-t-2xl border border-white/10 bg-slate-900 shadow-2xl sm:mx-4 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-400" />
            <p className="text-sm font-semibold text-slate-200">
              Pending Review
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-400">
              {currentIndex + 1} / {changes.length}
            </span>
            <button
              className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:text-slate-300"
              onClick={onDismiss}
            >
              Skip All
            </button>
          </div>
        </div>

        {/* Change Card */}
        <div className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <ChangeIcon size={20} />
            </div>
            <div>
              <p className="text-base font-bold text-slate-100">
                {getChangeLabel(current.changeType)}
              </p>
              <p className="text-xs text-slate-500">
                by {current.employeeLabel || current.employeeKeyCode || 'Employee'} · {new Date(current.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Payload */}
          <div className="mb-5 space-y-2 rounded-xl bg-slate-800/60 p-3.5">
            {summary.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-medium text-slate-200">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 text-sm font-semibold text-red-400 transition-transform active:scale-[0.97]"
              onPress={() => handleAction(false)}
              isDisabled={acting}
            >
              <X size={18} /> Reject
            </Button>
            <Button
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500/15 py-3 text-sm font-semibold text-emerald-400 transition-transform active:scale-[0.97]"
              onPress={() => handleAction(true)}
              isDisabled={acting}
            >
              <Check size={18} /> Approve
            </Button>
          </div>

          {/* Skip to next */}
          {changes.length > 1 && (
            <button
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs text-slate-500 hover:text-slate-300"
              onClick={() => setCurrentIndex((currentIndex + 1) % changes.length)}
            >
              Skip this one <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
