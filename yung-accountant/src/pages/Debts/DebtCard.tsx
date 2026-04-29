// pages/Debts/DebtCard.tsx
import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Edit2, Trash2, TrendingUp, TrendingDown, CheckCircle, Wallet as WalletIcon, Building2, CreditCard, DollarSign, Package } from 'lucide-react';
import { useWalletStore } from '../../store';

interface DebtCardProps {
  debt: any;
  onEdit: (debt: any) => void;
  onDelete: (id: string, e?: React.MouseEvent) => void;
  onClick: (debt: any) => void;
  isCompleted?: boolean;
}

const getWalletIcon = (wallet: any) => {
  if (!wallet) return <WalletIcon className="w-4 h-4" />;
  const iconMap: Record<string, React.ReactNode> = {
    cash: <DollarSign className="w-4 h-4" />,
    bank_account: <Building2 className="w-4 h-4" />,
    credit_card: <CreditCard className="w-4 h-4" />,
    debit_card: <CreditCard className="w-4 h-4" />,
    other: <Package className="w-4 h-4" />,
  };
  return iconMap[wallet.type] || <WalletIcon className="w-4 h-4" />;
};

export const DebtCard: React.FC<DebtCardProps> = ({ debt, onEdit, onDelete, onClick, isCompleted }) => {
  const { wallets } = useWalletStore();
  const wallet = wallets.find(w => w.id === debt.walletId);
  
  const totalToPay = debt.realAmountToPay || debt.originalAmount;
  const totalPaymentsMade = debt.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
  const remainingToPay = totalToPay - totalPaymentsMade;
  const progress = (totalPaymentsMade / totalToPay) * 100;
  
  const isBorrowed = debt.type === 'borrowed';
  const remainingColor = isBorrowed ? 'text-red-600' : 'text-green-600';
  const progressBarColor = isBorrowed ? 'from-red-600 to-rose-700' : 'from-green-600 to-emerald-700';

  return (
    <div onClick={() => onClick(debt)} className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-5 transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)] hover:scale-[1.02] cursor-pointer group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBorrowed ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
            {isBorrowed ? <TrendingDown className="w-5 h-5 text-red-600" /> : <TrendingUp className="w-5 h-5 text-green-600" />}
          </div>
          <div>
            <h3 className="text-sm font-light text-[var(--theme-text-primary)]">{debt.creditorName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-[var(--theme-text-tertiary)] flex items-center gap-1">
                {wallet && getWalletIcon(wallet)}
                <span>{wallet?.name}</span>
              </span>
            </div>
          </div>
        </div>
        {!isCompleted && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onEdit(debt)} className="p-1.5 rounded-lg hover:bg-[var(--theme-background-glass-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => onDelete(debt.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--theme-text-tertiary)] hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-[var(--theme-text-tertiary)]">Remaining</span>
          <span className={remainingColor}>{formatCurrency(remainingToPay)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--theme-text-tertiary)]">Total to Pay</span>
          <span className="text-[var(--theme-text-secondary)]">{formatCurrency(totalToPay)}</span>
        </div>
        {debt.realAmountToPay && debt.originalAmount !== debt.realAmountToPay && (
          <div className="flex justify-between text-[9px]">
            <span className="text-[var(--theme-text-tertiary)]/50">Original Amount</span>
            <span className="text-[var(--theme-text-tertiary)]/50 line-through">{formatCurrency(debt.originalAmount)}</span>
          </div>
        )}
        <div className="pt-2">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-[var(--theme-text-tertiary)]">Progress</span>
            <span className="text-[var(--theme-text-tertiary)]">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-[var(--theme-border-dark)] rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${progressBarColor} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-2 pt-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[10px] text-green-600/80">Completed</span>
          </div>
        )}
      </div>
    </div>
  );
};