// pages/Transactions/TransactionTable.tsx
import React, { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Calendar as CalendarIcon, Edit2, Trash2, ChevronLeft, ChevronRight, Search, Target} from 'lucide-react';
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
  paginatedTransactions, totalPages, currentPage, setCurrentPage,
  onViewDetails, onEdit, onDelete, getCategoryById, getWalletById,
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
      <div className="rounded-[2rem] overflow-hidden glass-md">
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-[1.5rem] flex items-center justify-center glass-sm">
            <Search className="w-8 h-8" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.25 }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>No transactions found</p>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  const handleRowClick = (t: any) => {
    const isDebtTransaction = t.tags && (t.tags.includes('debt') || t.tags.includes('debt-payment'));
    const isGoalTransaction = t.tags && t.tags.includes('goal');
    
    if (isDebtTransaction) {
      const debtId = t.tags?.find((tag: string) => 
        tag && tag.length > 0 && tag !== 'debt' && tag !== 'debt-payment' && tag !== 'borrowed' && tag !== 'lent' && !tag.includes('transaction')
      );
      const debt = debts.find(d => d.id === debtId);
      const debtTypeText = debt?.type === 'borrowed' ? 'debt you owe' : 'debt owed to you';
      setWarningTitle('Debt Transaction');
      setWarningMessage(`This transaction is associated with a ${debtTypeText} from/to "${debt?.creditorName || 'Unknown'}".\n\nPlease manage this from the Debts module.`);
      setWarningAction('debts');
      setShowWarning(true);
    } else if (isGoalTransaction) {
      const goalId = t.tags?.find((tag: string) => tag && tag !== 'goal' && tag !== 'purchase');
      const goal = goals.find(g => g.id === goalId);
      setWarningTitle('Goal Transaction');
      setWarningMessage(`This transaction is associated with the goal "${goal?.name || 'Unknown'}".\n\nPlease manage this from the Goals module.`);
      setWarningAction('goals');
      setShowWarning(true);
    } else {
      onViewDetails(t);
    }
  };

  const isReadOnlyTransaction = (t: any) => {
    return (t.tags && (t.tags.includes('debt') || t.tags.includes('debt-payment'))) || (t.tags && t.tags.includes('goal'));
  };

  const getReadOnlyTitle = (t: any) => {
    if (t.tags?.includes('debt') || t.tags?.includes('debt-payment')) return 'Debt transactions cannot be edited or deleted directly';
    if (t.tags?.includes('goal')) return 'Goal transactions cannot be edited or deleted directly';
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
              <th className="text-left p-4 text-[10px] font-medium text-[var(--theme-text-tertiary)] uppercase tracking-[0.08em]">Date</th>
              <th className="text-left p-4 text-[10px] font-medium text-[var(--theme-text-tertiary)] uppercase tracking-[0.08em]">Wallet</th>
              <th className="text-left p-4 text-[10px] font-medium text-[var(--theme-text-tertiary)] uppercase tracking-[0.08em]">Category</th>
              <th className="text-left p-4 text-[10px] font-medium text-[var(--theme-text-tertiary)] uppercase tracking-[0.08em]">Description</th>
              <th className="text-right p-4 text-[10px] font-medium text-[var(--theme-text-tertiary)] uppercase tracking-[0.08em]">Amount</th>
              <th className="text-center p-4 text-[10px] font-medium text-[var(--theme-text-tertiary)] uppercase tracking-[0.08em]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map((t, idx) => {
              const cat = getCategoryById(t.categoryId);
              const wallet = getWalletById(t.walletId);
              const readOnly = isReadOnlyTransaction(t);
              const isDebt = t.tags?.includes('debt') || t.tags?.includes('debt-payment');
              const isGoal = t.tags?.includes('goal');
              
              return (
                <tr 
                  key={t.id} 
                  onClick={() => handleRowClick(t)}
                  className="transition-all duration-300 group cursor-pointer hover:bg-[var(--theme-background-glass-hover)]"
                  style={{ borderBottom: idx < paginatedTransactions.length - 1 ? '1px solid var(--theme-border-dark)' : 'none' }}
                >
                  <td className="p-4 text-sm" style={{ color: 'var(--theme-text-secondary)', fontWeight: 400 }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-[0.75rem] flex items-center justify-center glass-sm">
                        <CalendarIcon className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} />
                      </div>
                      {formatDate(t.date, 'short')}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
                    {wallet?.name || 'Unknown'}
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
                      <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{cat?.name || 'Unknown'}</span>
                      {isDebt && (
                        <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full glass-sm" style={{ color: 'var(--semantic-warning)' }}>Debt</span>
                      )}
                      {isGoal && (
                        <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full glass-sm flex items-center gap-0.5" style={{ color: '#8B5CF6' }}>
                          <Target className="w-2 h-2" /> Goal
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-sm" style={{ color: 'var(--theme-text-tertiary)', fontWeight: 350 }}>{t.description || '-'}</td>
                  <td className="p-4 text-right text-sm font-medium" style={{ color: cat?.type === 'income' ? 'var(--semantic-income)' : 'var(--semantic-expense)' }}>
                    {cat?.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => onEdit(t, e)} disabled={readOnly}
                        className={`p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 ${
                          readOnly ? 'cursor-not-allowed' : 'glass-sm opacity-0 group-hover:opacity-100'
                        }`}
                        style={{ color: readOnly ? 'var(--theme-text-tertiary)' : 'var(--theme-text-tertiary)', opacity: readOnly ? 0.2 : undefined }}
                        title={readOnly ? getReadOnlyTitle(t) : 'Edit transaction'}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => onDelete(t.id, e)} disabled={readOnly}
                        className={`p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 ${
                          readOnly ? 'cursor-not-allowed' : 'glass-sm opacity-0 group-hover:opacity-100'
                        }`}
                        style={{ color: readOnly ? 'var(--theme-text-tertiary)' : 'var(--semantic-expense)', opacity: readOnly ? 0.2 : 0.7 }}
                        title={readOnly ? getReadOnlyTitle(t) : 'Delete transaction'}>
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
        <div className="flex justify-between items-center p-4" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
            Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, filteredTransactionsLength)} of {filteredTransactionsLength}
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
        confirmText={warningAction === 'debts' ? 'Go to Debts' : 'Go to Goals'}
        cancelText="Stay Here"
        type="info"
      />
    </div>
  );
};