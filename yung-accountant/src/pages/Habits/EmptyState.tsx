// pages/Habits/EmptyState.tsx
import React from 'react';
import { Plus, Target } from 'lucide-react';

interface EmptyStateProps {
  onCreateHabit: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateHabit }) => {
  return (
    <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-12 text-center">
      <Target className="w-16 h-16 mx-auto mb-4 text-[var(--theme-text-tertiary)]/20" />
      <p className="text-[var(--theme-text-tertiary)] text-sm font-light">No habits yet</p>
      <p className="text-[var(--theme-text-tertiary)]/70 text-xs mt-1">Start building better routines</p>
      <button
        onClick={onCreateHabit}
        className="mt-4 px-4 py-2 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light transition-all duration-300 inline-flex items-center gap-2 border border-[var(--theme-border-light)]"
      >
        <Plus className="w-4 h-4" />
        Create Your First Habit
      </button>
    </div>
  );
};