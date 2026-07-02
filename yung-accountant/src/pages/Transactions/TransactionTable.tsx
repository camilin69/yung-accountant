// pages/Transactions/TransactionTable.tsx
import React, { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Calendar as CalendarIcon, Edit2, Trash2, ChevronLeft, ChevronRight, Search, Target} from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';
import ConfirmModal from '../../components/common/ConfirmModal';
import Tooltip from '../../components/common/Tooltip';
import { useNavigate } from 'react-router-dom';
import { useDebtStore, useGoalStore } from '../../store';
import { useTranslation } from '../../i18n';

interface TransactionTableProps {
  paginatedTransactions: any[];
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  onViewDetails: (transaction: any) => void;
  onEdit: (transaction: any, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  getCategoryById: (id: string) => any;
  getWalletById: (id: string) => any;
  filteredTransactionsLength: number;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  paginatedTransactions, totalPages, currentPage, setCurrentPage,
  onViewDetails, onEdit, onDelete, getCategoryById, getWalletById,
  filteredTransactionsLength
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningTitle, setWarningTitle] = useState('');
  const [warningAction, setWarningAction] = useState<'debts' | 'goals'>('debts');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { debts } = useDebtStore();
  const { goals } = useGoalStore();
  
  if (paginatedTransactions.length === 0) {
    return (
      <div className="rounded-[2rem] overflow-hidden glass-md">
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-[1.5rem] flex items-center justify-center glass-sm">
            <Search className="w-8 h-8" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.25 }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{t('transactions.noTransactions')}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>{t('common.filter')}</p>
        </div>
      </div>
    );
  }

  const handleRowClick = (tx: any) => {
    const isDebtTransaction = tx.tags && (tx.tags.includes('debt') || tx.tags.includes('debt-payment'));
    const isGoalTransaction = tx.tags && tx.tags.includes('goal');

    if (isDebtTransaction) {
      const debtId = tx.tags?.find((tag: string) =>
        tag && tag.length > 0 && tag !== 'debt' && tag !== 'debt-payment' && tag !== 'borrowed' && tag !== 'lent' && !tag.includes('transaction')
      );
      const debt = debts.find(d => d.id === debtId);
      const debtTypeText = debt?.type === 'borrowed' ? t('transactions.debtOwe') : t('transactions.debtOwed');
      setWarningTitle(t('debts.title'));
      setWarningMessage(t('transactions.associatedDebtMsg', { type: debtTypeText, name: debt?.creditorName || t('txnDetail.unknown') }) + '\n\n' + t('debts.cannotEditDebtTransactions'));
      setWarningAction('debts');
      setShowWarning(true);
    } else if (isGoalTransaction) {
      const goalId = tx.tags?.find((tag: string) => tag && tag !== 'goal' && tag !== 'purchase');
      const goal = goals.find(g => g.id === goalId);
      setWarningTitle(t('goals.title'));
      setWarningMessage(t('transactions.associatedGoalMsg', { name: goal?.name || t('txnDetail.unknown') }) + '\n\n' + t('transactions.manageFromGoals'));
      setWarningAction('goals');
      setShowWarning(true);
    } else {
      onViewDetails(tx);
    }
  };

  const isReadOnlyTransaction = (tx: any) => {
    return (tx.tags && (tx.tags.includes('debt') || tx.tags.includes('debt-payment'))) || (tx.tags && tx.tags.includes('goal'));
  };

  const getReadOnlyTitle = (tx: any) => {
    if (tx.tags?.includes('debt') || tx.tags?.includes('debt-payment')) return t('debts.cannotEditDebtTransactions');
    if (tx.tags?.includes('goal')) return t('debts.cannotEditDebtTransactions');
    return '';
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 5; i++) pages.push(i);
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
    }
    return pages;
  };

  return (
    <div className="rounded-[2rem] overflow-hidden glass-md animate-fade-in-up">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
              <th className="text-left p-4 text-[10px] font-medium text-[var(--theme-text-tertiary)] uppercase tracking-[0.08em]">{t('common.date')}</th>
              <th className="text-left p-4 text-[10px] font-medium text-[var(--theme-text-tertiary)] uppercase tracking-[0.08em]">{t('transactions.wallet')}</th>
              <th className="text-left p-4 text-[10px] font-medium text-[var(--theme-text-tertiary)] uppercase tracking-[0.08em]">{t('transactions.category')}</th>
              <th className="text-left p-4 text-[10px] font-medium text-[var(--theme-text-tertiary)] uppercase tracking-[0.08em]">{t('transactions.description')}</th>
              <th className="text-right p-4 text-[10px] font-medium text-[var(--theme-text-tertiary)] uppercase tracking-[0.08em]">{t('common.amount')}</th>
              <th className="text-center p-4 text-[10px] font-medium text-[var(--theme-text-tertiary)] uppercase tracking-[0.08em]">{t('common.edit')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map((tx, idx) => {
              const cat = getCategoryById(tx.categoryId);
              const wallet = getWalletById(tx.walletId);
              const readOnly = isReadOnlyTransaction(tx);
              const isDebt = tx.tags?.includes('debt') || tx.tags?.includes('debt-payment');
              const isGoal = tx.tags?.includes('goal');
              
              return (
                <tr 
                  key={tx.id}
                  onClick={() => handleRowClick(tx)}
                  className="transition-all duration-300 group cursor-pointer hover:bg-[var(--theme-background-glass-hover)]"
                  style={{ borderBottom: idx < paginatedTransactions.length - 1 ? '1px solid var(--theme-border-dark)' : 'none' }}
                >
                  <td className="p-4 text-sm" style={{ color: 'var(--theme-text-secondary)', fontWeight: 400 }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-[0.75rem] flex items-center justify-center glass-sm">
                        <CalendarIcon className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} />
                      </div>
                      {formatDate(tx.date, 'short')}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
                    {wallet?.name || t('txnDetail.unknown')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      {(() => {
                        const IconComponent = getIconComponent(cat?.icon || 'MoreHorizontal');
                        return (
                          <div className="w-7 h-7 rounded-[0.75rem] flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                            style={{ backgroundColor: `${cat?.color}16` }}>
                            <IconComponent className="w-4 h-4" style={{ color: cat?.color }} />
                          </div>
                        );
                      })()}
                      <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{cat?.name || t('txnDetail.unknown')}</span>
                      {isDebt && (
                        <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full glass-sm" style={{ color: 'var(--semantic-warning)' }}>{t('transactions.debtBadge')}</span>
                      )}
                      {isGoal && (
                        <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full glass-sm flex items-center gap-0.5" style={{ color: '#8B5CF6' }}>
                          <Target className="w-2 h-2" /> {t('transactions.goalBadge')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm" style={{ color: 'var(--theme-text-tertiary)', fontWeight: 350 }}>{tx.description || '-'}</td>
                  <td className="p-4 text-right text-sm font-medium" style={{ color: cat?.type === 'income' ? 'var(--semantic-income)' : 'var(--semantic-expense)' }}>
                    {cat?.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Tooltip content={readOnly ? getReadOnlyTitle(tx) : t('common.edit')} position="top">
                        <button onClick={(e) => onEdit(t, e)} disabled={readOnly}
                          className={`p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 ${
                            readOnly ? 'cursor-not-allowed' : 'glass-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                          }`}
                          style={{ color: readOnly ? 'var(--theme-text-tertiary)' : 'var(--theme-text-tertiary)', opacity: readOnly ? 0.2 : undefined }}
                         >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip content={readOnly ? getReadOnlyTitle(tx) : t('common.delete')} position="top">
                        <button onClick={(e) => onDelete(tx.id, e)} disabled={readOnly}
                          className={`p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 ${
                            readOnly ? 'cursor-not-allowed' : 'glass-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                          }`}
                          style={{ color: readOnly ? 'var(--theme-text-tertiary)' : 'var(--semantic-expense)', opacity: readOnly ? 0.2 : 0.7 }}
                         >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center p-4" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
            {t('transactions.showing', { start: (currentPage - 1) * 10 + 1, end: Math.min(currentPage * 10, filteredTransactionsLength), total: filteredTransactionsLength })}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}
              className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 disabled:opacity-20 disabled:cursor-not-allowed glass-sm">
              <ChevronLeft className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
            <div className="flex gap-1">
              {getPageNumbers().map(pageNum => (
                <button key={pageNum} onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 ${
                    currentPage === pageNum ? 'glass-md' : 'glass-sm'
                  }`}
                  style={{ color: currentPage === pageNum ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }}>
                  {pageNum}
                </button>
              ))}
            </div>
            <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}
              className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 disabled:opacity-20 disabled:cursor-not-allowed glass-sm">
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
          </div>
        </div>
      )}
      
      <ConfirmModal
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        onConfirm={() => { setShowWarning(false); navigate(warningAction === 'debts' ? '/debts' : '/goals'); }}
        title={warningTitle}
        message={warningMessage}
        confirmText={warningAction === 'debts' ? t('nav.debts') : t('nav.goals')}
        cancelText={t('common.cancel')}
        type="info"
      />
    </div>
  );
};