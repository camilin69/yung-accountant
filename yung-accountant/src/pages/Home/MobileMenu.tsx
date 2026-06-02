// pages/Home/components/MobileMenu.tsx
import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface MobileMenuProps {
  sections: Array<{ id: string; title: string }>;
  onNavigate: (id: string) => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ sections, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm"
      >
        {isOpen ? (
          <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
        ) : (
          <Menu className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 modal-overlay" onClick={() => setIsOpen(false)} />
          <div 
            className="absolute top-16 left-0 right-0 z-50 glass-aero rounded-b-[2rem] py-4 animate-fade-in-down"
            style={{ borderBottom: '1px solid var(--theme-border-dark)' }}
          >
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => {
                  setIsOpen(false);
                  onNavigate(section.id);
                }}
                className="block px-6 py-3.5 text-sm font-medium transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)] hover:translate-x-1"
                style={{ color: 'var(--theme-text-secondary)' }}
              >
                {section.title}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
};