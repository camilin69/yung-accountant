// components/modals/WalletDetailModal.tsx
import React, { useMemo } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowDown, ArrowUp, Calendar, X, Wallet as WalletIcon, Target, ArrowLeft } from 'lucide-react';
import { getWalletIcon } from '../../utils/iconHelpers';
import { useCategoryStore, useTransactionStore, useWalletStore } from '../../store';

interface WalletDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string | null;
}

const WalletDetailModal: React.FC<WalletDetailModalProps> = ({ isOpen, onClose, walletId }) => {
  const { wallets } = useWalletStore();
  const { categories } = useCategoryStore();
  const { transactions } = useTransactionStore();
  const wallet = wallets.find(w => w.id === walletId);
  
  const walletTransactions = transactions
    .filter(t => t.walletId === walletId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const allTransactions = useMemo(() => {
    return walletTransactions.map(t => {
      const category = categories.find(c => c.id === t.categoryId);
      const isGoalTx = t.tags?.includes('goal');
      const isDebtTx = t.tags?.includes('debt') || t.tags?.includes('debt-payment');
      
      return {
        id: t.id,
        amount: t.amount,
        date: t.date,
        description: t.description,
        categoryName: category?.name || (isGoalTx ? 'Goal Transaction' : 'Unknown'),
        categoryIcon: category?.icon || 'Target',
        categoryColor: category?.color || '#6366F1',
        type: category?.type || 'expense',
        isGoalTransaction: isGoalTx,
        isDebtTransaction: isDebtTx,
      };
    });
  }, [walletTransactions, categories]);


  const stats = useMemo(() => {
    const income = allTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = allTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, net: income - expenses };
  }, [allTransactions]);

  if (!isOpen || !wallet) return null;

  const getWalletIconComponent = () => {
    return getWalletIcon(wallet.type, "w-5 h-5", wallet.color);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-t-xl">
          <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)]">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
                <ArrowLeft className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
              </button>
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${wallet.color}20` }}
              >
                {getWalletIconComponent()}
              </div>
              <div>
                <h3 className="text-lg font-light text-[var(--theme-text-primary)]">{wallet.name}</h3>
                <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">
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
              className="hidden lg:block p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto modal-scroll">
          <div className="p-5 space-y-5">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--theme-background-glass)] rounded-lg p-3 text-center border border-[var(--theme-border-dark)]">
                <WalletIcon className="w-4 h-4 text-[var(--theme-primary)] mx-auto mb-1.5" />
                <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Current Balance</p>
                <p className="text-base font-light text-[var(--theme-primary)]">{formatCurrency(wallet.currentBalance)}</p>
              </div>
              <div className="bg-[var(--theme-background-glass)] rounded-lg p-3 text-center border border-[var(--theme-border-dark)]">
                <ArrowUp className="w-4 h-4 text-green-600 mx-auto mb-1.5" />
                <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Total Income</p>
                <p className="text-base font-light text-green-600">+{formatCurrency(stats.income)}</p>
              </div>
              <div className="bg-[var(--theme-background-glass)] rounded-lg p-3 text-center border border-[var(--theme-border-dark)]">
                <ArrowDown className="w-4 h-4 text-red-600 mx-auto mb-1.5" />
                <p className="text-[9px] text-[var(--theme-text-tertiary)] font-light">Total Expenses</p>
                <p className="text-base font-light text-red-600">-{formatCurrency(stats.expenses)}</p>
              </div>
            </div>

            {/* All Transactions Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-light text-[var(--theme-text-secondary)] flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Transaction History
                </h4>
                <span className="text-[10px] text-[var(--theme-text-tertiary)] font-light">
                  {allTransactions.length} transactions
                </span>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 modal-scroll">
                {allTransactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const isGoalTx = tx.isGoalTransaction;
                  
                  return (
                    <div 
                      key={tx.id} 
                      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isGoalTx 
                            ? 'bg-[var(--theme-primary)]/10' 
                            : isIncome ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          {isGoalTx ? (
                            <Target className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                          ) : isIncome ? (
                            <ArrowUp className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-light text-[var(--theme-text-primary)] truncate">
                              {tx.description || tx.categoryName}
                            </p>
                            {isGoalTx && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]/80">
                                Goal
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-[var(--theme-text-tertiary)] font-light">
                              {formatDate(tx.date, 'long')}
                            </span>
                            <span className="text-[6px] text-[var(--theme-text-tertiary)]/50">•</span>
                            <span className="text-[10px] text-[var(--theme-text-tertiary)] font-light truncate">
                              {tx.categoryName}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className={`text-sm font-light flex-shrink-0 ml-3 ${
                        isIncome ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  );
                })}
                
                {allTransactions.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="w-8 h-8 text-[var(--theme-text-tertiary)]/20 mx-auto mb-2" />
                    <p className="text-sm text-[var(--theme-text-tertiary)] font-light">No transactions yet</p>
                    <p className="text-[10px] text-[var(--theme-text-tertiary)]/50 font-light mt-1">Transactions will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-b-xl">
          <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)]">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all duration-300"
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