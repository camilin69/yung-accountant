// components/goals/GoalTransactionsTable.tsx
import React, { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getWalletIcon } from '../../utils/iconHelpers';
import { Calendar, ChevronLeft, ChevronRight, Search, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { useGoalStore, useTransactionStore, useWalletStore } from '../../store';

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
        const { fetchTransactions } = useTransactionStore.getState();
        await fetchGoals(true);
        await fetchWallets(true);
        await fetchTransactions(true);
        
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
      <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} /> :
      <TrendingDown className="w-3.5 h-3.5" style={{ color: 'var(--semantic-expense)' }} strokeWidth={1.5} />;
  };
  
  const getWalletName = (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    return wallet?.name || 'Unknown';
  };
  
  return (
    <>
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-medium tracking-[0.02em] flex items-center gap-2" style={{ color: 'var(--theme-text-secondary)' }}>
            <Calendar className="w-4 h-4" strokeWidth={1.5} />
            Transaction History
            <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
              ({goalTransactions.length} transactions)
            </span>
          </h4>
          
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }} />
            <input
              maxLength={50}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-2xl text-xs focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
              style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
            />
          </div>
        </div>
        
        <div className="space-y-1 max-h-96 overflow-y-auto pr-1 modal-scroll">
          {paginatedTransactions.map((tx) => {
            const date = new Date(tx.date);
            const dateStr = formatDate(tx.date, 'long');
            const timeStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            const isAdd = tx.type === 'add';
            
            return (
              <div 
                key={tx.id} 
                className="flex items-center justify-between py-3 px-3 rounded-[1rem] transition-all duration-300 group hover:bg-[var(--theme-background-glass-hover)] glass-sm"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-[0.85rem] flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: isAdd ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>
                        {tx.note}
                      </p>
                      <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full glass-sm"
                        style={{ color: isAdd ? 'var(--semantic-income)' : 'var(--semantic-expense)' }}>
                        {isAdd ? 'Contribution' : 'Withdrawal'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px]" style={{ color: 'var(--theme-text-tertiary)' }}>
                        {dateStr}
                      </span>
                      <span className="text-[6px]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.3 }}>•</span>
                      <span className="text-[10px]" style={{ color: 'var(--theme-text-tertiary)' }}>
                        {timeStr}
                      </span>
                      {tx.walletId && (
                        <>
                          <span className="text-[6px]" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.3 }}>•</span>
                          <div className="flex items-center gap-1">
                            {getWalletIcon(tx.walletId, "w-2.5 h-2.5", "#888")}
                            <span className="text-[10px]" style={{ color: 'var(--theme-text-tertiary)' }}>
                              {getWalletName(tx.walletId)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium flex-shrink-0" style={{ color: isAdd ? 'var(--semantic-income)' : 'var(--semantic-expense)' }}>
                    {isAdd ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  {!isReadOnly && (
                    <button
                      onClick={() => handleDeleteTransaction(tx)}
                      className="p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 opacity-0 group-hover:opacity-100 glass-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--semantic-expense)', opacity: 0.7 }} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          
          {goalTransactions.length === 0 && (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto mb-3 rounded-[1.25rem] flex items-center justify-center glass-sm">
                <Calendar className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.2 }} strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>No transactions yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>Add funds to start tracking</p>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
            <p className="text-[10px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
              Showing {Math.min(paginatedTransactions.length, itemsPerPage)} of {filteredTransactions.length}
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 disabled:opacity-20 disabled:cursor-not-allowed glass-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} />
              </button>
              <span className="text-[10px] font-medium px-2 py-1" style={{ color: 'var(--theme-text-tertiary)' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-2xl transition-all duration-300 hover:scale-110 disabled:opacity-20 disabled:cursor-not-allowed glass-sm"
              >
                <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)' }} />
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