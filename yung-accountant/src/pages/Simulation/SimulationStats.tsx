// pages/Simulation/SimulationStats.tsx

import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

interface SimulationStatsProps {
  stats: {
    netBalance: number;
    totalIncome: number;
    totalExpenses: number;
    dailyNet: number;
    monthlyNet: number;
    dailyIncome: number;
    dailyExpenses: number;
    monthlyIncome: number;
    monthlyExpenses: number;
  };
  getCardPadding: () => string;
  getCardTextSize: () => string;
  isVerySmall: boolean;
  isMobile: boolean;
}

export const SimulationStats: React.FC<SimulationStatsProps> = ({
  stats,
  getCardPadding,
  getCardTextSize,
  isVerySmall,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl border border-gray-800">
        <div className={getCardPadding()}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`${isVerySmall ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg bg-[#6366F1]/10 flex items-center justify-center`}>
                <Wallet className={`${isVerySmall ? 'w-3 h-3' : 'w-4 h-4'} text-[#6366F1]`} />
              </div>
              <span className={`${isVerySmall ? 'text-[10px]' : 'text-xs'} text-white/40`}>NET RESULT</span>
            </div>
          </div>
          <p className={`${getCardTextSize()} font-light ${stats.netBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {stats.netBalance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(stats.netBalance))}
          </p>
          <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-[10px]">
            <span className="text-white/30">Daily avg: {formatCurrency(stats.dailyNet)}</span>
            <span className="text-white/30">Monthly avg: {formatCurrency(stats.monthlyNet)}</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl border border-gray-800">
        <div className={getCardPadding()}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`${isVerySmall ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg bg-green-500/10 flex items-center justify-center`}>
                <TrendingUp className={`${isVerySmall ? 'w-3 h-3' : 'w-4 h-4'} text-green-500`} />
              </div>
              <span className={`${isVerySmall ? 'text-[10px]' : 'text-xs'} text-white/40`}>TOTAL INCOME</span>
            </div>
          </div>
          <p className={`${getCardTextSize()} font-light text-green-500`}>+{formatCurrency(stats.totalIncome)}</p>
          <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px]">
            <div><span className="text-white/30">Daily:</span> <span className="text-white/60 ml-1">{formatCurrency(stats.dailyIncome)}</span></div>
            <div><span className="text-white/30">Monthly:</span> <span className="text-white/60 ml-1">{formatCurrency(stats.monthlyIncome)}</span></div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl border border-gray-800">
        <div className={getCardPadding()}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`${isVerySmall ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg bg-red-500/10 flex items-center justify-center`}>
                <TrendingDown className={`${isVerySmall ? 'w-3 h-3' : 'w-4 h-4'} text-red-500`} />
              </div>
              <span className={`${isVerySmall ? 'text-[10px]' : 'text-xs'} text-white/40`}>TOTAL EXPENSES</span>
            </div>
          </div>
          <p className={`${getCardTextSize()} font-light text-red-500`}>-{formatCurrency(stats.totalExpenses)}</p>
          <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px]">
            <div><span className="text-white/30">Daily:</span> <span className="text-white/60 ml-1">{formatCurrency(stats.dailyExpenses)}</span></div>
            <div><span className="text-white/30">Monthly:</span> <span className="text-white/60 ml-1">{formatCurrency(stats.monthlyExpenses)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};