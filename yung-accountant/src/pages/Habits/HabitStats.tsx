// pages/Habits/HabitStats.tsx
import React from 'react';
import { Target, CheckCircle, Flame, TrendingUp } from 'lucide-react';

interface HabitStatsProps {
  activeHabitsCount: number;
  completedToday: number;
  totalCurrentStreak: number;
  totalBestStreak: number;
}

export const HabitStats: React.FC<HabitStatsProps> = ({
  activeHabitsCount,
  completedToday,
  totalCurrentStreak,
  totalBestStreak,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-[var(--theme-primary)]" />
          <span className="text-xs text-[var(--theme-text-tertiary)]">Active Habits</span>
        </div>
        <p className="text-2xl font-light text-[var(--theme-primary)]">{activeHabitsCount}</p>
      </div>
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-xs text-[var(--theme-text-tertiary)]">Completed Today</span>
        </div>
        <p className="text-2xl font-light text-green-600">{completedToday}</p>
      </div>
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-xs text-[var(--theme-text-tertiary)]">Total Streak</span>
        </div>
        <p className="text-2xl font-light text-orange-500">{totalCurrentStreak}</p>
      </div>
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-yellow-500" />
          <span className="text-xs text-[var(--theme-text-tertiary)]">Best Streak</span>
        </div>
        <p className="text-2xl font-light text-yellow-500">{totalBestStreak}</p>
      </div>
    </div>
  );
};