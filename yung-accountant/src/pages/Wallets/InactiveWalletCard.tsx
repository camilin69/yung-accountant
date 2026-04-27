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
    <div className="bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-xl p-5 opacity-60 hover:opacity-80 transition-all duration-300">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center opacity-50"
            style={{ backgroundColor: `${wallet.color}20` }}
          >
            {getWalletIcon(wallet.type, wallet.color, "w-6 h-6")}
          </div>
          <div>
            <h3 className="text-base font-light text-white/60">{wallet.name}</h3>
            <p className="text-[10px] text-white/30">
              {wallet.type === 'cash' ? 'Cash' : 
               wallet.type === 'bank_account' ? 'Bank Account' :
               wallet.type === 'credit_card' ? 'Credit Card' :
               wallet.type === 'debit_card' ? 'Debit Card' : 'Other'}
            </p>
          </div>
        </div>
        <button 
          onClick={(e) => onDelete(wallet.id, e)} 
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div className="flex justify-between items-center pt-3 border-t border-white/5">
        <div>
          <span className="text-[10px] text-white/30">Balance</span>
          <p className="text-lg font-light text-white/40">
            {showBalances ? formatCurrency(wallet.currentBalance) : '••••••'}
          </p>
        </div>
      </div>
    </div>
  );
};