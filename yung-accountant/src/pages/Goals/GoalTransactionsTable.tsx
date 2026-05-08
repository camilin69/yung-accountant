// components/goals/GoalTransactionsTable.tsx
import React, { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getWalletIcon } from '../../utils/iconHelpers';
import { Calendar, ChevronLeft, ChevronRight, Search, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { useGoalStore, useWalletStore } from '../../store';

interface GoalTransactionsTableProps {
  goalId: string;
  isReadOnly?: boolean;
}

const GoalTransactionsTable: React.FC<GoalTransactionsTableProps> = ({ goalId, isReadOnly = false }) => {
  const { goals } = useGoalStore();
  const { wallets } = useWalletStore();
  const { deleteGoalTransaction } = useGoalStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ id: string; amount: number; note: string } | null>(null);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const itemsPerPage = 10;
  
  const goal = goals.find(g => g.id === goalId);
  const goalTransactions = goal?.transactions || [];

  
  const filteredTransactions = goalTransactions.filter(t =>
    t.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.type?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const handleDeleteTransaction = (transaction: any) => {
    setTransactionToDelete({ id: transaction.id, amount: transaction.amount, note: transaction.note });
    setShowDeleteConfirm(true);
  };
  
  const confirmDelete = async () => {
    if (transactionToDelete && goalId) {
      try {
        await deleteGoalTransaction(transactionToDelete.id);
        const { fetchWallets } = useWalletStore.getState();
        const { fetchGoals } = useGoalStore.getState();
        await fetchGoals(true);
        await fetchWallets(true);
        
        setToastMessage('Transaction deleted');
        setToastType('success');
        setShowToast(true);
        setTransactionToDelete(null);
      } catch (error) {
        setToastMessage('Error deleting transaction');
        setToastType('error');
        setShowToast(true);
      }
    }
    setShowDeleteConfirm(false);
  };
  
  const getTransactionIcon = (type: string) => {
    return type === 'add' ? 
      <TrendingUp className="w-3.5 h-3.5 text-green-600" /> : 
      <TrendingDown className="w-3.5 h-3.5 text-red-600" />;
  };
  
  const getWalletName = (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    return wallet?.name || 'Unknown';
  };
  
  return (
    <>
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-light text-[var(--theme-text-secondary)] flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Transaction History
            <span className="text-[10px] text-[var(--theme-text-tertiary)]">({goalTransactions.length} transactions)</span>
          </h4>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--theme-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-xs font-light focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors"
            />
          </div>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1 modal-scroll">
          {paginatedTransactions.map((tx) => {
            const date = new Date(tx.date);
            const dateStr = formatDate(tx.date, 'long');
            const timeStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            const isAdd = tx.type === 'add';
            
            return (
              <div 
                key={tx.id} 
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors border-b border-[var(--theme-border-dark)] group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isAdd ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-light text-[var(--theme-text-primary)] truncate">
                        {tx.note}
                      </p>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                        isAdd ? 'bg-green-500/20 text-green-600/80' : 'bg-red-500/20 text-red-600/80'
                      }`}>
                        {isAdd ? 'Contribution' : 'Withdrawal'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-[var(--theme-text-tertiary)] font-light">
                        {dateStr}
                      </span>
                      <span className="text-[6px] text-[var(--theme-text-tertiary)]/50">•</span>
                      <span className="text-[10px] text-[var(--theme-text-tertiary)] font-light">
                        {timeStr}
                      </span>
                      {tx.walletId && (
                        <>
                          <span className="text-[6px] text-[var(--theme-text-tertiary)]/50">•</span>
                          <div className="flex items-center gap-1">
                            {getWalletIcon(tx.walletId, "w-2.5 h-2.5", "#888")}
                            <span className="text-[10px] text-[var(--theme-text-tertiary)] font-light">
                              {getWalletName(tx.walletId)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-light flex-shrink-0 ${isAdd ? 'text-green-600' : 'text-red-600'}`}>
                      {isAdd ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  {!isReadOnly && (  // ← Solo mostrar si no es readonly
                      <button
                          onClick={() => handleDeleteTransaction(tx)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--theme-text-tertiary)] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                          <Trash2 className="w-3.5 h-3.5" />
                      </button>
                  )}
              </div>
              </div>
            );
          })}
          
          {goalTransactions.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-2 bg-[var(--theme-background-glass)] rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[var(--theme-text-tertiary)]/20" />
              </div>
              <p className="text-[var(--theme-text-tertiary)] text-sm font-light">No transactions yet</p>
              <p className="text-[var(--theme-text-tertiary)]/50 text-xs font-light mt-1">Add funds to start tracking</p>
            </div>
          )}
        </div>
        
        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-[var(--theme-border-light)]">
            <p className="text-[10px] text-[var(--theme-text-tertiary)] font-light">
              Showing {Math.min(paginatedTransactions.length, itemsPerPage)} of {filteredTransactions.length}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded bg-[var(--theme-background-glass)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--theme-background-glass-hover)] transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-[var(--theme-text-tertiary)]" />
              </button>
              <span className="text-[10px] text-[var(--theme-text-tertiary)] px-2 py-1">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded bg-[var(--theme-background-glass)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--theme-background-glass-hover)] transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 text-[var(--theme-text-tertiary)]" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${transactionToDelete?.note}"? This will restore ${formatCurrency(transactionToDelete?.amount || 0)} to your wallet.`}
        confirmText="Delete"
        type="danger"
      />
      
      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </>
  );
};

export default GoalTransactionsTable;