'use client';

import { useState } from 'react';
import { Calendar } from '@heroui/react';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  CalendarDate,
  today,
  getLocalTimeZone,
} from '@internationalized/date';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  label?: string;
}

function toCalendarDate(dateStr: string): CalendarDate | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new CalendarDate(y, m, d);
}

function fromCalendarDate(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  required,
  label,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const calendarValue = toCalendarDate(value);
  const todayDate = today(getLocalTimeZone());

  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      )}
      {/* Hidden native input for form validation */}
      {required && (
        <input
          type="text"
          value={value}
          required
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex w-full items-center gap-2 rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-left text-sm transition-colors focus:border-violet-500/50 ${
          value ? 'text-slate-100' : 'text-slate-500'
        }`}
      >
        <CalendarIcon size={15} className="shrink-0 text-slate-400" />
        <span className="flex-1">{value ? formatDisplayDate(value) : placeholder}</span>
      </button>

      {/* Full-screen modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="animate-in mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-white/5 px-5 py-4">
              <p className="text-sm font-semibold text-slate-200">{label || 'Select Date'}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {value ? formatDisplayDate(value) : 'No date selected'}
              </p>
            </div>

            {/* Calendar */}
            <div className="flex justify-center px-4 py-4 dp-calendar-wrap">
              <Calendar
                aria-label={label || 'Date picker'}
                value={calendarValue}
                defaultFocusedValue={calendarValue || todayDate}
                onChange={(date) => {
                  if (date) {
                    onChange(fromCalendarDate(date as CalendarDate));
                  }
                  setIsOpen(false);
                }}
              >
                <Calendar.Header>
                  <Calendar.NavButton slot="previous" />
                  <Calendar.Heading />
                  <Calendar.NavButton slot="next" />
                </Calendar.Header>
                <Calendar.Grid>
                  <Calendar.GridHeader>
                    {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                  </Calendar.GridHeader>
                  <Calendar.GridBody>
                    {(date) => (
                      <Calendar.Cell date={date} />
                    )}
                  </Calendar.GridBody>
                </Calendar.Grid>
              </Calendar>
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t border-white/5 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  onChange(fromCalendarDate(todayDate));
                  setIsOpen(false);
                }}
                className="flex-1 rounded-xl bg-violet-500/10 py-2.5 text-xs font-semibold text-violet-400 transition-colors hover:bg-violet-500/20"
              >
                Today
              </button>
              {value && !required && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  className="flex-1 rounded-xl bg-red-500/10 py-2.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/15"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-xl bg-slate-800/80 py-2.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
