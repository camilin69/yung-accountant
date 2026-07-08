// pages/Calendar/CalendarStats.tsx
import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { Carousel } from '../../components/common/Carousel';

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
  const { t } = useTranslation();

  const cardClass = (delay: string) =>
    `rounded-[1.5rem] ${getCardPadding()} transition-all duration-500 hover:-translate-y-1 cursor-default glass-sm animate-fade-in-up${delay ? ` ${delay}` : ''}`;

  const iconSize = isVerySmall ? 'w-7 h-7' : isMobile ? 'w-8 h-8' : 'w-9 h-9';
  const iconInnerSize = isVerySmall ? 'w-3.5 h-3.5' : isMobile ? 'w-4 h-4' : 'w-4 h-4';
  const labelSize = isVerySmall ? 'text-[9px]' : 'text-[10px]';
  const valueSize = isVerySmall ? 'text-base' : isMobile ? 'text-lg' : 'text-xl';

  return (
    <>
      {isMobile ? (
        <Carousel className="mb-5">
          {/* Balance */}
          <div className={cardClass('')}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`${iconSize} rounded-[0.85rem] flex items-center justify-center glass-sm`}
                style={{ boxShadow: '0 4px 12px -4px rgba(59,130,246,0.15)' }}>
                <Wallet className={iconInnerSize} style={{ color: 'var(--semantic-info)' }} strokeWidth={1.5} />
              </div>
              <span className={`${labelSize} font-medium tracking-[0.06em] uppercase`} style={{ color: 'var(--theme-text-tertiary)' }}>
                {t('calendar.balance')}
              </span>
            </div>
            <p className={`${valueSize} font-light tracking-[-0.02em] text-adaptive-number-sm`} style={{ color: 'var(--theme-text-primary)' }}>
              {formatCurrency(currentBalance)}
            </p>
          </div>

          {/* Income */}
          <div className={cardClass('')}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`${iconSize} rounded-[0.85rem] flex items-center justify-center glass-sm`}
                style={{ boxShadow: '0 4px 12px -4px rgba(16,185,129,0.15)' }}>
                <TrendingUp className={iconInnerSize} style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />
              </div>
              <span className={`${labelSize} font-medium tracking-[0.06em] uppercase`} style={{ color: 'var(--theme-text-tertiary)' }}>
                {t('calendar.monthIncome')}
              </span>
            </div>
            <p className={`${valueSize} font-light tracking-[-0.02em] text-adaptive-number-sm`} style={{ color: 'var(--semantic-income)' }}>
              +{formatCurrency(monthIncome)}
            </p>
          </div>

          {/* Expenses */}
          <div className={cardClass('')}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`${iconSize} rounded-[0.85rem] flex items-center justify-center glass-sm`}
                style={{ boxShadow: '0 4px 12px -4px rgba(239,68,68,0.15)' }}>
                <TrendingDown className={iconInnerSize} style={{ color: 'var(--semantic-expense)' }} strokeWidth={1.5} />
              </div>
              <span className={`${labelSize} font-medium tracking-[0.06em] uppercase`} style={{ color: 'var(--theme-text-tertiary)' }}>
                {t('calendar.monthExpenses')}
              </span>
            </div>
            <p className={`${valueSize} font-light tracking-[-0.02em] text-adaptive-number-sm`} style={{ color: 'var(--semantic-expense)' }}>
              -{formatCurrency(monthExpenses)}
            </p>
          </div>
        </Carousel>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {/* Balance */}
          <div className={cardClass('')}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`${iconSize} rounded-[0.85rem] flex items-center justify-center glass-sm`}
                style={{ boxShadow: '0 4px 12px -4px rgba(59,130,246,0.15)' }}>
                <Wallet className={iconInnerSize} style={{ color: 'var(--semantic-info)' }} strokeWidth={1.5} />
              </div>
              <span className={`${labelSize} font-medium tracking-[0.06em] uppercase`} style={{ color: 'var(--theme-text-tertiary)' }}>
                {t('calendar.balance')}
              </span>
            </div>
            <p className={`${valueSize} font-light tracking-[-0.02em] text-adaptive-number-sm`} style={{ color: 'var(--theme-text-primary)' }}>
              {formatCurrency(currentBalance)}
            </p>
          </div>

          {/* Income */}
          <div className={cardClass('')}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`${iconSize} rounded-[0.85rem] flex items-center justify-center glass-sm`}
                style={{ boxShadow: '0 4px 12px -4px rgba(16,185,129,0.15)' }}>
                <TrendingUp className={iconInnerSize} style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />
              </div>
              <span className={`${labelSize} font-medium tracking-[0.06em] uppercase`} style={{ color: 'var(--theme-text-tertiary)' }}>
                {t('calendar.monthIncome')}
              </span>
            </div>
            <p className={`${valueSize} font-light tracking-[-0.02em] text-adaptive-number-sm`} style={{ color: 'var(--semantic-income)' }}>
              +{formatCurrency(monthIncome)}
            </p>
          </div>

          {/* Expenses */}
          <div className={cardClass('')}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`${iconSize} rounded-[0.85rem] flex items-center justify-center glass-sm`}
                style={{ boxShadow: '0 4px 12px -4px rgba(239,68,68,0.15)' }}>
                <TrendingDown className={iconInnerSize} style={{ color: 'var(--semantic-expense)' }} strokeWidth={1.5} />
              </div>
              <span className={`${labelSize} font-medium tracking-[0.06em] uppercase`} style={{ color: 'var(--theme-text-tertiary)' }}>
                {t('calendar.monthExpenses')}
              </span>
            </div>
            <p className={`${valueSize} font-light tracking-[-0.02em] text-adaptive-number-sm`} style={{ color: 'var(--semantic-expense)' }}>
              -{formatCurrency(monthExpenses)}
            </p>
          </div>
        </div>
      )}
    </>
  );
};