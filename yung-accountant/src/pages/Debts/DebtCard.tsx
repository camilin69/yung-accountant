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
  const remainingColor = isBorrowed ? '#EF4444' : '#10B981';
  const progressBarColor = isBorrowed 
    ? 'linear-gradient(90deg, #EF4444, #F87171)' 
    : 'linear-gradient(90deg, #10B981, #34D399)';

  return (
    <div 
      onClick={() => onClick(debt)} 
      className="group rounded-[2rem] p-6 transition-all duration-700 ease-out cursor-pointer animate-fade-in-up glass-md hover:-translate-y-2"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3.5">
          <div 
            className="w-11 h-11 rounded-[1.15rem] flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
            style={{ backgroundColor: isBorrowed ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)' }}
          >
            {isBorrowed ? <TrendingDown className="w-5 h-5" style={{ color: '#EF4444' }} /> : <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} />}
          </div>
          <div>
            <h3 className="text-[15px] font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{debt.creditorName}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] tracking-[0.03em] flex items-center gap-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                {wallet && getWalletIcon(wallet)}
                <span>{wallet?.name}</span>
              </span>
            </div>
          </div>
        </div>
        {!isCompleted && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onEdit(debt)} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <Edit2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
            </button>
            <button onClick={(e) => onDelete(debt.id, e)} className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444', opacity: 0.7 }} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        <div className="flex justify-between text-xs">
          <span className="font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>Remaining</span>
          <span className="font-medium" style={{ color: remainingColor }}>{formatCurrency(remainingToPay)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>Total to Pay</span>
          <span className="font-medium" style={{ color: 'var(--theme-text-secondary)' }}>{formatCurrency(totalToPay)}</span>
        </div>
        {debt.realAmountToPay && debt.originalAmount !== debt.realAmountToPay && (
          <div className="flex justify-between text-[9px]">
            <span style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>Original Amount</span>
            <span className="line-through" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>{formatCurrency(debt.originalAmount)}</span>
          </div>
        )}
        <div className="pt-2">
          <div className="flex justify-between text-[10px] font-medium mb-1.5">
            <span style={{ color: 'var(--theme-text-tertiary)' }}>Progress</span>
            <span style={{ color: 'var(--theme-text-tertiary)' }}>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--theme-background-glass-hover)' }}>
            <div 
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(progress, 100)}%`, background: progressBarColor, boxShadow: `0 0 12px -2px ${isBorrowed ? '#EF4444' : '#10B981'}` }}
            />
          </div>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-2 pt-2">
            <CheckCircle className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
            <span className="text-[10px] font-medium" style={{ color: '#10B981', opacity: 0.8 }}>Completed</span>
          </div>
        )}
      </div>
    </div>
  );
};