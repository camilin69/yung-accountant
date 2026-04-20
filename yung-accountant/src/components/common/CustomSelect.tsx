// components/common/CustomSelect.tsx

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  id: string;
  label: string;
  icon?: React.ReactNode | string;
  color?: string;
  disabled?: boolean;
  description?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  className?: string;
  renderOption?: (option: SelectOption) => React.ReactNode;
  renderValue?: (option: SelectOption | undefined) => React.ReactNode;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  label,
  required = false,
  error,
  className = '',
  renderOption,
  renderValue,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Renderizar el valor seleccionado
  const renderSelectedValue = () => {
    if (renderValue && selectedOption) {
      return renderValue(selectedOption);
    }
    return (
      <span className="flex items-center gap-2 truncate">
        {selectedOption?.icon && (
          typeof selectedOption.icon === 'string' 
            ? <span className="text-base flex-shrink-0">{selectedOption.icon}</span>
            : <span className="flex-shrink-0">{selectedOption.icon}</span>
        )}
        <span className="truncate">{selectedOption?.label || placeholder}</span>
      </span>
    );
  };

  // Renderizar cada opción del dropdown
  const renderOptionItem = (option: SelectOption) => {
    if (renderOption) {
      return renderOption(option);
    }
    
    if (option.disabled) {
      return (
        <div 
          key={option.id} 
          className="px-4 py-2 text-[10px] text-white/30 font-light border-b border-white/5 cursor-default"
        >
          {option.icon && (
            typeof option.icon === 'string' 
              ? <span className="mr-2">{option.icon}</span>
              : <span className="mr-2">{option.icon}</span>
          )}
          {option.label}
        </div>
      );
    }
    
    const isSelected = value === option.id;
    return (
      <button
        key={option.id}
        type="button"
        onClick={() => {
          onChange(option.id);
          setIsOpen(false);
        }}
        className={`
          w-full px-4 py-2.5 text-left text-sm font-light 
          hover:bg-white/10 transition-all duration-200 flex items-center gap-2
          ${isSelected ? 'bg-[#6366F1]/20 text-[#6366F1]' : 'text-white/80'}
        `}
      >
        {option.icon && (
          typeof option.icon === 'string' 
            ? <span className="text-base flex-shrink-0">{option.icon}</span>
            : <span className="flex-shrink-0">{option.icon}</span>
        )}
        <span className="truncate flex-1">{option.label}</span>
        {option.description && (
          <span className="text-[9px] text-white/30 truncate max-w-[100px]">{option.description}</span>
        )}
        {isSelected && (
          <svg className="w-4 h-4 flex-shrink-0 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    );
  };

  return (
    <div ref={containerRef} className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-xs text-white/40 mb-1.5 font-light">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light text-left flex items-center justify-between group hover:bg-white/10 transition-all duration-300 ${
            error ? 'border-red-500/50' : 'border-white/10'
          }`}
        >
          {renderSelectedValue()}
          <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-[#1A1A2E] backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden shadow-2xl">
            <div className="overflow-y-auto max-h-[280px]">
              {options.map(renderOptionItem)}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-[10px] text-red-500/80">{error}</p>}
    </div>
  );
};

export default CustomSelect;