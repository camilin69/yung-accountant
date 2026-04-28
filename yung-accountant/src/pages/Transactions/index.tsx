// pages/Transactions/index.tsx

import React from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import TransactionDetailModal from './TransactionDetailModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { TransactionFilters } from './TransactionFilters';
import { TransactionTable } from './TransactionTable';
import { useTransactions } from './useTransactions';

const Transactions: React.FC = () => {
  const {
    // Estados
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
    selectedTransaction,
    showFilters,
    setShowFilters,
    showToast,
    filteredTransactionsLength,
    setShowToast,
    toastMessage,
    toastType,
    // Datos derivados
    paginatedTransactions,
    totalPages,
    stats,
    incomeCategories,
    expenseCategories,
    // Funciones
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
          <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
            Transactions
          </h1>
          <p className="text-xs text-white/40 mt-0.5 font-light">Manage all your financial activity</p>
        </div>
        <button
          onClick={() => {
            setEditingTransaction(null);
            setShowDetailModal(true);
          }}
          className="group relative px-4 py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          Add Transaction
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-300 hover:bg-white/[0.06] group">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-4 h-4 text-green-500/80" />
            </div>
            <span className="text-[10px] text-white/30">Total</span>
          </div>
          <p className="text-xl font-light text-green-500">+{formatCurrency(stats.totalIncome)}</p>
          <p className="text-[10px] text-white/40 mt-1 font-light">Total Income</p>
        </div>
        
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-300 hover:bg-white/[0.06] group">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <TrendingDown className="w-4 h-4 text-red-500/80" />
            </div>
            <span className="text-[10px] text-white/30">Total</span>
          </div>
          <p className="text-xl font-light text-red-500">-{formatCurrency(stats.totalExpenses)}</p>
          <p className="text-[10px] text-white/40 mt-1 font-light">Total Expenses</p>
        </div>
        
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-300 hover:bg-white/[0.06] group">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Wallet className="w-4 h-4 text-[#6366F1]/80" />
            </div>
            <span className="text-[10px] text-white/30">{stats.count} txns</span>
          </div>
          <p className="text-xl font-light text-[#6366F1]">{formatCurrency(stats.totalIncome - stats.totalExpenses)}</p>
          <p className="text-[10px] text-white/40 mt-1 font-light">Net Balance</p>
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

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onSave={() => {
            setShowDetailModal(false);
            setEditingTransaction(null);
        }}
        editingTransaction={selectedTransaction}
        defaultDate={selectedTransaction?.date}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
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