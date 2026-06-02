// components/common/NumberInput.tsx
import React, { useState, useEffect, useRef } from 'react';
import { formatInputNumber, parseDottedNumber, formatCurrency } from '../../utils/formatters';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  max?: number;
  min?: number;
  step?: number;
  disabled?: boolean;
  required?: boolean;
  showPreview?: boolean;
  previewLabel?: string;
  label?: string;
  error?: string | null;
  className?: string;
}

const MAX_AMOUNT = 100_000_000_000;

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  max,
  min = 0,
  step = 1,
  disabled = false,
  required = false,
  showPreview = false,
  previewLabel = 'Current',
  label,
  error: externalError,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [internalError, setInternalError] = useState<string | null>(null);
  const [, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const error = externalError || internalError;
  const effectiveMax = max ? Math.min(max, MAX_AMOUNT) : MAX_AMOUNT;

  useEffect(() => {
    if (value > 0) {
      setDisplayValue(formatInputNumber(value.toString()));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    if (rawValue === '') {
      setDisplayValue('');
      onChange(0);
      setInternalError(null);
      return;
    }
    
    const cleanNumber = rawValue.replace(/\./g, '');
    if (cleanNumber.length > 0) {
      const numericValue = parseInt(cleanNumber, 10);
      if (numericValue > effectiveMax) {
        setInternalError(`Maximum amount allowed: ${formatCurrency(effectiveMax)}`);
        onChange(effectiveMax);
        setDisplayValue(formatInputNumber(effectiveMax.toString()));
        setTimeout(() => setInternalError(null), 2000);
        return;
      }
    }
    
    const formatted = formatInputNumber(rawValue);
    setDisplayValue(formatted);
    
    const numValue = parseDottedNumber(formatted);
    
    if (numValue > 0) {
      if (numValue > effectiveMax) {
        setInternalError(`Maximum amount allowed: ${formatCurrency(effectiveMax)}`);
        onChange(effectiveMax);
        setDisplayValue(formatInputNumber(effectiveMax.toString()));
        setTimeout(() => setInternalError(null), 2000);
        return;
      }
    }
    
    setInternalError(null);
    onChange(numValue);
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    const numValue = parseDottedNumber(displayValue);
    
    if (numValue > 0 && min !== undefined && numValue < min) {
      setInternalError(`Minimum allowed: ${formatCurrency(min)}`);
      onChange(min);
      setDisplayValue(formatInputNumber(min.toString()));
      setTimeout(() => setInternalError(null), 2000);
    }
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        step={step}
        className={`w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm ${
          error ? 'ring-1 ring-red-500/30' : ''
        } ${className}`}
        style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
      />
      {error && (
        <p className="text-[10px] font-medium animate-pulse" style={{ color: '#EF4444', opacity: 0.8 }}>{error}</p>
      )}
      {showPreview && value > 0 && !error && (
        <p className="text-[10px]" style={{ color: 'var(--theme-text-tertiary)' }}>
          {previewLabel}: {formatCurrency(value)}
        </p>
      )}
      {!error && (
        <p className="text-[8px]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.35 }}>
          Max: {formatCurrency(effectiveMax)}
        </p>
      )}
    </div>
  );
};

export default NumberInput;