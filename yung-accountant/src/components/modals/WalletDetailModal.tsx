// components/modals/WalletDetailModal.tsx

import React, { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowDown, ArrowUp, Calendar, X } from 'lucide-react';
;

interface WalletDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string | null;
}

const WalletDetailModal: React.FC<WalletDetailModalProps> = ({ isOpen, onClose, walletId }) => {
  const { wallets, transactions, categories } = useStore();
  const wallet = wallets.find(w => w.id === walletId);
  const walletTransactions = transactions.filter(t => t.walletId === walletId).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const stats = useMemo(() => {
    const income = walletTransactions
      .filter(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        return cat?.type === 'income';
      })
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = walletTransactions
      .filter(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        return cat?.type === 'expense';
      })
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, net: income - expenses };
  }, [walletTransactions, categories]);

  if (!isOpen || !wallet) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${wallet.color}20` }}>
              {wallet.icon}
            </div>
            <div>
              <h3 className="text-lg font-light text-white">{wallet.name}</h3>
              <p className="text-xs text-white/40 mt-0.5">
                {wallet.type === 'cash' ? 'Cash' : 
                 wallet.type === 'bank_account' ? 'Bank Account' :
                 wallet.type === 'credit_card' ? 'Credit Card' :
                 wallet.type === 'debit_card' ? 'Debit Card' : 'Other'}
                {wallet.lastFourDigits && ` • ****${wallet.lastFourDigits}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Balance */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.02] rounded-lg p-3 text-center">
              <p className="text-[9px] text-white/40">Current Balance</p>
              <p className="text-lg font-light text-[#6366F1]">{formatCurrency(wallet.currentBalance)}</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-3 text-center">
              <p className="text-[9px] text-white/40">Total Income</p>
              <p className="text-lg font-light text-green-500">+{formatCurrency(stats.income)}</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-3 text-center">
              <p className="text-[9px] text-white/40">Total Expenses</p>
              <p className="text-lg font-light text-red-500">-{formatCurrency(stats.expenses)}</p>
            </div>
          </div>

          {/* Initial Balance */}
          <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Initial Balance</span>
              <span className="text-white/60">{formatCurrency(wallet.initialBalance)}</span>
            </div>
          </div>

          {/* Transactions List */}
          <div>
            <h4 className="text-sm font-light text-white/60 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Transaction History
              <span className="text-[10px] text-white/30">({walletTransactions.length} transactions)</span>
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {walletTransactions.map(tx => {
                const cat = categories.find(c => c.id === tx.categoryId);
                return (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat?.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {cat?.type === 'income' ? <ArrowUp className="w-3.5 h-3.5 text-green-500" /> : <ArrowDown className="w-3.5 h-3.5 text-red-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-light text-white/80">{cat?.name || 'Unknown'}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-white/30">{formatDate(tx.date, 'long')}</p>
                          {tx.description && <span className="text-[8px] text-white/20">•</span>}
                          <p className="text-[10px] text-white/30">{tx.description}</p>
                        </div>
                      </div>
                    </div>
                    <p className={`text-sm font-light ${cat?.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                      {cat?.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                );
              })}
              {walletTransactions.length === 0 && (
                <div className="text-center py-6 text-white/40 text-sm font-light">
                  No transactions for this wallet
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/10">
          <button onClick={onClose} className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletDetailModal;