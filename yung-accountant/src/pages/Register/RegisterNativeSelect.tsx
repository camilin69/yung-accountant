// pages/Register/RegisterNativeSelect.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Option {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface RegisterNativeSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  error?: string | null;
  required?: boolean;
}

export const RegisterNativeSelect: React.FC<RegisterNativeSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  error,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  // Actualizar posición del dropdown (usando coordenadas de viewport para fixed)
  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = Math.min(options.length * 52, 280);
      
      // Posición inicial: justo debajo del botón
      let top = rect.bottom + 4;
      
      // Verificar si el dropdown se sale de la pantalla hacia abajo
      if (top + dropdownHeight > window.innerHeight && rect.top - dropdownHeight > 0) {
        // Si se sale y hay espacio arriba, mostrarlo hacia arriba
        top = rect.top - dropdownHeight - 4;
      }
      
      setDropdownPosition({
        top: top,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, options.length]);

  // Actualizar posición en scroll/resize
  useEffect(() => {
    if (isOpen) {
      const handleUpdate = () => updatePosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isOpen]);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      // Actualizar posición antes de abrir
      setTimeout(updatePosition, 0);
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
        {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        className={`w-full px-4 py-3.5 rounded-2xl text-sm font-medium text-left flex items-center justify-between group transition-all duration-500 ${
          error ? 'ring-1 ring-red-500/30' : ''
        }`}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          color: selectedOption ? 'var(--theme-text-primary)' : 'var(--theme-text-tertiary)',
        }}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="flex-shrink-0" style={{ color: 'var(--theme-primary)' }}>
              {selectedOption.icon}
            </span>
          )}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-500 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }} />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[99999] rounded-2xl overflow-hidden animate-dropdown-in py-1"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            background: 'var(--theme-background-secondary)',
            backdropFilter: 'blur(80px) saturate(2)',
            WebkitBackdropFilter: 'blur(80px) saturate(2)',
            border: '1px solid var(--theme-border-dark)',
            boxShadow: 'var(--shadow-glass-lg)',
          }}
        >
          <div className="overflow-y-auto modal-scroll" style={{ maxHeight: '280px' }}>
            {options.map((option) => {
              const isSelected = value === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className="w-full px-4 py-3.5 text-left text-sm font-medium flex items-center gap-2 transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)]"
                  style={{ color: isSelected ? 'var(--theme-primary)' : 'var(--theme-text-secondary)' }}
                >
                  {option.icon && (
                    <span className="flex-shrink-0" style={{ color: 'var(--theme-primary)' }}>
                      {option.icon}
                    </span>
                  )}
                  <span className="truncate flex-1">{option.label}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--theme-primary)' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
      
      {error && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#EF4444' }} />
          <p className="text-[10px] font-medium" style={{ color: '#EF4444', opacity: 0.8 }}>{error}</p>
        </div>
      )}
    </div>
  );
};