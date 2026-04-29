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
      <div className={`bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl ${getCardPadding()}`}>
        <Wallet className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} text-[var(--theme-text-secondary)] mb-1`} />
        <p className={`${isVerySmall ? 'text-sm' : (isMobile ? 'text-base' : 'text-lg')} font-light text-[var(--theme-text-primary)]`}>{formatCurrency(currentBalance)}</p>
        <p className={`${isVerySmall ? 'text-[9px]' : 'text-[10px]'} text-[var(--theme-text-tertiary)] mt-0.5 font-light`}>Net Balance</p>
      </div>
      <div className={`bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl ${getCardPadding()}`}>
        <TrendingUp className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} text-green-700 mb-1`} />
        <p className={`${isVerySmall ? 'text-sm' : (isMobile ? 'text-base' : 'text-lg')} font-light text-green-700`}>+{formatCurrency(monthIncome)}</p>
        <p className={`${isVerySmall ? 'text-[9px]' : 'text-[10px]'} text-[var(--theme-text-tertiary)] mt-0.5 font-light`}>Income</p>
      </div>
      <div className={`bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl ${getCardPadding()}`}>
        <TrendingDown className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} text-red-700 mb-1`} />
        <p className={`${isVerySmall ? 'text-sm' : (isMobile ? 'text-base' : 'text-lg')} font-light text-red-700`}>-{formatCurrency(monthExpenses)}</p>
        <p className={`${isVerySmall ? 'text-[9px]' : 'text-[10px]'} text-[var(--theme-text-tertiary)] mt-0.5 font-light`}>Expenses</p>
      </div>
    </div>
  );
};