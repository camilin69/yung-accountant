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
      className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5 transition-all duration-300 hover:bg-white/[0.06] hover:scale-[1.02] cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${wallet.color}20` }}
          >
            {getWalletIcon(wallet.type, wallet.color, "w-6 h-6")}
          </div>
          <div>
            <h3 className="text-base font-light text-white">{wallet.name}</h3>
            <p className="text-[10px] text-white/40">
              {wallet.type === 'cash' ? 'Cash' : 
               wallet.type === 'bank_account' ? 'Bank Account' :
               wallet.type === 'credit_card' ? 'Credit Card' :
               wallet.type === 'debit_card' ? 'Debit Card' : 'Other'}
              {wallet.lastFourDigits && ` • ****${wallet.lastFourDigits}`}
            </p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={(e) => onEdit(wallet, e)} 
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={(e) => onDelete(wallet.id, e)} 
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <div className="flex justify-between items-center pt-3 border-t border-white/10">
        <div>
          <span className="text-[10px] text-white/40">Balance</span>
          <p className="text-lg font-light text-white">
            {showBalances ? formatCurrency(wallet.currentBalance) : '••••••'}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-white/40">Transactions</span>
          <p className="text-sm font-light text-white/60">{transactionCount}</p>
        </div>
      </div>
    </div>
  );
};