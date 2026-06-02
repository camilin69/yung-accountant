// components/common/CustomSelect.tsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  error?: string | null;
  disabled?: boolean;
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
  disabled = false,
  className = '',
  renderOption,
  renderValue,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  const handleOpen = () => {
    if (!disabled) {
      updateDropdownPosition();
      setIsOpen(true);
    }
  };

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      const handleUpdate = () => updateDropdownPosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isOpen]);

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

  const renderOptionItem = (option: SelectOption) => {
    if (renderOption) {
      return renderOption(option);
    }
    
    if (option.disabled) {
      return (
        <div 
          key={option.id} 
          className="px-4 py-2.5 text-xs font-medium cursor-default"
          style={{ 
            color: 'var(--theme-text-tertiary)', 
            opacity: 0.4,
            borderBottom: '1px solid var(--theme-border-dark)'
          }}
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
        onClick={() => handleSelect(option.id)}
        className={`w-full px-4 py-3 text-left text-sm font-medium transition-all duration-300 flex items-center gap-2 hover:bg-[var(--theme-background-glass-hover)] ${
          isSelected ? 'bg-[var(--theme-background-glass-hover)]' : ''
        }`}
        style={{ color: isSelected ? 'var(--theme-primary)' : 'var(--theme-text-secondary)' }}
      >
        {option.icon && (
          typeof option.icon === 'string' 
            ? <span className="text-base flex-shrink-0">{option.icon}</span>
            : <span className="flex-shrink-0">{option.icon}</span>
        )}
        <span className="truncate flex-1">{option.label}</span>
        {option.description && (
          <span className="text-[9px] truncate max-w-[100px]" style={{ color: 'var(--theme-text-tertiary)' }}>{option.description}</span>
        )}
        {isSelected && (
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--theme-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    );
  };

  return (
    <div ref={containerRef} className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className={`w-full px-4 py-2.5 rounded-2xl text-sm text-left flex items-center justify-between transition-all duration-500 ${
            disabled 
              ? 'opacity-30 cursor-not-allowed' 
              : 'hover:-translate-y-0.5'
          } glass-sm`}
          style={{ 
            color: selectedOption ? 'var(--theme-text-primary)' : 'var(--theme-text-tertiary)', 
            fontWeight: 400,
            border: error ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--theme-border-dark)'
          }}
        >
          {renderSelectedValue()}
          <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-500 ${isOpen && !disabled ? 'rotate-180' : ''}`} 
            style={{ color: 'var(--theme-text-tertiary)' }} />
        </button>

        {isOpen && !disabled && createPortal(
          <div 
            ref={dropdownRef}
            className="fixed z-[9999] rounded-2xl overflow-hidden glass-aero animate-dropdown-in"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              boxShadow: 'var(--shadow-glass-lg)'
            }}
          >
            <div className="overflow-y-auto modal-scroll" style={{ maxHeight: '280px' }}>
              {options.map(renderOptionItem)}
            </div>
          </div>,
          document.body
        )}
      </div>
      {error && <p className="text-[10px] font-medium mt-1" style={{ color: '#EF4444', opacity: 0.8 }}>{error}</p>}
    </div>
  );
};

export default CustomSelect;