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
  return fmt.format(Number(raw));
}

export default function NumberInput({ value, onChange, placeholder, className }: NumberInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const cursor = e.target.selectionStart ?? 0;

    const rawBeforeCursor = e.target.value.slice(0, cursor).replace(/[^0-9]/g, '');
    cursorRef.current = formatNumber(rawBeforeCursor).length;

    onChange(raw);
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
      inputMode="numeric"
      value={formatNumber(value)}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
