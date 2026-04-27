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
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <WalletIcon className="w-4 h-4 text-[#6366F1]" />
          <span className="text-xs text-white/40">Total Balance</span>
        </div>
        <p className="text-2xl font-light text-[#6366F1]">
          {showBalances ? formatCurrency(totalBalance) : '••••••'}
        </p>
      </div>
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-4 h-4 text-yellow-500" />
          <span className="text-xs text-white/40">Active Wallets</span>
        </div>
        <p className="text-2xl font-light text-yellow-500">{activeWalletsCount}</p>
      </div>
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-xs text-white/40">Total Transactions</span>
        </div>
        <p className="text-2xl font-light text-green-500">{totalTransactions}</p>
      </div>
    </div>
  );
};