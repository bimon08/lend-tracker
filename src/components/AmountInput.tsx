  'use client';

import { useRef, useCallback } from 'react';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
}

// Format number string with Indian commas: 1,00,000
function formatWithCommas(numStr: string): string {
  if (!numStr) return '';
  const parts = numStr.split('.');
  const intPart = parts[0];
  // Indian number system: last 3 digits, then groups of 2
  const formatted = intPart.replace(/\B(?=(\d{2})+(\d)(?!\d))/g, ',');
  return parts.length > 1 ? `${formatted}.${parts[1]}` : formatted;
}

// Strip commas to get raw number
function stripCommas(str: string): string {
  return str.replace(/,/g, '');
}

export default function AmountInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
  id,
  required,
}: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = formatWithCommas(value);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const input = inputRef.current;
      if (!input) return;

      const pos = input.selectionStart ?? 0;
      const display = input.value;

      if (e.key === 'Backspace') {
        // If cursor is right after a comma, delete the digit before the comma
        if (pos > 0 && display[pos - 1] === ',') {
          e.preventDefault();
          // Remove the digit before the comma
          const raw = stripCommas(display);
          // Find which raw digit index the position before comma corresponds to
          let rawIdx = 0;
          for (let i = 0; i < pos - 1; i++) {
            if (display[i] !== ',') rawIdx++;
          }
          // Delete that digit
          const newRaw = raw.slice(0, Math.max(0, rawIdx - 1)) + raw.slice(rawIdx);
          onChange(newRaw);
          // Set cursor position after re-render
          requestAnimationFrame(() => {
            const newFormatted = formatWithCommas(newRaw);
            // Count how many display chars correspond to (rawIdx - 1) raw chars
            let newPos = 0;
            let count = 0;
            for (let i = 0; i < newFormatted.length && count < rawIdx - 1; i++) {
              newPos = i + 1;
              if (newFormatted[i] !== ',') count++;
            }
            input.setSelectionRange(newPos, newPos);
          });
          return;
        }
      }

      if (e.key === 'Delete') {
        // If cursor is right before a comma, delete the digit after the comma
        if (pos < display.length && display[pos] === ',') {
          e.preventDefault();
          const raw = stripCommas(display);
          let rawIdx = 0;
          for (let i = 0; i < pos; i++) {
            if (display[i] !== ',') rawIdx++;
          }
          const newRaw = raw.slice(0, rawIdx) + raw.slice(rawIdx + 1);
          onChange(newRaw);
          requestAnimationFrame(() => {
            const newFormatted = formatWithCommas(newRaw);
            let newPos = 0;
            let count = 0;
            for (let i = 0; i < newFormatted.length && count < rawIdx; i++) {
              newPos = i + 1;
              if (newFormatted[i] !== ',') count++;
            }
            input.setSelectionRange(newPos, newPos);
          });
          return;
        }
      }
    },
    [onChange]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = inputRef.current;
      const rawInput = e.target.value;
      // Strip commas and non-numeric (allow digits and one decimal)
      const cleaned = rawInput.replace(/,/g, '').replace(/[^0-9.]/g, '');
      // Prevent multiple decimals
      const parts = cleaned.split('.');
      const sanitized = parts.length > 2
        ? parts[0] + '.' + parts.slice(1).join('')
        : cleaned;

      // Remove leading zeros (except "0." for decimals)
      const noLeadingZeros = sanitized.replace(/^0+(?=\d)/, '');
      
      onChange(noLeadingZeros);

      // Restore cursor position
      if (input) {
        const cursorPos = input.selectionStart ?? 0;
        const oldCommasBefore = (rawInput.slice(0, cursorPos).match(/,/g) || []).length;
        requestAnimationFrame(() => {
          const newFormatted = formatWithCommas(noLeadingZeros);
          const newCommasBefore = (newFormatted.slice(0, cursorPos).match(/,/g) || []).length;
          const newPos = cursorPos + (newCommasBefore - oldCommasBefore);
          input.setSelectionRange(newPos, newPos);
        });
      }
    },
    [onChange]
  );

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={className}
      id={id}
      required={required}
      autoComplete="off"
    />
  );
}
