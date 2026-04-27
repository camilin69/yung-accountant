// pages/Calendar/CalendarStats.tsx

import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

interface CalendarStatsProps {
  currentBalance: number;
  monthIncome: number;
  monthExpenses: number;
  getCardPadding: () => string;
  isVerySmall: boolean;
  isMobile: boolean;
}

export const CalendarStats: React.FC<CalendarStatsProps> = ({
  currentBalance,
  monthIncome,
  monthExpenses,
  getCardPadding,
  isVerySmall,
  isMobile,
}) => {
  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl ${getCardPadding()}`}>
        <Wallet className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} text-white/60 mb-1`} />
        <p className={`${isVerySmall ? 'text-sm' : (isMobile ? 'text-base' : 'text-lg')} font-light text-white`}>{formatCurrency(currentBalance)}</p>
        <p className={`${isVerySmall ? 'text-[9px]' : 'text-[10px]'} text-white/40 mt-0.5 font-light`}>Net Balance</p>
      </div>
      <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl ${getCardPadding()}`}>
        <TrendingUp className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} text-green-500/80 mb-1`} />
        <p className={`${isVerySmall ? 'text-sm' : (isMobile ? 'text-base' : 'text-lg')} font-light text-green-500`}>+{formatCurrency(monthIncome)}</p>
        <p className={`${isVerySmall ? 'text-[9px]' : 'text-[10px]'} text-white/40 mt-0.5 font-light`}>Income</p>
      </div>
      <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl ${getCardPadding()}`}>
        <TrendingDown className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} text-red-500/80 mb-1`} />
        <p className={`${isVerySmall ? 'text-sm' : (isMobile ? 'text-base' : 'text-lg')} font-light text-red-500`}>-{formatCurrency(monthExpenses)}</p>
        <p className={`${isVerySmall ? 'text-[9px]' : 'text-[10px]'} text-white/40 mt-0.5 font-light`}>Expenses</p>
      </div>
    </div>
  );
};