'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@heroui/react';
import { dataLayer } from '@/lib/db';
import { generateId, formatInputDate, parseAmountInput } from '@/lib/utils';
import AmountInput from '@/components/AmountInput';
import type { Person } from '@/lib/db';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: 'lend' | 'borrow';
  defaultPersonName?: string;
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'lend',
  defaultPersonName = '',
}: AddTransactionModalProps) {
  const [type, setType] = useState<'lend' | 'borrow'>(defaultType);
  const [personName, setPersonName] = useState(defaultPersonName);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(formatInputDate(new Date()));
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [persons, setPersons] = useState<Person[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setPersonName(defaultPersonName);
      setAmount('');
      setDate(formatInputDate(new Date()));
      setDueDate('');
      setNote('');
      dataLayer.getPersons().then(setPersons);
    }
  }, [isOpen, defaultType, defaultPersonName]);

  const filteredPersons = persons.filter(
    (p) =>
      personName.length > 0 &&
      p.name.toLowerCase().includes(personName.toLowerCase()) &&
      p.name.toLowerCase() !== personName.toLowerCase()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() || !amount || parseAmountInput(amount) <= 0) return;

    setLoading(true);
    try {
      let person = await dataLayer.getPersonByName(personName.trim());
      if (!person) {
        person = {
          id: generateId(),
          name: personName.trim(),
          createdAt: new Date(),
        };
        await dataLayer.addPerson(person);
      }

      await dataLayer.addTransaction({
        id: generateId(),
        personId: person.id,
        type,
        amount: parseAmountInput(amount),
        date: new Date(date),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        note: note.trim() || undefined,
        status: 'pending',
        createdAt: new Date(),
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to add transaction:', error);
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
        <h3 className="mb-5 text-lg font-bold text-slate-100">
          {type === 'lend' ? 'Lend Money' : 'Borrow Money'}
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Type Toggle */}
          <div className="flex gap-2 rounded-xl bg-slate-800/60 p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                type === 'lend'
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              onClick={() => setType('lend')}
            >
              I&apos;m Lending
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                type === 'borrow'
                  ? 'bg-amber-500/20 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              onClick={() => setType('borrow')}
            >
              I&apos;m Borrowing
            </button>
          </div>

          {/* Person Name */}
          <div className="relative">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              {type === 'lend' ? 'Lending To' : 'Borrowing From'}
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter person's name"
              value={personName}
              onChange={(e) => { setPersonName(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              required
              className="w-full rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-violet-500/50"
              id="input-person-name"
            />
            {showSuggestions && filteredPersons.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-white/10 bg-slate-800">
                {filteredPersons.map((p) => (
                  <div
                    key={p.id}
                    className="cursor-pointer px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700"
                    onClick={() => { setPersonName(p.name); setShowSuggestions(false); }}
                  >
                    {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
              <AmountInput
                value={amount}
                onChange={setAmount}
                placeholder="0"
                required
                className="w-full rounded-xl border border-white/10 bg-slate-800/60 py-2.5 pl-8 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500/50"
                id="input-amount"
              />
            </div>
          </div>

          {/* Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Note (optional)</label>
            <input
              type="text"
              placeholder="What's it for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-500/50"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            isDisabled={loading}
            className={`w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] ${
              type === 'lend'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                : 'bg-gradient-to-r from-amber-600 to-amber-500'
            }`}
            id="submit-transaction"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving...
              </span>
            ) : (
              type === 'lend' ? 'Record Lending' : 'Record Borrowing'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
