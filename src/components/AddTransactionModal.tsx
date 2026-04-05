'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { dataLayer } from '@/lib/db';
import { generateId, formatInputDate } from '@/lib/utils';
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
    if (!personName.trim() || !amount || Number(amount) <= 0) return;

    setLoading(true);
    try {
      // Find or create person
      let person = await dataLayer.getPersonByName(personName.trim());
      if (!person) {
        person = {
          id: generateId(),
          name: personName.trim(),
          createdAt: new Date(),
        };
        await dataLayer.addPerson(person);
      }

      // Create transaction
      await dataLayer.addTransaction({
        id: generateId(),
        personId: person.id,
        type,
        amount: Number(amount),
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
    <div className="modal-overlay" onClick={onClose} id="add-transaction-modal">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-header">
          <h2 className="modal-title">
            {type === 'lend' ? 'Lend Money' : 'Borrow Money'}
          </h2>
          <button className="modal-close" onClick={onClose} id="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type Toggle */}
          <div className="type-toggle">
            <button
              type="button"
              className={`type-toggle-btn lend ${type === 'lend' ? 'active' : ''}`}
              onClick={() => setType('lend')}
              id="toggle-lend"
            >
              I&apos;m Lending
            </button>
            <button
              type="button"
              className={`type-toggle-btn borrow ${type === 'borrow' ? 'active' : ''}`}
              onClick={() => setType('borrow')}
              id="toggle-borrow"
            >
              I&apos;m Borrowing
            </button>
          </div>

          {/* Person Name */}
          <div className="form-group">
            <label className="form-label">
              {type === 'lend' ? 'Lending To' : 'Borrowing From'}
            </label>
            <div className="autocomplete-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="form-input"
                placeholder="Enter person's name"
                value={personName}
                onChange={(e) => {
                  setPersonName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                required
                id="input-person-name"
              />
              {showSuggestions && filteredPersons.length > 0 && (
                <div className="autocomplete-list">
                  {filteredPersons.map((p) => (
                    <div
                      key={p.id}
                      className="autocomplete-item"
                      onClick={() => {
                        setPersonName(p.name);
                        setShowSuggestions(false);
                      }}
                    >
                      {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">Amount</label>
            <div className="form-input-with-icon">
              <span className="form-input-icon">₹</span>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                step="any"
                required
                id="input-amount"
              />
            </div>
          </div>

          {/* Date Row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                id="input-date"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date (optional)</label>
              <input
                type="date"
                className="form-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                id="input-due-date"
              />
            </div>
          </div>

          {/* Note */}
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="What's it for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              id="input-note"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={`btn ${type === 'lend' ? 'btn-lend' : 'btn-borrow'}`}
            disabled={loading}
            id="submit-transaction"
          >
            {loading
              ? 'Adding...'
              : type === 'lend'
              ? 'Record Lending'
              : 'Record Borrowing'}
          </button>
        </form>
      </div>
    </div>
  );
}
