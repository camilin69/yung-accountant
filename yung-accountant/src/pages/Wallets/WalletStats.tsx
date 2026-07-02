// pages/Wallets/WalletStats.tsx
import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Wallet as WalletIcon, CreditCard, TrendingUp } from 'lucide-react';

interface WalletStatsProps {
  totalBalance: number;
  activeWalletsCount: number;
  totalTransactions: number;
  showBalances: boolean;
}

export const WalletStats: React.FC<WalletStatsProps> = ({
  totalBalance,
  activeWalletsCount,
  totalTransactions,
  showBalances,
}) => {
  const stats = [
    {
      icon: <WalletIcon className="w-5 h-5" style={{ color: 'var(--semantic-info)' }} strokeWidth={1.5} />,
      label: 'Total Balance',
      value: showBalances ? formatCurrency(totalBalance) : '••••••',
      color: 'var(--semantic-info)',
    },
    {
      icon: <CreditCard className="w-5 h-5" style={{ color: 'var(--semantic-warning)' }} strokeWidth={1.5} />,
      label: 'Active Wallets',
      value: activeWalletsCount.toString(),
      color: 'var(--semantic-warning)',
    },
    {
      icon: <TrendingUp className="w-5 h-5" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />,
      label: 'Total Transactions',
      value: totalTransactions.toString(),
      color: 'var(--semantic-income)',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
      {stats.map((stat, i) => (
        <div 
          key={i}
          className="group rounded-[1.75rem] p-5 transition-all duration-700 ease-out animate-fade-in-up hover:-translate-y-1 cursor-default glass-sm"
          style={{ animationDelay: `${i * 150}ms` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-[1rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
              style={{ backgroundColor: `color-mix(in srgb, ${stat.color} 8%, transparent)`, boxShadow: `0 4px 12px -4px color-mix(in srgb, ${stat.color} 8%, transparent)` }}
            >
              {stat.icon}
            </div>
            <span className="text-[11px] font-medium tracking-[0.08em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>
              {stat.label}
            </span>
          </div>
          <p className="text-[24px] font-light tracking-[-0.02em] transition-all duration-500 group-hover:scale-105 origin-left" style={{ color: 'var(--theme-text-primary)' }}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
};