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
    <div className="grid grid-cols-3 gap-3 mb-5">
      {/* Balance */}
      <div className={`rounded-[1.5rem] ${getCardPadding()} transition-all duration-500 hover:-translate-y-1 cursor-default glass-sm animate-fade-in-up`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`${isVerySmall ? 'w-7 h-7' : (isMobile ? 'w-8 h-8' : 'w-9 h-9')} rounded-[0.85rem] flex items-center justify-center glass-sm`}
            style={{ boxShadow: '0 4px 12px -4px rgba(59,130,246,0.15)' }}>
            <Wallet className={`${isVerySmall ? 'w-3.5 h-3.5' : (isMobile ? 'w-4 h-4' : 'w-4 h-4')}`} style={{ color: '#3B82F6' }} strokeWidth={1.5} />
          </div>
          <span className={`${isVerySmall ? 'text-[9px]' : 'text-[10px]'} font-medium tracking-[0.06em] uppercase`} style={{ color: 'var(--theme-text-tertiary)' }}>
            Balance
          </span>
        </div>
        <p className={`${isVerySmall ? 'text-base' : (isMobile ? 'text-lg' : 'text-xl')} font-light tracking-[-0.02em]`} style={{ color: 'var(--theme-text-primary)' }}>
          {formatCurrency(currentBalance)}
        </p>
      </div>

      {/* Income */}
      <div className={`rounded-[1.5rem] ${getCardPadding()} transition-all duration-500 hover:-translate-y-1 cursor-default glass-sm animate-fade-in-up`}
        style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`${isVerySmall ? 'w-7 h-7' : (isMobile ? 'w-8 h-8' : 'w-9 h-9')} rounded-[0.85rem] flex items-center justify-center glass-sm`}
            style={{ boxShadow: '0 4px 12px -4px rgba(16,185,129,0.15)' }}>
            <TrendingUp className={`${isVerySmall ? 'w-3.5 h-3.5' : (isMobile ? 'w-4 h-4' : 'w-4 h-4')}`} style={{ color: '#10B981' }} strokeWidth={1.5} />
          </div>
          <span className={`${isVerySmall ? 'text-[9px]' : 'text-[10px]'} font-medium tracking-[0.06em] uppercase`} style={{ color: 'var(--theme-text-tertiary)' }}>
            Income
          </span>
        </div>
        <p className={`${isVerySmall ? 'text-base' : (isMobile ? 'text-lg' : 'text-xl')} font-light tracking-[-0.02em]`} style={{ color: '#10B981' }}>
          +{formatCurrency(monthIncome)}
        </p>
      </div>

      {/* Expenses */}
      <div className={`rounded-[1.5rem] ${getCardPadding()} transition-all duration-500 hover:-translate-y-1 cursor-default glass-sm animate-fade-in-up`}
        style={{ animationDelay: '200ms' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`${isVerySmall ? 'w-7 h-7' : (isMobile ? 'w-8 h-8' : 'w-9 h-9')} rounded-[0.85rem] flex items-center justify-center glass-sm`}
            style={{ boxShadow: '0 4px 12px -4px rgba(239,68,68,0.15)' }}>
            <TrendingDown className={`${isVerySmall ? 'w-3.5 h-3.5' : (isMobile ? 'w-4 h-4' : 'w-4 h-4')}`} style={{ color: '#EF4444' }} strokeWidth={1.5} />
          </div>
          <span className={`${isVerySmall ? 'text-[9px]' : 'text-[10px]'} font-medium tracking-[0.06em] uppercase`} style={{ color: 'var(--theme-text-tertiary)' }}>
            Expenses
          </span>
        </div>
        <p className={`${isVerySmall ? 'text-base' : (isMobile ? 'text-lg' : 'text-xl')} font-light tracking-[-0.02em]`} style={{ color: '#EF4444' }}>
          -{formatCurrency(monthExpenses)}
        </p>
      </div>
    </div>
  );
};