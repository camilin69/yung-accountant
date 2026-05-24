// pages/Home/components/FooterSection.tsx
import React from 'react';
import { Logo } from '../../components/common/Logo';

export const FooterSection: React.FC = () => {
  return (
    <footer className="py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8 relative z-10" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
          <Logo size="sm" withText={true} />
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-8">
            <a href="#" className="text-[10px] sm:text-xs font-medium transition-colors duration-300 hover:opacity-80" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>Privacy Policy</a>
            <a href="#" className="text-[10px] sm:text-xs font-medium transition-colors duration-300 hover:opacity-80" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>Terms of Service</a>
            <a href="#" className="text-[10px] sm:text-xs font-medium transition-colors duration-300 hover:opacity-80" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>Contact</a>
            <a href="#" className="text-[10px] sm:text-xs font-medium transition-colors duration-300 hover:opacity-80" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>About</a>
          </div>
          
          <p className="text-[9px] sm:text-[10px] font-medium" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.35 }}>
            © 2024 Yung Accountant. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};