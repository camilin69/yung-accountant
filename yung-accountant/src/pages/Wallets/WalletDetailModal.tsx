// pages/Wallets/WalletDetailModal.tsx
import React, { useMemo } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowDown, ArrowUp, Calendar, X, Wallet as WalletIcon, Target, ArrowLeft } from 'lucide-react';
import { getWalletIcon } from '../../utils/iconHelpers';
import { useCategoryStore, useTransactionStore, useWalletStore } from '../../store';
import { useTranslation } from '../../i18n';
import Tooltip from '../../components/common/Tooltip';

interface WalletDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string | null;
}

const WalletDetailModal: React.FC<WalletDetailModalProps> = ({ isOpen, onClose, walletId }) => {
  const { t } = useTranslation();
  const { wallets } = useWalletStore();
  const { categories } = useCategoryStore();
  const { transactions } = useTransactionStore();
  const wallet = wallets.find(w => w.id === walletId);

  const walletTransactions = transactions
    .filter(t => t.walletId === walletId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const allTransactions = useMemo(() => {
    return walletTransactions.map(tx => {
      const category = categories.find(c => c.id === tx.categoryId);
      const isGoalTx = tx.tags?.includes('goal');
      const isDebtTx = tx.tags?.includes('debt') || tx.tags?.includes('debt-payment');

      return {
        id: tx.id, amount: tx.amount, date: tx.date, description: tx.description,
        categoryName: category?.name || (isGoalTx ? t('goals.goal') + ' ' + t('transactions.title') : t('txnDetail.unknown')),
        categoryIcon: category?.icon || 'Target',
        categoryColor: category?.color || '#6366F1',
        type: category?.type || 'expense',
        isGoalTransaction: isGoalTx,
        isDebtTransaction: isDebtTx,
      };
    });
  }, [walletTransactions, categories, t]);

  const stats = useMemo(() => {
    const income = allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, net: income - expenses };
  }, [allTransactions]);

  if (!isOpen || !wallet) return null;

  const getWalletIconComponent = () => getWalletIcon(wallet.type, "w-5 h-5", wallet.color);

  const getWalletTypeLabel = () => {
    switch (wallet.type) {
      case 'cash': return t('wallets.cash');
      case 'bank_account': return t('wallets.bankAccount');
      case 'credit_card': return t('wallets.creditCard');
      case 'debit_card': return t('wallets.debitCard');
      default: return t('wallets.other');
    }
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl flex flex-col max-h-[85vh] rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
        <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
          <div className="flex items-center gap-3">
            <Tooltip content={t('common.close')} position="bottom">
              <button onClick={onClose} className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
                <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
              </button>
            </Tooltip>
            <div className="w-10 h-10 rounded-[1.1rem] flex items-center justify-center transition-all duration-500" style={{ backgroundColor: `${wallet.color}18` }}>
              {getWalletIconComponent()}
            </div>
            <div>
              <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{wallet.name}</h3>
              <p className="text-xs tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                {getWalletTypeLabel()}
                {wallet.lastFourDigits && ` • ****${wallet.lastFourDigits}`}
                {wallet.bankName && ` • ${wallet.bankName}`}
              </p>
            </div>
          </div>
          <Tooltip content={t('common.close')} position="bottom">
            <button onClick={onClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
              <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
          </Tooltip>
        </div>

        <div className="flex-1 overflow-y-auto modal-scroll p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: <WalletIcon className="w-4 h-4" style={{ color: 'var(--semantic-info)' }} strokeWidth={1.5} />, label: t('common.balance'), value: formatCurrency(wallet.currentBalance), color: 'var(--semantic-info)' },
              { icon: <ArrowUp className="w-4 h-4" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />, label: t('transactions.income'), value: `+${formatCurrency(stats.income)}`, color: 'var(--semantic-income)' },
              { icon: <ArrowDown className="w-4 h-4" style={{ color: 'var(--semantic-expense)' }} strokeWidth={1.5} />, label: t('dashboard.expenses'), value: `-${formatCurrency(stats.expenses)}`, color: 'var(--semantic-expense)' },
            ].map((s, i) => (
              <div key={i} className="rounded-[1.25rem] p-4 text-center transition-all duration-500 hover:-translate-y-1 glass-sm">
                <div className="w-8 h-8 rounded-[0.85rem] flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: `color-mix(in srgb, ${s.color} 8%, transparent)` }}>{s.icon}</div>
                <p className="text-[9px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>{s.label}</p>
                <p className="text-sm font-medium tracking-[0.01em] mt-1 text-adaptive-number-xs" style={{ color: 'var(--theme-text-primary)' }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium tracking-[0.02em] flex items-center gap-2" style={{ color: 'var(--theme-text-secondary)' }}>
                <Calendar className="w-4 h-4" /> {t('wallets.transactionHistory')}
              </h4>
              <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{t('wallets.xTransactions', { count: allTransactions.length })}</span>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto pr-1 modal-scroll">
              {allTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3 px-3 rounded-[1rem] transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)]">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-[0.85rem] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${tx.categoryColor}14` }}>
                      {tx.isGoalTransaction ? <Target className="w-3.5 h-3.5" style={{ color: tx.categoryColor }} /> : tx.type === 'income' ? <ArrowUp className="w-3.5 h-3.5" style={{ color: 'var(--semantic-income)' }} /> : <ArrowDown className="w-3.5 h-3.5" style={{ color: 'var(--semantic-expense)' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>{tx.description || tx.categoryName}</p>
                        {tx.isGoalTransaction && <span className="text-[8px] px-1.5 py-0.5 rounded-full font-medium glass-sm" style={{ color: 'var(--theme-primary)' }}>{t('goals.goal')}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px]" style={{ color: 'var(--theme-text-tertiary)' }}>{formatDate(tx.date, 'long')}</span>
                        <span className="text-[6px]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.3 }}>•</span>
                        <span className="text-[10px] truncate" style={{ color: 'var(--theme-text-tertiary)' }}>{tx.categoryName}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[13px] font-medium flex-shrink-0 ml-3" style={{ color: tx.type === 'income' ? 'var(--semantic-income)' : 'var(--semantic-expense)' }}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                </div>
              ))}
              {allTransactions.length === 0 && (
                <div className="text-center py-10">
                  <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.2 }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{t('transactions.noTransactions')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <div className="flex gap-3 p-5">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
              style={{ color: 'var(--theme-text-tertiary)' }}>{t('common.close')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletDetailModal;