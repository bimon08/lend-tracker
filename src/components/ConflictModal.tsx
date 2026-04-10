'use client';

import { useState } from 'react';
import { AlertTriangle, Clock, Smartphone } from 'lucide-react';
import { Button } from '@heroui/react';

export interface ConflictData {
  queuedAction: {
    action: string;
    args: unknown[];
    createdAt: string;
  };
  serverData: Record<string, unknown>;
  offlineData: Record<string, unknown>;
  label: string; // e.g. "Update person: John"
}

interface ConflictModalProps {
  conflict: ConflictData;
  onResolve: (choice: 'server' | 'offline') => void;
  onSkip: () => void;
  remaining: number;
}

export default function ConflictModal({ conflict, onResolve, onSkip, remaining }: ConflictModalProps) {
  const [selected, setSelected] = useState<'server' | 'offline' | null>(null);

  const serverTime = conflict.serverData.updated_at
    ? new Date(conflict.serverData.updated_at as string).toLocaleString()
    : 'Unknown';
  const offlineTime = new Date(conflict.queuedAction.createdAt).toLocaleString();

  // Determine which is newer (default selection)
  const serverTs = conflict.serverData.updated_at ? new Date(conflict.serverData.updated_at as string).getTime() : 0;
  const offlineTs = new Date(conflict.queuedAction.createdAt).getTime();
  const newerIsServer = serverTs > offlineTs;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-slate-900 shadow-2xl sm:mx-4 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
          <AlertTriangle size={18} className="text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-slate-200">Data Conflict</p>
            <p className="text-xs text-slate-500">{conflict.label}</p>
          </div>
          {remaining > 0 && (
            <span className="ml-auto rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-400">
              +{remaining} more
            </span>
          )}
        </div>

        <div className="p-5">
          <p className="mb-4 text-xs text-slate-400">
            This record was changed on another device while you were offline. Choose which version to keep:
          </p>

          {/* Server version */}
          <button
            className={`mb-3 w-full rounded-xl border p-4 text-left transition-all ${
              selected === 'server'
                ? 'border-violet-500/50 bg-violet-500/10'
                : 'border-white/10 bg-slate-800/40 hover:border-white/20'
            }`}
            onClick={() => setSelected('server')}
          >
            <div className="mb-2 flex items-center gap-2">
              <Smartphone size={14} className="text-violet-400" />
              <span className="text-xs font-semibold text-violet-300">
                Server Version {newerIsServer ? '(newer)' : ''}
              </span>
              <span className="ml-auto text-[0.6rem] text-slate-500">{serverTime}</span>
            </div>
            <div className="space-y-1 text-xs">
              {Object.entries(conflict.serverData)
                .filter(([k]) => !['id', 'user_id', 'created_at', 'updated_at'].includes(k))
                .slice(0, 4)
                .map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-slate-500">{key}</span>
                    <span className="text-slate-300">{String(val ?? '—')}</span>
                  </div>
                ))}
            </div>
          </button>

          {/* Offline version */}
          <button
            className={`mb-4 w-full rounded-xl border p-4 text-left transition-all ${
              selected === 'offline'
                ? 'border-emerald-500/50 bg-emerald-500/10'
                : 'border-white/10 bg-slate-800/40 hover:border-white/20'
            }`}
            onClick={() => setSelected('offline')}
          >
            <div className="mb-2 flex items-center gap-2">
              <Clock size={14} className="text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300">
                Your Offline Version {!newerIsServer ? '(newer)' : ''}
              </span>
              <span className="ml-auto text-[0.6rem] text-slate-500">{offlineTime}</span>
            </div>
            <div className="space-y-1 text-xs">
              {Object.entries(conflict.offlineData)
                .filter(([k]) => !['id', 'user_id', 'created_at', 'updated_at'].includes(k))
                .slice(0, 4)
                .map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-slate-500">{key}</span>
                    <span className="text-slate-300">{String(val ?? '—')}</span>
                  </div>
                ))}
            </div>
          </button>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              className="flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 text-sm font-semibold text-white"
              onPress={() => onResolve(selected || (newerIsServer ? 'server' : 'offline'))}
            >
              {selected
                ? `Keep ${selected === 'server' ? 'Server' : 'Offline'} Version`
                : `Keep ${newerIsServer ? 'Server' : 'Offline'} (Latest)`}
            </Button>
            <Button
              className="rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-slate-400"
              onPress={onSkip}
            >
              Skip
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
