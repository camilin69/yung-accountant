// pages/Wallets/WalletCard.tsx
import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Edit2, Trash2 } from 'lucide-react';
import { getWalletIcon } from './constants';

interface WalletCardProps {
  wallet: any;
  transactionCount: number;
  showBalances: boolean;
  onWalletClick: (id: string) => void;
  onEdit: (wallet: any, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  transactionCount,
  showBalances,
  onWalletClick,
  onEdit,
  onDelete,
}) => {
  return (
    <div 
      onClick={() => onWalletClick(wallet.id)}
      className="group rounded-[2rem] p-6 transition-all duration-700 ease-out cursor-pointer animate-fade-in-up glass-md hover:-translate-y-2"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
            style={{ backgroundColor: `${wallet.color}18` }}
          >
            {getWalletIcon(wallet.type, wallet.color, "w-6 h-6")}
          </div>
          <div>
            <h3 className="text-[15px] font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{wallet.name}</h3>
            <p className="text-[11px] tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>
              {wallet.type === 'cash' ? 'Cash' : 
               wallet.type === 'bank_account' ? 'Bank Account' :
               wallet.type === 'credit_card' ? 'Credit Card' :
               wallet.type === 'debit_card' ? 'Debit Card' : 'Other'}
              {wallet.lastFourDigits && ` • ****${wallet.lastFourDigits}`}
            </p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={(e) => onEdit(wallet, e)} 
            className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm"
          >
            <Edit2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
          </button>
          <button 
            onClick={(e) => onDelete(wallet.id, e)} 
            className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm"
          >
            <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444', opacity: 0.7 }} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      
      <div className="flex justify-between items-center pt-4" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
        <div>
          <span className="text-[10px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>Balance</span>
          <p className="text-[22px] font-light tracking-[-0.02em] mt-1" style={{ color: 'var(--theme-text-primary)' }}>
            {showBalances ? formatCurrency(wallet.currentBalance) : '••••••'}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>Transactions</span>
          <p className="text-[18px] font-light tracking-[-0.02em] mt-1" style={{ color: 'var(--theme-text-secondary)' }}>{transactionCount}</p>
        </div>
      </div>
    </div>
  );
};