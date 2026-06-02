// pages/Habits/EmptyState.tsx
import React from 'react';
import { Plus, Target } from 'lucide-react';

interface EmptyStateProps {
  onCreateHabit: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateHabit }) => {
  return (
    <div className="rounded-[2.5rem] p-16 text-center glass-aero animate-fade-in-up">
      <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 glass-sm">
        <Target className="w-10 h-10" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.25 }} strokeWidth={1} />
      </div>
      <p className="text-[18px] font-light tracking-[-0.02em] mb-2" style={{ color: 'var(--theme-text-primary)' }}>No habits yet</p>
      <p className="text-[14px] tracking-[0.03em] mb-7" style={{ color: 'var(--theme-text-tertiary)' }}>
        Start building better routines
      </p>
      <button
        onClick={onCreateHabit}
        className="px-7 py-3.5 rounded-2xl text-[13px] font-medium tracking-[0.04em] uppercase inline-flex items-center gap-2.5 transition-all duration-500 hover:-translate-y-1 active:scale-95"
        style={{ 
          backgroundColor: 'var(--theme-primary)', 
          color: '#FFFFFF',
          boxShadow: '0 4px 24px -6px var(--theme-primary)'
        }}
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        Create Your First Habit
      </button>
    </div>
  );
};