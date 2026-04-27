// pages/Habits/EmptyState.tsx

import React from 'react';
import { Plus, Target } from 'lucide-react';

interface EmptyStateProps {
  onCreateHabit: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateHabit }) => {
  return (
    <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
      <Target className="w-16 h-16 mx-auto mb-4 text-white/20" />
      <p className="text-white/40 text-sm font-light">No habits yet</p>
      <p className="text-white/30 text-xs mt-1">Start building better routines</p>
      <button
        onClick={onCreateHabit}
        className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light transition-all duration-300 inline-flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Create Your First Habit
      </button>
    </div>
  );
};