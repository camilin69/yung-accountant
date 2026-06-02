// pages/Home/components/StatsSection.tsx
import React from 'react';
import { Users, Activity, Star, Cloud } from 'lucide-react';

const stats = [
  { value: '10K+', label: 'Active Users', icon: Users },
  { value: '$50M+', label: 'Transactions Tracked', icon: Activity },
  { value: '98%', label: 'User Satisfaction', icon: Star },
  { value: '24/7', label: 'Support Available', icon: Cloud }
];

export const StatsSection: React.FC = () => {
  return (
    <section className="py-20 sm:py-28 lg:py-36 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-[-0.03em] mb-4" style={{ color: 'var(--theme-text-primary)' }}>
            Trusted by Thousands
          </h2>
          <p className="text-base sm:text-lg font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
            Join a growing community of smart financial planners
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group text-center p-8 sm:p-10 rounded-[2.5rem] transition-all duration-700 ease-out hover:-translate-y-3 cursor-default"
              style={{
                background: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(60px)',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 16px 48px -12px rgba(0,0,0,0.3)',
              }}
            >
              <div 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-5 sm:mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  boxShadow: '0 8px 32px -8px var(--theme-primary)',
                }}
              >
                <stat.icon className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: 'var(--theme-primary)' }} />
              </div>
              <div className="text-4xl sm:text-5xl font-light tracking-[-0.03em] mb-2" style={{ color: 'var(--theme-text-primary)' }}>{stat.value}</div>
              <div className="text-sm sm:text-base font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};