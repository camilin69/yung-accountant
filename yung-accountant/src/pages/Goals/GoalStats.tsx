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
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-[#6366F1]" />
            <span className="text-xs text-white/40">Total Balance</span>
          </div>
          <p className="text-2xl font-light text-[#6366F1]">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-white/40">In Goals</span>
          </div>
          <p className="text-2xl font-light text-yellow-500">{formatCurrency(allocatedToGoals)}</p>
        </div>
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-green-500" />
            <span className="text-xs text-white/40">Available</span>
          </div>
          <p className="text-2xl font-light text-green-500">{formatCurrency(availableBalance)}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-[#6366F1]/80" />
            <span className="text-xs text-white/40">Active Goals</span>
          </div>
          <p className="text-2xl font-light text-white">{activeGoalsCount}</p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500/80" />
            <span className="text-xs text-white/40">Total Saved</span>
          </div>
          <p className="text-2xl font-light text-green-500">{formatCurrency(totalSaved)}</p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-yellow-500/80" />
            <span className="text-xs text-white/40">Overall Progress</span>
          </div>
          <p className="text-2xl font-light text-yellow-500">{overallProgress}%</p>
        </div>
      </div>
    </>
  );
};