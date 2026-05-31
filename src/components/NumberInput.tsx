'use client';

import { useCallback, useEffect, useRef } from 'react';

interface NumberInputProps {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
}

const fmt = new Intl.NumberFormat('vi-VN');

function formatNumber(raw: string): string {
  if (!raw) return '';
  const num = Number(raw);
  if (Number.isNaN(num)) return raw;
  return fmt.format(num);
}

/**
 * Normalize user input: keep digits and at most one decimal separator,
 * converting both `.` and `,` to `.`.
 */
function normalizeNumericInput(raw: string): string {
  const withDot = raw.replace(/,/g, '.');
  const parts = withDot.split('.');
  if (parts.length <= 2) return withDot;
  return parts[0] + '.' + parts.slice(1).join('');
}

export default function NumberInput({ value, onChange, placeholder, className }: NumberInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const allowed = e.target.value.replace(/[^0-9.,]/g, '');
    const normalized = normalizeNumericInput(allowed);
    const cursor = e.target.selectionStart ?? 0;

    const rawBeforeCursor = normalizeNumericInput(
      e.target.value.slice(0, cursor).replace(/[^0-9.,]/g, '')
    );
    cursorRef.current = formatNumber(rawBeforeCursor).length;

    onChange(normalized);
  }, [onChange]);

  useEffect(() => {
    if (ref.current && cursorRef.current !== null) {
      const pos = Math.min(cursorRef.current, ref.current.value.length);
      ref.current.setSelectionRange(pos, pos);
      cursorRef.current = null;
    }
  }, [value]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={formatNumber(value)}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}