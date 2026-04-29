// components/goals/GoalTransactionsTable.tsx
import React, { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getWalletIcon } from '../../utils/iconHelpers';
import { Calendar, ChevronLeft, ChevronRight, Search, TrendingUp, TrendingDown, Trash2, Edit2, X, Save } from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import CustomSelect from '../../components/common/CustomSelect';
import NumberInput from '../../components/common/NumberInput';
import { useGoalStore, useWalletStore } from '../../store';

interface GoalTransactionsTableProps {
  goalId: string;
}

const GoalTransactionsTable: React.FC<GoalTransactionsTableProps> = ({ goalId }) => {
  const { goals } = useGoalStore();
  const { wallets } = useWalletStore();
  const { updateGoalTransaction, deleteGoalTransaction } = useGoalStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ id: string; amount: number; note: string } | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    amount: 0,
    note: '',
    walletId: '',
    date: '',
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [editError, setEditError] = useState<string | null>(null);
  const itemsPerPage = 10;
  
  const goal = goals.find(g => g.id === goalId);
  const goalTransactions = goal?.transactions || [];
  
  const walletOptions = wallets
    .filter(w => w.isActive)
    .map(w => ({
      id: w.id,
      label: `${w.name}${w.lastFourDigits ? ` (****${w.lastFourDigits})` : ''}`,
      icon: getWalletIcon(w.type, "w-4 h-4", w.color),
      color: w.color,
    }));
  
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
  
  const confirmDelete = () => {
    if (transactionToDelete && goalId) {
      deleteGoalTransaction(goalId, transactionToDelete.id);
      setToastMessage(`Transaction "${transactionToDelete.note}" deleted successfully`);
      setToastType('success');
      setShowToast(true);
      setTransactionToDelete(null);
    }
    setShowDeleteConfirm(false);
  };
  
  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setEditFormData({
      amount: transaction.amount,
      note: transaction.note,
      walletId: transaction.walletId,
      date: transaction.date.split('T')[0],
    });
    setEditError(null);
    setShowEditModal(true);
  };
  
  const handleUpdateTransaction = () => {
    if (editFormData.amount <= 0) {
      setEditError('Amount must be greater than 0');
      return;
    }
    if (!editFormData.walletId) {
      setEditError('Please select a wallet');
      return;
    }
    if (!editFormData.date) {
      setEditError('Please select a date');
      return;
    }
    
    updateGoalTransaction(goalId, editingTransaction.id, {
      amount: editFormData.amount,
      note: editFormData.note,
      walletId: editFormData.walletId,
      date: editFormData.date,
    });
    
    setToastMessage(`Transaction updated successfully`);
    setToastType('success');
    setShowToast(true);
    setShowEditModal(false);
    setEditingTransaction(null);
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
                  <p className={`text-sm font-light flex-shrink-0 ${
                    isAdd ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isAdd ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <button
                    onClick={() => handleEditTransaction(tx)}
                    className="p-1.5 rounded-lg hover:bg-[var(--theme-background-glass-hover)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTransaction(tx)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--theme-text-tertiary)] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
      
      {/* Modal de edición */}
      {showEditModal && editingTransaction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-md flex flex-col max-h-[85vh]">
            <div className="sticky top-0 z-10 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-t-xl">
              <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)]">
                <div>
                  <h3 className="text-lg font-light text-[var(--theme-text-primary)]">Edit Transaction</h3>
                  <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">
                    Update your goal transaction
                  </p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
                  <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto modal-scroll p-5 space-y-5">
              <NumberInput
                label="Amount"
                value={editFormData.amount}
                onChange={(value) => setEditFormData(prev => ({ ...prev, amount: value }))}
                placeholder="0"
                min={1}
                required
                showPreview
                previewLabel="Amount"
                error={editError}
              />
              
              <CustomSelect
                label="Wallet"
                value={editFormData.walletId}
                onChange={(value) => setEditFormData(prev => ({ ...prev, walletId: value }))}
                options={walletOptions}
                placeholder="Select a wallet"
                required
              />
              
              <div>
                <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Date</label>
                <input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">Note</label>
                <input
                  type="text"
                  value={editFormData.note}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors placeholder:text-[var(--theme-text-tertiary)]/20"
                  placeholder="Add a note..."
                />
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-b-xl">
              <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)]">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTransaction}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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