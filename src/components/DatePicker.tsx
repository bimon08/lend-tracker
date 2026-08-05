'use client';

import { useState, useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  const calendarValue = toCalendarDate(value);
  const todayDate = today(getLocalTimeZone());

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('touchstart', handleClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
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
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center gap-2 rounded-xl border border-white/10 bg-slate-800/60 px-4 py-2.5 text-left text-sm transition-colors focus:border-violet-500/50 ${
          value ? 'text-slate-100' : 'text-slate-500'
        }`}
      >
        <CalendarIcon size={15} className="shrink-0 text-slate-400" />
        <span className="flex-1">{value ? formatDisplayDate(value) : placeholder}</span>
      </button>

      {/* Calendar dropdown */}
      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full z-[100] mt-1.5 rounded-xl border border-white/10 bg-slate-900 shadow-2xl dp-calendar-wrap">
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
                  <Calendar.Cell date={date}>
                    <Calendar.CellIndicator />
                  </Calendar.Cell>
                )}
              </Calendar.GridBody>
            </Calendar.Grid>
          </Calendar>

          {/* Quick actions */}
          <div className="flex border-t border-white/5 px-3 py-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onChange(fromCalendarDate(todayDate));
                setIsOpen(false);
              }}
              className="flex-1 rounded-lg bg-slate-800/80 py-1.5 text-[0.65rem] font-semibold text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
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
                className="flex-1 rounded-lg bg-slate-800/80 py-1.5 text-[0.65rem] font-semibold text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
