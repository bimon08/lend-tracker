'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  label?: string;
  className?: string;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
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

  // Parse current value or default to today
  const today = new Date();
  const parsed = value
    ? { year: parseInt(value.slice(0, 4)), month: parseInt(value.slice(5, 7)) - 1, day: parseInt(value.slice(8, 10)) }
    : { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };

  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);

  // Reset view when opened
  useEffect(() => {
    if (isOpen) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick as EventListener);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick as EventListener);
    };
  }, [isOpen]);

  const navigateMonth = (delta: number) => {
    let newMonth = viewMonth + delta;
    let newYear = viewYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setViewMonth(newMonth);
    setViewYear(newYear);
  };

  const selectDate = (day: number) => {
    onChange(toDateStr(viewYear, viewMonth, day));
    setIsOpen(false);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

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
        <Calendar size={15} className="shrink-0 text-slate-400" />
        <span className="flex-1">{value ? formatDisplayDate(value) : placeholder}</span>
      </button>

      {/* Calendar dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-slate-800 shadow-2xl">
          {/* Month/Year header */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-slate-200">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-t border-white/5 px-2 pt-1.5">
            {DAYS.map((d) => (
              <div key={d} className="py-1 text-center text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5 px-2 pb-2.5">
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} />;
              }
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const isSelected = dateStr === value;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/30'
                      : isToday
                        ? 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20'
                        : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="flex border-t border-white/5 px-2 py-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                setIsOpen(false);
              }}
              className="flex-1 rounded-lg bg-slate-700/50 py-1.5 text-[0.65rem] font-semibold text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
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
                className="flex-1 rounded-lg bg-slate-700/50 py-1.5 text-[0.65rem] font-semibold text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
