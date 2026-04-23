// components/modals/WalletDetailModal.tsx

import React, { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowDown, ArrowUp, Calendar, X, Wallet as WalletIcon, DollarSign, Building2, CreditCard, Package } from 'lucide-react';

interface WalletDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string | null;
}

// Mapeo de iconos para wallets
const getWalletIcon = (type: string) => {
  switch (type) {
    case 'cash':
      return <DollarSign className="w-5 h-5" />;
    case 'bank_account':
      return <Building2 className="w-5 h-5" />;
    case 'credit_card':
      return <CreditCard className="w-5 h-5" />;
    case 'debit_card':
      return <CreditCard className="w-5 h-5" />;
    default:
      return <Package className="w-5 h-5" />;
  }
};

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 bg-white/[0.03] backdrop-blur-xl rounded-t-xl">
          <div className="flex justify-between items-center p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${wallet.color}20` }}
              >
                {getWalletIcon(wallet.type)}
              </div>
              <div>
                <h3 className="text-lg font-light text-white">{wallet.name}</h3>
                <p className="text-xs text-white/40 mt-0.5 font-light">
                  {wallet.type === 'cash' ? 'Cash' : 
                   wallet.type === 'bank_account' ? 'Bank Account' :
                   wallet.type === 'credit_card' ? 'Credit Card' :
                   wallet.type === 'debit_card' ? 'Debit Card' : 'Other'}
                  {wallet.lastFourDigits && ` • ****${wallet.lastFourDigits}`}
                  {wallet.bankName && ` • ${wallet.bankName}`}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/5">
                <WalletIcon className="w-4 h-4 text-[#6366F1] mx-auto mb-1.5" />
                <p className="text-[9px] text-white/40 font-light">Current Balance</p>
                <p className="text-base font-light text-[#6366F1]">{formatCurrency(wallet.currentBalance)}</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/5">
                <ArrowUp className="w-4 h-4 text-green-500 mx-auto mb-1.5" />
                <p className="text-[9px] text-white/40 font-light">Total Income</p>
                <p className="text-base font-light text-green-500">+{formatCurrency(stats.income)}</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/5">
                <ArrowDown className="w-4 h-4 text-red-500 mx-auto mb-1.5" />
                <p className="text-[9px] text-white/40 font-light">Total Expenses</p>
                <p className="text-base font-light text-red-500">-{formatCurrency(stats.expenses)}</p>
              </div>
            </div>

            {/* Initial Balance */}
            <div className="bg-white/[0.02] rounded-lg p-3 border border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40 font-light">Initial Balance</span>
                <span className="text-sm font-light text-white/60">{formatCurrency(wallet.initialBalance)}</span>
              </div>
            </div>

            {/* Transactions Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-light text-white/60 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Transaction History
                </h4>
                <span className="text-[10px] text-white/30 font-light">
                  {walletTransactions.length} transactions
                </span>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {walletTransactions.map((tx) => {
                  const cat = categories.find(c => c.id === tx.categoryId);
                  const isIncome = cat?.type === 'income';
                  
                  return (
                    <div 
                      key={tx.id} 
                      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isIncome ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          {isIncome ? 
                            <ArrowUp className="w-3.5 h-3.5 text-green-500" /> : 
                            <ArrowDown className="w-3.5 h-3.5 text-red-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-light text-white/80 truncate">
                            {cat?.name || 'Unknown'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-white/30 font-light">
                              {formatDate(tx.date, 'long')}
                            </span>
                            {tx.description && (
                              <>
                                <span className="text-[6px] text-white/20">•</span>
                                <span className="text-[10px] text-white/30 font-light truncate">
                                  {tx.description}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className={`text-sm font-light flex-shrink-0 ml-3 ${
                        isIncome ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  );
                })}
                
                {walletTransactions.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <p className="text-sm text-white/40 font-light">No transactions yet</p>
                    <p className="text-[10px] text-white/20 font-light mt-1">Transactions will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="sticky bottom-0 bg-white/[0.03] backdrop-blur-xl rounded-b-xl">
          <div className="flex gap-3 p-5 border-t border-white/10">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletDetailModal;