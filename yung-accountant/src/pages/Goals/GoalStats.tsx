// pages/Goals/GoalStats.tsx
import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Wallet, Target, Sparkles, TrendingUp } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { Carousel } from '../../components/common/Carousel';
import { useResponsive } from '../../hooks/useResponsive';

interface GoalStatsProps {
  totalBalance: number;
  allocatedToGoals: number;
  availableBalance: number;
  totalSaved: number;
  totalTarget: number;
  activeGoalsCount: number;
}

export const GoalStats: React.FC<GoalStatsProps> = ({
  totalBalance, allocatedToGoals, availableBalance,
  totalSaved, totalTarget, activeGoalsCount,
}) => {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const balanceCards = [
    { icon: <Wallet className="w-5 h-5" style={{ color: 'var(--semantic-info)' }} strokeWidth={1.5} />, label: t('wallets.totalBalance'), value: formatCurrency(totalBalance), color: '#3B82F6', delay: 0 },
    { icon: <Target className="w-5 h-5" style={{ color: 'var(--semantic-warning)' }} strokeWidth={1.5} />, label: t('goals.title'), value: formatCurrency(allocatedToGoals), color: '#F59E0B', delay: 100 },
    { icon: <Sparkles className="w-5 h-5" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />, label: t('goals.availableBalance'), value: formatCurrency(availableBalance), color: '#10B981', delay: 200 },
  ];

  const summaryCards = [
    { icon: <Target className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} strokeWidth={1.5} />, label: t('goals.title'), value: activeGoalsCount.toString(), color: 'var(--theme-text-primary)' },
    { icon: <TrendingUp className="w-4 h-4" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />, label: t('goals.saved'), value: formatCurrency(totalSaved), color: 'var(--semantic-income)' },
    { icon: <Sparkles className="w-4 h-4" style={{ color: 'var(--semantic-warning)' }} strokeWidth={1.5} />, label: t('goals.overallProgress'), value: `${overallProgress}%`, color: 'var(--semantic-warning)' },
  ];

  return (
    <>
      {/* Balance Cards */}
      {isMobile ? (
        <Carousel className="mb-10">
          {balanceCards.map((card, i) => (
            <div
              key={i}
              className="group rounded-[1.75rem] p-5 transition-all duration-700 ease-out animate-fade-in-up hover:-translate-y-1 cursor-default glass-sm"
              style={{ animationDelay: `${card.delay}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-[1rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
                  style={{ backgroundColor: `${card.color}14`, boxShadow: `0 4px 12px -4px ${card.color}15` }}
                >
                  {card.icon}
                </div>
                <span className="text-[11px] font-medium tracking-[0.08em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {card.label}
                </span>
              </div>
              <p className="text-[24px] font-light tracking-[-0.02em] transition-all duration-500 group-hover:scale-105 origin-left text-adaptive-number-sm" style={{ color: 'var(--theme-text-primary)' }}>
                {card.value}
              </p>
            </div>
          ))}
        </Carousel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {balanceCards.map((card, i) => (
            <div
              key={i}
              className="group rounded-[1.75rem] p-5 transition-all duration-700 ease-out animate-fade-in-up hover:-translate-y-1 cursor-default glass-sm"
              style={{ animationDelay: `${card.delay}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-[1rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
                  style={{ backgroundColor: `${card.color}14`, boxShadow: `0 4px 12px -4px ${card.color}15` }}
                >
                  {card.icon}
                </div>
                <span className="text-[11px] font-medium tracking-[0.08em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {card.label}
                </span>
              </div>
              <p className="text-[24px] font-light tracking-[-0.02em] transition-all duration-500 group-hover:scale-105 origin-left text-adaptive-number-sm" style={{ color: 'var(--theme-text-primary)' }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {isMobile ? (
        <Carousel className="mb-10">
          {summaryCards.map((card, i) => (
            <div
              key={i}
              className="group rounded-[1.75rem] p-4 transition-all duration-500 hover:-translate-y-1 cursor-default glass-sm animate-fade-in-up"
              style={{ animationDelay: `${300 + i * 100}ms` }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-[0.85rem] flex items-center justify-center glass-sm">
                  {card.icon}
                </div>
                <span className="text-[11px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {card.label}
                </span>
              </div>
              <p className="text-[20px] font-light tracking-[-0.02em] text-adaptive-number-sm" style={{ color: card.color }}>
                {card.value}
              </p>
            </div>
          ))}
        </Carousel>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {summaryCards.map((card, i) => (
            <div
              key={i}
              className="group rounded-[1.75rem] p-4 transition-all duration-500 hover:-translate-y-1 cursor-default glass-sm animate-fade-in-up"
              style={{ animationDelay: `${300 + i * 100}ms` }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-[0.85rem] flex items-center justify-center glass-sm">
                  {card.icon}
                </div>
                <span className="text-[11px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>
                  {card.label}
                </span>
              </div>
              <p className="text-[20px] font-light tracking-[-0.02em] text-adaptive-number-sm" style={{ color: card.color }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
};