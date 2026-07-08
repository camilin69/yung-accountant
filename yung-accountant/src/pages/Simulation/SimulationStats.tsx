// pages/Simulation/SimulationStats.tsx
import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { Carousel } from '../../components/common/Carousel';

interface SimulationStatsProps {
  stats: {
    netBalance: number; totalIncome: number; totalExpenses: number;
    dailyNet: number; monthlyNet: number; dailyIncome: number;
    dailyExpenses: number; monthlyIncome: number; monthlyExpenses: number;
  };
  getCardPadding: () => string;
  getCardTextSize: () => string;
  isVerySmall: boolean;
  isMobile: boolean;
}

export const SimulationStats: React.FC<SimulationStatsProps> = ({
  stats, getCardPadding, getCardTextSize, isVerySmall, isMobile,
}) => {
  const { t } = useTranslation();

  const statCards = [
    {
      icon: <Wallet className="w-5 h-5" style={{ color: 'var(--semantic-info)' }} strokeWidth={1.5} />,
      label: t('simulation.netResult'),
      value: `${stats.netBalance >= 0 ? '+' : '-'}${formatCurrency(Math.abs(stats.netBalance))}`,
      color: '#3B82F6',
      subLeft: t('simulation.dailyAvg', { amount: formatCurrency(stats.dailyNet) }),
      subRight: t('simulation.monthlyAvg', { amount: formatCurrency(stats.monthlyNet) }),
    },
    {
      icon: <TrendingUp className="w-5 h-5" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />,
      label: t('simulation.totalIncome'),
      value: `+${formatCurrency(stats.totalIncome)}`,
      color: '#10B981',
      subLeft: t('simulation.daily', { amount: formatCurrency(stats.dailyIncome) }),
      subRight: t('simulation.monthly', { amount: formatCurrency(stats.monthlyIncome) }),
    },
    {
      icon: <TrendingDown className="w-5 h-5" style={{ color: 'var(--semantic-expense)' }} strokeWidth={1.5} />,
      label: t('simulation.totalExpenses'),
      value: `-${formatCurrency(stats.totalExpenses)}`,
      color: '#EF4444',
      subLeft: t('simulation.daily', { amount: formatCurrency(stats.dailyExpenses) }),
      subRight: t('simulation.monthly', { amount: formatCurrency(stats.monthlyExpenses) }),
    },
  ];

  return (
    <>
      {isMobile ? (
        <Carousel className="mb-4">
          {statCards.map((card, i) => (
            <div key={i} className={`rounded-[1.75rem] ${getCardPadding()} transition-all duration-700 ease-out animate-fade-in-up hover:-translate-y-1 cursor-default glass-sm`}
              style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`${isVerySmall ? 'w-8 h-8' : 'w-10 h-10'} rounded-[1rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110`}
                  style={{ backgroundColor: `${card.color}14`, boxShadow: `0 4px 12px -4px ${card.color}15` }}>
                  {card.icon}
                </div>
                <span className={`${isVerySmall ? 'text-[10px]' : 'text-[11px]'} font-medium tracking-[0.08em] uppercase`} style={{ color: 'var(--theme-text-tertiary)' }}>
                  {card.label}
                </span>
              </div>
              <p className={`${getCardTextSize()} font-light tracking-[-0.02em]`} style={{ color: 'var(--theme-text-primary)' }}>
                {card.value}
              </p>
              <div className="mt-3 pt-3 flex justify-between text-[10px] font-medium" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
                <span style={{ color: 'var(--theme-text-tertiary)' }}>{card.subLeft}</span>
                <span style={{ color: 'var(--theme-text-tertiary)' }}>{card.subRight}</span>
              </div>
            </div>
          ))}
        </Carousel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {statCards.map((card, i) => (
            <div key={i} className={`rounded-[1.75rem] ${getCardPadding()} transition-all duration-700 ease-out animate-fade-in-up hover:-translate-y-1 cursor-default glass-sm`}
              style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`${isVerySmall ? 'w-8 h-8' : 'w-10 h-10'} rounded-[1rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110`}
                  style={{ backgroundColor: `${card.color}14`, boxShadow: `0 4px 12px -4px ${card.color}15` }}>
                  {card.icon}
                </div>
                <span className={`${isVerySmall ? 'text-[10px]' : 'text-[11px]'} font-medium tracking-[0.08em] uppercase`} style={{ color: 'var(--theme-text-tertiary)' }}>
                  {card.label}
                </span>
              </div>
              <p className={`${getCardTextSize()} font-light tracking-[-0.02em]`} style={{ color: 'var(--theme-text-primary)' }}>
                {card.value}
              </p>
              <div className="mt-3 pt-3 flex justify-between text-[10px] font-medium" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
                <span style={{ color: 'var(--theme-text-tertiary)' }}>{card.subLeft}</span>
                <span style={{ color: 'var(--theme-text-tertiary)' }}>{card.subRight}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};