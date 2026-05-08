// pages/Transactions/index.tsx
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useThemeStyles } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatters';
import TransactionModal from './TransactionModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { TransactionFilters } from './TransactionFilters';
import { TransactionTable } from './TransactionTable';
import { useTransactions } from './useTransactions';
import TransactionDetailModal from './TransactionDetailModal';
import { useTransactionStore, useWalletStore } from '../../store';

const Transactions: React.FC = () => {
  const { getGradientTextClass, getStatCardClass } = useThemeStyles();
  
  const {
    setShowTransactionModal,
    showTransactionModal,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    typeFilter,
    setTypeFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    currentPage,
    setCurrentPage,
    showDetailModal,
    setShowDetailModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    setEditingTransaction,
    editingTransaction,
    selectedTransaction,
    setSelectedTransaction,
    showFilters,
    setShowFilters,
    showToast,
    filteredTransactionsLength,
    setShowToast,
    toastMessage,
    toastType,
    paginatedTransactions,
    totalPages,
    stats,
    incomeCategories,
    expenseCategories,
    categories,
    getCategoryById,
    getWalletById,
    handleDeleteClick,
    confirmDelete,
    handleViewDetails,
    handleEdit,
  } = useTransactions();

  

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={`text-2xl font-light tracking-tight ${getGradientTextClass()}`}>
            Transactions
          </h1>
          <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">Manage all your financial activity</p>
        </div>
        <button
          onClick={() => {
            setEditingTransaction(null);
            setShowTransactionModal(true);
          }}
          className="group relative px-4 py-2 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] transition-all duration-300 text-[var(--theme-text-primary)] text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg border border-[var(--theme-border-light)]"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          Add Transaction
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className={getStatCardClass()}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-[10px] text-[var(--theme-text-tertiary)]">Total</span>
          </div>
          <p className="text-xl font-light text-green-600">+{formatCurrency(stats.totalIncome)}</p>
          <p className="text-[10px] text-[var(--theme-text-tertiary)] mt-1 font-light">Total Income</p>
        </div>
        
        <div className={getStatCardClass()}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-[10px] text-[var(--theme-text-tertiary)]">Total</span>
          </div>
          <p className="text-xl font-light text-red-600">-{formatCurrency(stats.totalExpenses)}</p>
          <p className="text-[10px] text-[var(--theme-text-tertiary)] mt-1 font-light">Total Expenses</p>
        </div>
        
        <div className={getStatCardClass()}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Wallet className="w-4 h-4 text-[var(--theme-primary)]" />
            </div>
            <span className="text-[10px] text-[var(--theme-text-tertiary)]">{stats.count} txns</span>
          </div>
          <p className="text-xl font-light text-[var(--theme-primary)]">{formatCurrency(stats.totalIncome - stats.totalExpenses)}</p>
          <p className="text-[10px] text-[var(--theme-text-tertiary)] mt-1 font-light">Net Balance</p>
        </div>
      </div>

      {/* Filters */}
      <TransactionFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
      />

      {/* Transactions Table */}
      <TransactionTable
        paginatedTransactions={paginatedTransactions}
        totalPages={totalPages}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onViewDetails={handleViewDetails}
        filteredTransactionsLength={filteredTransactionsLength}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        getCategoryById={getCategoryById}
        getWalletById={getWalletById}
      />

      {/* Modal de DETALLE (solo lectura) */}
      <TransactionDetailModal
          isOpen={showDetailModal}
          onClose={() => { setShowDetailModal(false); setSelectedTransaction(null); }}
          transaction={selectedTransaction}
          onEdit={() => {
              setShowDetailModal(false);
              handleEdit(selectedTransaction, new MouseEvent('click') as any);
          }}
          onDelete={() => selectedTransaction && handleDeleteClick(selectedTransaction.id, new MouseEvent('click') as any)}
          getCategoryById={getCategoryById}
          getWalletById={getWalletById}
      />

      {/* Modal de EDICIÓN (formulario) */}
      <TransactionModal
          isOpen={showTransactionModal}
          onClose={() => { setShowTransactionModal(false); setEditingTransaction(null); }}
          onSave={async () => {
              setShowTransactionModal(false);
              setEditingTransaction(null);
              // Refrescar datos
              const { fetchWallets } = useWalletStore.getState();
              const { fetchTransactions } = useTransactionStore.getState();
              await fetchTransactions(true);
              await fetchWallets(true);
          }}
          editingTransaction={editingTransaction}
          defaultDate={editingTransaction?.date}
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
          categories={categories}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          await confirmDelete();
          const { fetchWallets } = useWalletStore.getState();
          await fetchWallets(true);
        }}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />

      {/* Toast Notification */}
      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default Transactions;