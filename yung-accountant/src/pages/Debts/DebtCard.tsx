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
  const remainingColor = isBorrowed ? 'text-red-500' : 'text-green-500';
  const progressBarColor = isBorrowed ? 'from-red-500 to-rose-600' : 'from-green-500 to-emerald-600';

  return (
    <div onClick={() => onClick(debt)} className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5 transition-all duration-300 hover:bg-white/[0.06] hover:scale-[1.02] cursor-pointer group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBorrowed ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
            {isBorrowed ? <TrendingDown className="w-5 h-5 text-red-500" /> : <TrendingUp className="w-5 h-5 text-green-500" />}
          </div>
          <div>
            <h3 className="text-sm font-light text-white">{debt.creditorName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-white/40 flex items-center gap-1">
                {wallet && getWalletIcon(wallet)}
                <span>{wallet?.name}</span>
              </span>
            </div>
          </div>
        </div>
        {!isCompleted && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onEdit(debt)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => onDelete(debt.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-white/40">Remaining</span>
          <span className={remainingColor}>{formatCurrency(remainingToPay)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/40">Total to Pay</span>
          <span className="text-white/60">{formatCurrency(totalToPay)}</span>
        </div>
        {debt.realAmountToPay && debt.originalAmount !== debt.realAmountToPay && (
          <div className="flex justify-between text-[9px]">
            <span className="text-white/30">Original Amount</span>
            <span className="text-white/30 line-through">{formatCurrency(debt.originalAmount)}</span>
          </div>
        )}
        <div className="pt-2">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-white/40">Progress</span>
            <span className="text-white/40">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${progressBarColor} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-2 pt-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] text-green-500/80">Completed</span>
          </div>
        )}
      </div>
    </div>
  );
};