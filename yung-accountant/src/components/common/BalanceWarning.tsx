// components/common/BalanceWarning.tsx
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface BalanceWarningProps {
  amount: number;
  walletId: string;
  wallets: any[];
}

const BalanceWarning: React.FC<BalanceWarningProps> = ({ amount, walletId, wallets }) => {
  const wallet = wallets.find(w => w.id === walletId);
  if (!wallet || amount <= 0) return null;
  
  const isInsufficient = wallet.currentBalance < amount;
  
  if (!isInsufficient) return null;
  
  return (
    <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
      <AlertCircle className="w-4 h-4 text-red-500" />
      <p className="text-xs text-red-500/80">
        Insufficient balance! You have {formatCurrency(wallet.currentBalance)} available.
      </p>
    </div>
  );
};

export default BalanceWarning;