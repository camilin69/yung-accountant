// pages/Transactions/index.tsx
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import TransactionModal from './TransactionModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { TransactionFilters } from './TransactionFilters';
import { TransactionTable } from './TransactionTable';
import { useTransactions } from './useTransactions';
import TransactionDetailModal from './TransactionDetailModal';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import CachedBadge from '../../components/common/CachedBadge';
import { useTransactionStore, useWalletStore } from '../../store';
import { useTranslation } from '../../i18n';
import { Carousel } from '../../components/common/Carousel';
import { useResponsive } from '../../hooks/useResponsive';

const Transactions: React.FC = () => {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();

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
  } = useTransactions(t);

  useDocumentTitle(t('transactions.title'));

  const statCards = [
    {
      icon: <TrendingUp className="w-5 h-5" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />,
      label: t('dashboard.income'),
      value: `+${formatCurrency(stats.totalIncome)}`,
      sublabel: t('transactions.allTime'),
      color: '#10B981',
      delay: 0,
    },
    {
      icon: <TrendingDown className="w-5 h-5" style={{ color: 'var(--semantic-expense)' }} strokeWidth={1.5} />,
      label: t('dashboard.expenses'),
      value: `-${formatCurrency(stats.totalExpenses)}`,
      sublabel: t('transactions.allTime'),
      color: '#EF4444',
      delay: 100,
    },
    {
      icon: <Wallet className="w-5 h-5" style={{ color: 'var(--semantic-info)' }} strokeWidth={1.5} />,
      label: t('common.balance'),
      value: formatCurrency(stats.totalIncome - stats.totalExpenses),
      sublabel: t('transactions.xTransactions', { count: stats.count }),
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
            {t('transactions.title')} <CachedBadge />
          </h1>
          <p className="text-[14px] mt-1.5 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
            {t('transactions.subtitle')}
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
          {t('transactions.addTransaction')}
        </button>
      </div>

      {/* Stats Cards */}
      {isMobile ? (
        <Carousel className="mb-10">
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
              <p className="text-[24px] font-light tracking-[-0.02em] transition-all duration-500 group-hover:scale-105 origin-left text-adaptive-number" style={{ color: 'var(--theme-text-primary)' }}>
                {stat.value}
              </p>
              <p className="text-[11px] mt-1 tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)' }}>
                {stat.sublabel}
              </p>
            </div>
          ))}
        </Carousel>
      ) : (
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
              <p className="text-[24px] font-light tracking-[-0.02em] transition-all duration-500 group-hover:scale-105 origin-left text-adaptive-number" style={{ color: 'var(--theme-text-primary)' }}>
                {stat.value}
              </p>
              <p className="text-[11px] mt-1 tracking-[0.03em]" style={{ color: 'var(--theme-text-tertiary)' }}>
                {stat.sublabel}
              </p>
            </div>
          ))}
        </div>
      )}

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
          // Skip server re-fetch when offline — the store already has the
          // optimistic data from addTransaction/updateTransaction, and the
          // SW will sync it when connectivity returns.
          const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
          if (isOffline) {
            return;
          }
          try {
            const { fetchWallets } = useWalletStore.getState();
            const { fetchTransactions } = useTransactionStore.getState();
            await fetchTransactions(true);
            await fetchWallets(true);
          } catch {
            // Silently ignore — data was already committed optimistically.
            // Background sync will refresh when connectivity returns.
          }
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
        title={t('transactions.deleteTransaction')}
        message={t('transactions.confirmDelete')}
        confirmText={t('common.delete')}
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