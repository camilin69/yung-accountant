// pages/Goals/GoalStats.tsx
import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Wallet, Target, Sparkles, TrendingUp } from 'lucide-react';

interface GoalStatsProps {
  totalBalance: number;
  allocatedToGoals: number;
  availableBalance: number;
  totalSaved: number;
  totalTarget: number;
  activeGoalsCount: number;
}

export const GoalStats: React.FC<GoalStatsProps> = ({
  totalBalance,
  allocatedToGoals,
  availableBalance,
  totalSaved,
  totalTarget,
  activeGoalsCount,
}) => {
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <>
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-[var(--theme-background-secondary)] to-[var(--theme-background-primary)] rounded-xl p-4 border border-[var(--theme-border-light)]">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-[var(--theme-primary)]" />
            <span className="text-xs text-[var(--theme-text-tertiary)]">Total Balance</span>
          </div>
          <p className="text-2xl font-light text-[var(--theme-primary)]">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="bg-gradient-to-br from-[var(--theme-background-secondary)] to-[var(--theme-background-primary)] rounded-xl p-4 border border-[var(--theme-border-light)]">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-yellow-600" />
            <span className="text-xs text-[var(--theme-text-tertiary)]">In Goals</span>
          </div>
          <p className="text-2xl font-light text-yellow-600">{formatCurrency(allocatedToGoals)}</p>
        </div>
        <div className="bg-gradient-to-br from-[var(--theme-background-secondary)] to-[var(--theme-background-primary)] rounded-xl p-4 border border-[var(--theme-border-light)]">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-green-600" />
            <span className="text-xs text-[var(--theme-text-tertiary)]">Available</span>
          </div>
          <p className="text-2xl font-light text-green-600">{formatCurrency(availableBalance)}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-[var(--theme-text-secondary)]" />
            <span className="text-xs text-[var(--theme-text-tertiary)]">Active Goals</span>
          </div>
          <p className="text-2xl font-light text-[var(--theme-text-primary)]">{activeGoalsCount}</p>
        </div>
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs text-[var(--theme-text-tertiary)]">Total Saved</span>
          </div>
          <p className="text-2xl font-light text-green-600">{formatCurrency(totalSaved)}</p>
        </div>
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-yellow-600" />
            <span className="text-xs text-[var(--theme-text-tertiary)]">Overall Progress</span>
          </div>
          <p className="text-2xl font-light text-yellow-600">{overallProgress}%</p>
        </div>
      </div>
    </>
  );
};