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
  error?: string;
  className?: string;
}

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
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const error = externalError || internalError;

  useEffect(() => {
    if (!isFocused) {
      if (value > 0) {
        setDisplayValue(formatInputNumber(value.toString()));
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    if (rawValue === '') {
      setDisplayValue('');
      onChange(0);
      setInternalError(null);
      return;
    }
    
    const formatted = formatInputNumber(rawValue);
    setDisplayValue(formatted);
    
    const numValue = parseDottedNumber(formatted);
    
    if (numValue > 0) {
      if (max !== undefined && numValue > max) {
        setInternalError(`Maximum allowed: ${formatCurrency(max)}`);
        onChange(max);
        setDisplayValue(formatInputNumber(max.toString()));
        setTimeout(() => setInternalError(null), 2000);
        return;
      }
      
      if (min !== undefined && numValue < min) {
        setInternalError(`Minimum allowed: ${formatCurrency(min)}`);
        onChange(min);
        setDisplayValue(formatInputNumber(min.toString()));
        setTimeout(() => setInternalError(null), 2000);
        return;
      }
    }
    
    setInternalError(null);
    onChange(numValue);
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs text-white/40 mb-1.5 font-light">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        step={step}
        className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20 ${
          error 
            ? 'border-red-500/50 focus:border-red-500/50' 
            : 'border-white/10'
        } ${className}`}
      />
      {error && (
        <p className="text-[10px] text-red-500/80 animate-pulse">{error}</p>
      )}
      {showPreview && value > 0 && !error && (
        <p className="text-[10px] text-white/30">
          {previewLabel}: {formatCurrency(value)}
        </p>
      )}
    </div>
  );
};

export default NumberInput;