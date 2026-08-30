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


export default function NumberInput({ value, onChange, placeholder, className }: NumberInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.,]/g, '');
    
    // In vi-VN, '.' is thousands, ',' is decimal
    // 1. Remove thousands separators
    const noDots = raw.replace(/\./g, '');
    // 2. Convert decimal separator to JS dot
    let jsFormat = noDots.replace(/,/g, '.');
    
    // Ensure at most one decimal point
    const parts = jsFormat.split('.');
    if (parts.length > 2) {
      jsFormat = parts[0] + '.' + parts.slice(1).join('');
    }
    
    const cursor = e.target.selectionStart ?? 0;
    const rawBeforeCursor = e.target.value.slice(0, cursor).replace(/[^0-9.,]/g, '');
    const beforeDots = rawBeforeCursor.replace(/\./g, '');
    let beforeJsFormat = beforeDots.replace(/,/g, '.');
    const bParts = beforeJsFormat.split('.');
    if (bParts.length > 2) {
      beforeJsFormat = bParts[0] + '.' + bParts.slice(1).join('');
    }
    cursorRef.current = formatNumber(beforeJsFormat).length;

    onChange(jsFormat);
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