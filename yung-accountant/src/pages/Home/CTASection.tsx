// pages/Home/components/CTASection.tsx
import React from 'react';
import { Rocket, Sparkles } from 'lucide-react';

interface CTASectionProps {
  onGetStarted: () => void;
}

export const CTASection: React.FC<CTASectionProps> = ({ onGetStarted }) => {
  return (
    <section className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-4xl mx-auto">
        <div 
          className="relative overflow-hidden rounded-[3rem] p-10 sm:p-14 lg:p-20 text-center"
          style={{
            background: 'rgba(255,255,255,0.02)',
            backdropFilter: 'blur(80px)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 32px 80px -20px rgba(0,0,0,0.5), 0 0 120px -30px var(--theme-primary)',
          }}
        >
          {/* Decorative blurs */}
          <div className="absolute top-0 right-0 w-72 h-72 lg:w-96 lg:h-96 rounded-full blur-3xl pointer-events-none" 
            style={{ backgroundColor: 'var(--theme-primary)', opacity: 0.06 }} />
          <div className="absolute bottom-0 left-0 w-72 h-72 lg:w-96 lg:h-96 rounded-full blur-3xl pointer-events-none" 
            style={{ backgroundColor: 'var(--theme-accent)', opacity: 0.04 }} />
          
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-light tracking-[-0.03em] mb-4 sm:mb-6 relative" style={{ color: 'var(--theme-text-primary)' }}>
            Ready to Transform Your Finances?
          </h2>
          <p className="text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 lg:mb-12 max-w-lg mx-auto font-medium relative" 
            style={{ color: 'var(--theme-text-tertiary)' }}>
            Join thousands of users who trust Yung Accountant to manage their money across the galaxy.
          </p>
          <button
            onClick={onGetStarted}
            className="group inline-flex items-center gap-3 px-10 sm:px-12 py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-medium transition-all duration-500 hover:-translate-y-1.5 active:scale-95 relative"
            style={{ backgroundColor: 'var(--theme-primary)', color: '#FFFFFF', boxShadow: '0 12px 40px -10px var(--theme-primary), 0 0 80px -10px var(--theme-primary)' }}
          >
            <Rocket className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-500" strokeWidth={2} />
            <span>Get Started Now</span>
            <Sparkles className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
          </button>
        </div>
      </div>
    </section>
  );
};