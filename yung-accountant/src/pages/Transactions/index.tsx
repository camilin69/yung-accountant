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
  const { getGradientTextClass } = useThemeStyles();
  
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

  const statCards = [
    {
      icon: <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} strokeWidth={1.5} />,
      label: 'Total Income',
      value: `+${formatCurrency(stats.totalIncome)}`,
      sublabel: 'All time',
      color: '#10B981',
      delay: 0,
    },
    {
      icon: <TrendingDown className="w-5 h-5" style={{ color: '#EF4444' }} strokeWidth={1.5} />,
      label: 'Total Expenses',
      value: `-${formatCurrency(stats.totalExpenses)}`,
      sublabel: 'All time',
      color: '#EF4444',
      delay: 100,
    },
    {
      icon: <Wallet className="w-5 h-5" style={{ color: '#3B82F6' }} strokeWidth={1.5} />,
      label: 'Net Balance',
      value: formatCurrency(stats.totalIncome - stats.totalExpenses),
      sublabel: `${stats.count} transactions`,
      color: '#3B82F6',
      delay: 200,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-10 pt-4 animate-fade-in-down">
        <div>
          <h1 className="text-[34px] font-light tracking-[-0.03em]" style={{ color: 'var(--theme-text-primary)' }}>
            Transactions
          </h1>
          <p className="text-[14px] mt-1.5 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
            Manage all your financial activity
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTransaction(null);
            setShowTransactionModal(true);
          }}
          className="px-5 py-3 rounded-2xl text-[12px] font-medium tracking-[0.04em] uppercase flex items-center gap-2.5 transition-all duration-500 hover:-translate-y-1 active:scale-95"
          style={{ 
            backgroundColor: 'var(--theme-primary)', 
            color: '#FFFFFF',
            boxShadow: '0 4px 20px -6px var(--theme-primary)'
          }}
        >
          <Plus className="w-4 h-4 transition-transform duration-500 hover:rotate-90" strokeWidth={2.5} />
          Add Transaction
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {statCards.map((stat, i) => (
          <div 
            key={i}
            className="group rounded-[1.75rem] p-5 transition-all duration-700 ease-out animate-fade-in-up hover:-translate-y-1 cursor-default glass-sm"
            style={{ animationDelay: `${stat.delay}ms` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-[1rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
                style={{ backgroundColor: `${stat.color}14`, boxShadow: `0 4px 12px -4px ${stat.color}15` }}
              >
                {stat.icon}
              </div>
              <span className="text-[11px] font-medium tracking-[0.08em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>
                {stat.label}
              </span>
            </div>
            <p className="text-[24px] font-light tracking-[-0.02em] transition-all duration-500 group-hover:scale-105 origin-left" style={{ color: 'var(--theme-text-primary)' }}>
              {stat.value}
            </p>
            <p className="text-[11px] mt-1 tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)' }}>
              {stat.sublabel}
            </p>
          </div>
        ))}
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