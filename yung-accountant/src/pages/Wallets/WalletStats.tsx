// pages/Wallets/WalletStats.tsx
import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Wallet as WalletIcon, CreditCard, TrendingUp } from 'lucide-react';
import { useThemeStyles } from '../../hooks/useTheme';

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
  const { getStatCardClass } = useThemeStyles();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className={getStatCardClass()}>
        <div className="flex items-center gap-2 mb-2">
          <WalletIcon className="w-4 h-4 text-[var(--theme-primary)]" />
          <span className="text-xs text-[var(--theme-text-tertiary)]">Total Balance</span>
        </div>
        <p className="text-2xl font-light text-[var(--theme-primary)]">
          {showBalances ? formatCurrency(totalBalance) : '••••••'}
        </p>
      </div>
      <div className={getStatCardClass()}>
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-4 h-4 text-yellow-600" />
          <span className="text-xs text-[var(--theme-text-tertiary)]">Active Wallets</span>
        </div>
        <p className="text-2xl font-light text-yellow-600">{activeWalletsCount}</p>
      </div>
      <div className={getStatCardClass()}>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="text-xs text-[var(--theme-text-tertiary)]">Total Transactions</span>
        </div>
        <p className="text-2xl font-light text-green-600">{totalTransactions}</p>
      </div>
    </div>
  );
};