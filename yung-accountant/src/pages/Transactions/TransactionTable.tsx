// pages/Transactions/TransactionTable.tsx
import React, { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Calendar as CalendarIcon, Edit2, Trash2, ChevronLeft, ChevronRight, Search, Target } from 'lucide-react';
import { getIconComponent } from '../../utils/iconHelpers';
import ConfirmModal from '../../components/common/ConfirmModal';
import { useNavigate } from 'react-router-dom';
import { useDebtStore, useGoalStore } from '../../store';

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
  paginatedTransactions,
  totalPages,
  currentPage,
  setCurrentPage,
  onViewDetails,
  onEdit,
  onDelete,
  getCategoryById,
  getWalletById,
  filteredTransactionsLength
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningTitle, setWarningTitle] = useState('');
  const [warningAction, setWarningAction] = useState<'debts' | 'goals'>('debts');
  const navigate = useNavigate();
  const { debts } = useDebtStore();
  const { goals } = useGoalStore();
  
  if (paginatedTransactions.length === 0) {
    return (
      <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl overflow-hidden">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--theme-background-glass)] flex items-center justify-center">
            <Search className="w-8 h-8 text-[var(--theme-text-tertiary)]/20" />
          </div>
          <p className="text-[var(--theme-text-tertiary)] text-sm font-light">No transactions found</p>
          <p className="text-[var(--theme-text-tertiary)]/50 text-xs mt-1">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  const handleRowClick = (t: any) => {
    const isDebtTransaction = t.tags && (t.tags.includes('debt') || t.tags.includes('debt-payment'));
    const isGoalTransaction = t.tags && t.tags.includes('goal');
    
    if (isDebtTransaction) {
      const debtId = t.tags?.find((tag: string) => 
        tag && tag.length > 0 && 
        tag !== 'debt' && 
        tag !== 'debt-payment' && 
        tag !== 'borrowed' && 
        tag !== 'lent' &&
        !tag.includes('transaction')
      );
      const debt = debts.find(d => d.id === debtId);
      const debtTypeText = debt?.type === 'borrowed' ? 'debt you owe' : 'debt owed to you';
      
      setWarningTitle('Debt Transaction');
      setWarningMessage(
        `This transaction is associated with a ${debtTypeText} from/to "${debt?.creditorName || 'Unknown'}".\n\nPlease manage this from the Debts module.`
      );
      setWarningAction('debts');
      setShowWarning(true);
    } else if (isGoalTransaction) {
      const goalId = t.tags?.find((tag: string) => 
        tag && tag !== 'goal' && tag !== 'purchase'
      );
      const goal = goals.find(g => g.id === goalId);
      
      setWarningTitle('Goal Transaction');
      setWarningMessage(
        `This transaction is associated with the goal "${goal?.name || 'Unknown'}".\n\nPlease manage this from the Goals module.`
      );
      setWarningAction('goals');
      setShowWarning(true);
    } else {
      onViewDetails(t);
    }
  };

  const isReadOnlyTransaction = (t: any) => {
    const isDebt = t.tags && (t.tags.includes('debt') || t.tags.includes('debt-payment'));
    const isGoal = t.tags && t.tags.includes('goal');
    return isDebt || isGoal;
  };

  const getReadOnlyTitle = (t: any) => {
    if (t.tags?.includes('debt') || t.tags?.includes('debt-payment')) {
      return 'Debt transactions cannot be edited or deleted directly';
    }
    if (t.tags?.includes('goal')) {
      return 'Goal transactions cannot be edited or deleted directly';
    }
    return '';
  };

  return (
    <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--theme-border-light)] bg-[var(--theme-background-glass)]">
              <th className="text-left p-4 text-[10px] font-light text-[var(--theme-text-tertiary)] uppercase tracking-wider">Date</th>
              <th className="text-left p-4 text-[10px] font-light text-[var(--theme-text-tertiary)] uppercase tracking-wider">Wallet</th>
              <th className="text-left p-4 text-[10px] font-light text-[var(--theme-text-tertiary)] uppercase tracking-wider">Category</th>
              <th className="text-left p-4 text-[10px] font-light text-[var(--theme-text-tertiary)] uppercase tracking-wider">Description</th>
              <th className="text-right p-4 text-[10px] font-light text-[var(--theme-text-tertiary)] uppercase tracking-wider">Amount</th>
              <th className="text-center p-4 text-[10px] font-light text-[var(--theme-text-tertiary)] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map(t => {
              const cat = getCategoryById(t.categoryId);
              const wallet = getWalletById(t.walletId);
              const readOnly = isReadOnlyTransaction(t);
              const isDebt = t.tags?.includes('debt') || t.tags?.includes('debt-payment');
              const isGoal = t.tags?.includes('goal');
              
              return (
                <tr 
                  key={t.id} 
                  onClick={() => handleRowClick(t)}
                  className="border-b border-[var(--theme-border-dark)] hover:bg-[var(--theme-background-glass-hover)] transition-colors duration-200 group cursor-pointer"
                >
                  <td className="p-4 text-sm text-[var(--theme-text-secondary)] font-light">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-3.5 h-3.5 text-[var(--theme-text-tertiary)]" />
                      {formatDate(t.date, 'short')}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-[var(--theme-text-secondary)] font-light">
                    <div className="flex items-center gap-2">
                      {wallet?.name || 'Unknown'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const IconComponent = getIconComponent(cat?.icon || 'MoreHorizontal');
                        return (
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all duration-300 group-hover:scale-110"
                            style={{ backgroundColor: `${cat?.color}20` }}
                          >
                            <IconComponent className="w-4 h-4" style={{ color: cat?.color }} />
                          </div>
                        );
                      })()}
                      <span className="text-sm font-light text-[var(--theme-text-primary)]">{cat?.name || 'Unknown'}</span>
                      {isDebt && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400/80">Debt</span>
                      )}
                      {isGoal && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400/80 flex items-center gap-0.5">
                          <Target className="w-2 h-2" />
                          Goal
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-light text-[var(--theme-text-tertiary)]">{t.description || '-'}</td>
                  <td className={`p-4 text-right text-sm font-light ${cat?.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {cat?.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => onEdit(t, e)}
                        disabled={readOnly}
                        className={`p-1.5 rounded-lg transition-colors ${
                          readOnly
                            ? 'text-[var(--theme-text-tertiary)]/30 cursor-not-allowed'
                            : 'hover:bg-[var(--theme-background-glass-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] opacity-0 group-hover:opacity-100'
                        }`}
                        title={readOnly ? getReadOnlyTitle(t) : 'Edit transaction'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => onDelete(t.id, e)}
                        disabled={readOnly}
                        className={`p-1.5 rounded-lg transition-colors ${
                          readOnly
                            ? 'text-[var(--theme-text-tertiary)]/30 cursor-not-allowed'
                            : 'hover:bg-red-500/20 text-[var(--theme-text-tertiary)] hover:text-red-500 opacity-0 group-hover:opacity-100'
                        }`}
                        title={readOnly ? getReadOnlyTitle(t) : 'Delete transaction'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
        <div className="flex justify-between items-center p-4 border-t border-[var(--theme-border-light)]">
          <p className="text-xs text-[var(--theme-text-tertiary)] font-light">
            Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, paginatedTransactions.length)} of {filteredTransactionsLength}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-[var(--theme-background-glass)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--theme-background-glass-hover)] transition-all duration-300"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-light transition-all duration-300 ${
                      currentPage === pageNum
                        ? 'bg-[var(--theme-primary)] text-white'
                        : 'bg-[var(--theme-background-glass)] text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-background-glass-hover)]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-[var(--theme-background-glass)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--theme-background-glass-hover)] transition-all duration-300"
            >
              <ChevronRight className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
            </button>
          </div>
        </div>
      )}
      
      <ConfirmModal
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        onConfirm={() => {
          setShowWarning(false);
          navigate(warningAction === 'debts' ? '/debts' : '/goals');
        }}
        title={warningTitle}
        message={warningMessage}
        confirmText={warningAction === 'debts' ? 'Go to Debts' : 'Go to Goals'}
        cancelText="Stay Here"
        type="info"
      />
    </div>
  );
};