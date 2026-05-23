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
    <div className="flex items-center gap-2.5 p-3 rounded-2xl glass-sm animate-pulse-subtle"
      style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} strokeWidth={1.5} />
      <p className="text-[12px] font-medium" style={{ color: '#EF4444', opacity: 0.85 }}>
        Insufficient balance! You have {formatCurrency(wallet.currentBalance)} available.
      </p>
    </div>
  );
};

export default BalanceWarning;