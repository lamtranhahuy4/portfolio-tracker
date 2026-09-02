'use client';

import { useCallback, useEffect, useState } from 'react';

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
  const [localValue, setLocalValue] = useState<string>(formatNumber(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(formatNumber(value));
    }
  }, [value, isFocused]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.,]/g, '');
    setLocalValue(raw);
    
    // In vi-VN, '.' is thousands, ',' is decimal
    const noDots = raw.replace(/\./g, '');
    let jsFormat = noDots.replace(/,/g, '.');
    
    // Ensure at most one decimal point
    const parts = jsFormat.split('.');
    if (parts.length > 2) {
      jsFormat = parts[0] + '.' + parts.slice(1).join('');
    }
    
    onChange(jsFormat);
  }, [onChange]);

  const handleBlur = () => {
    setIsFocused(false);
    setLocalValue(formatNumber(value));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
    />
  );
}