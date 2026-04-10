'use client';

import { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { dataLayer } from '@/lib/db';
import { generateId } from '@/lib/utils';

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPersonModal({
  isOpen,
  onClose,
  onSuccess,
}: AddPersonModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const existing = await dataLayer.getPersonByName(name.trim());
      if (existing) {
        // Update phone if provided
        if (phone.trim()) {
          await dataLayer.updatePerson(existing.id, { phone: phone.trim() });
        }
      } else {
        await dataLayer.addPerson({
          id: generateId(),
          name: name.trim(),
          phone: phone.trim() || undefined,
          createdAt: new Date(),
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to add person:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="animate-in w-full max-w-lg rounded-t-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:mx-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-5 text-lg font-bold text-slate-100">Add Person</h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Name *</label>
            <input
              type="text"
              placeholder="Person's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500/50"
              id="input-person-name"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Phone Number</label>
            <input
              type="tel"
              placeholder="+91 XXXXX XXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500/50"
              id="input-person-phone"
            />
          </div>

          <Button
            type="submit"
            isDisabled={loading || !name.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-transform active:scale-[0.98]"
            id="submit-person"
          >
            {loading ? 'Saving...' : 'Add Person'}
          </Button>
        </form>
      </div>
    </div>
  );
}
