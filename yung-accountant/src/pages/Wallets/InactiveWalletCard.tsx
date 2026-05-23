// pages/Wallets/InactiveWalletCard.tsx
import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Trash2 } from 'lucide-react';
import { getWalletIcon } from './constants';

interface InactiveWalletCardProps {
  wallet: any;
  showBalances: boolean;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const InactiveWalletCard: React.FC<InactiveWalletCardProps> = ({
  wallet,
  showBalances,
  onDelete,
}) => {
  return (
    <div className="rounded-[2rem] p-6 transition-all duration-500 glass-sm opacity-50 hover:opacity-75">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center"
            style={{ backgroundColor: `${wallet.color}10` }}
          >
            {getWalletIcon(wallet.type, wallet.color, "w-6 h-6")}
          </div>
          <div>
            <h3 className="text-[15px] font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-tertiary)' }}>{wallet.name}</h3>
            <p className="text-[11px] tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>
              {wallet.type === 'cash' ? 'Cash' : 
               wallet.type === 'bank_account' ? 'Bank Account' :
               wallet.type === 'credit_card' ? 'Credit Card' :
               wallet.type === 'debit_card' ? 'Debit Card' : 'Other'}
            </p>
          </div>
        </div>
        <button 
          onClick={(e) => onDelete(wallet.id, e)} 
          className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm"
        >
          <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444', opacity: 0.5 }} strokeWidth={1.5} />
        </button>
      </div>
      
      <div className="flex justify-between items-center pt-4" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
        <div>
          <span className="text-[10px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>Balance</span>
          <p className="text-[22px] font-light tracking-[-0.02em] mt-1" style={{ color: 'var(--theme-text-tertiary)' }}>
            {showBalances ? formatCurrency(wallet.currentBalance) : '••••••'}
          </p>
        </div>
      </div>
    </div>
  );
};