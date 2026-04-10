'use client';

import { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { Check, Lock } from 'lucide-react';
import { dataLayer } from '@/lib/db';
import type { Person } from '@/lib/db';
import { getInitials, getAvatarColor } from '@/lib/utils';

interface ChooseActivePeopleModalProps {
  isOpen: boolean;
  onDone: () => void;
}

export default function ChooseActivePeopleModal({
  isOpen,
  onDone,
}: ChooseActivePeopleModalProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        dataLayer.getPersons(),
        dataLayer.getActivePeople(),
      ]).then(([persons, activeIds]) => {
        setPeople(persons);
        setSelected(new Set(activeIds));
        setLoading(false);
      });
    }
  }, [isOpen]);

  const togglePerson = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else if (next.size < 5) {
      next.add(id);
    }
    setSelected(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dataLayer.setActivePeople(Array.from(selected));
      onDone();
    } catch (e) {
      console.error('Failed to save active people:', e);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="animate-in mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="border-b border-white/5 p-5">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600">
            <Lock size={18} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Choose Your 5 People</h3>
          <p className="mt-1 text-sm text-slate-400">
            On the Free plan, you can only edit 5 people. Choose wisely — this cannot be changed later.
          </p>
        </div>

        {/* People List */}
        <div className="max-h-[50dvh] overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-violet-500" />
            </div>
          ) : people.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No people found</p>
          ) : (
            <div className="space-y-2">
              {people.map((person) => {
                const isSelected = selected.has(person.id);
                const isDisabled = !isSelected && selected.size >= 5;
                return (
                  <div
                    key={person.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-all ${
                      isSelected
                        ? 'border border-violet-500/30 bg-violet-500/10'
                        : isDisabled
                          ? 'opacity-40'
                          : 'border border-white/5 bg-slate-800/40 hover:bg-slate-800/60'
                    }`}
                    onClick={() => !isDisabled && togglePerson(person.id)}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                      style={{ background: getAvatarColor(person.name) }}
                    >
                      {getInitials(person.name)}
                    </div>
                    <p className="flex-1 text-sm font-semibold">{person.name}</p>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
                        isSelected
                          ? 'border-violet-500 bg-violet-500'
                          : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <Check size={14} className="text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-slate-400">Selected</span>
            <span className={`font-bold ${selected.size === 5 ? 'text-violet-400' : 'text-slate-300'}`}>
              {selected.size} / 5
            </span>
          </div>
          <Button
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-2.5 font-semibold text-white shadow-lg shadow-violet-500/25"
            isDisabled={saving || selected.size === 0}
            onPress={handleSave}
          >
            {saving ? 'Saving...' : `Confirm ${selected.size} People`}
          </Button>
        </div>
      </div>
    </div>
  );
}
