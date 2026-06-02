// pages/Home/components/FeatureSection.tsx
import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  features: string[];
}

interface FeatureSectionProps {
  feature: Feature;
  index: number;
  isEven: boolean;
}

export const FeatureSection: React.FC<FeatureSectionProps> = ({ feature, index, isEven }) => {
  const Icon = feature.icon;

  return (
    <section id={feature.id} className="py-20 sm:py-28 lg:py-36 px-4 sm:px-6 lg:px-8 scroll-mt-24 sm:scroll-mt-28 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-16 sm:gap-20 lg:gap-28 items-center`}>
          {/* Content */}
          <div className="flex-1 space-y-7 sm:space-y-9">
            <div className="inline-flex items-center gap-3">
              <div 
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-[1.75rem] flex items-center justify-center transition-all duration-700 hover:scale-110 hover:rotate-12"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(40px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 8px 32px -8px rgba(0,0,0,0.3), 0 0 40px -10px var(--theme-primary)',
                }}
              >
                <Icon className="w-8 h-8 sm:w-9 sm:h-9" style={{ color: 'var(--theme-primary)' }} />
              </div>
              <span className="text-xs font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.3 }}>
                /{String(index + 1).padStart(2, '0')}
              </span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-[-0.03em] leading-tight" style={{ color: 'var(--theme-text-primary)' }}>
              {feature.title}
            </h2>
            
            <p className="text-base sm:text-lg lg:text-xl font-light leading-relaxed max-w-xl" style={{ color: 'var(--theme-text-tertiary)' }}>
              {feature.description}
            </p>
            
            <ul className="space-y-4 sm:space-y-5">
              {feature.features.map((item, idx) => (
                <li key={idx} className="flex items-center gap-4 group">
                  <div className="w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300 group-hover:scale-125" 
                    style={{ backgroundColor: 'var(--theme-primary)', opacity: 0.45, boxShadow: '0 0 12px 3px var(--theme-primary)' }} />
                  <span className="text-sm sm:text-base font-medium transition-all duration-300 group-hover:translate-x-1" style={{ color: 'var(--theme-text-secondary)' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Visual/Preview */}
          <div className="flex-1 w-full">
            <div className="relative">
              <div className="absolute -inset-6 rounded-[3rem] blur-3xl opacity-15" 
                style={{ background: 'var(--theme-gradient-primary)' }} />
              <div 
                className="relative rounded-[3rem] p-8 sm:p-10 lg:p-12"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  backdropFilter: 'blur(60px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 24px 64px -16px rgba(0,0,0,0.4)',
                }}
              >
                <div className="aspect-square sm:aspect-video rounded-[2rem] flex items-center justify-center"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                  <Icon className="w-24 h-24 sm:w-32 sm:h-32 lg:w-36 lg:h-36 transition-all duration-700 hover:scale-110 hover:rotate-6" 
                    style={{ color: 'var(--theme-primary)', opacity: 0.15 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};