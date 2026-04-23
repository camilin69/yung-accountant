// pages/Transactions.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { AlertCircle, ArrowRight, ArrowUpDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit2, FileText, Filter, Plus, Search, Trash2, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';;
import TransactionModal from '../components/modals/TransactionModal';
import ConfirmModal from '../components/common/ConfirmModal';
import ToastNotification from '../components/common/ToastNotification';
import { getIconComponent } from '../utils/iconHelpers';
import CustomSelect from '../components/common/CustomSelect';

const Transactions: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { transactions, categories, deleteTransaction, wallets } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const itemsPerPage = 10;

  useEffect(() => {
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchParams]);

  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const getWalletById = (id: string) => wallets.find(w => w.id === id);

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (searchTerm) {
      filtered = filtered.filter(t => {
        const cat = getCategoryById(t.categoryId);
        return t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               cat?.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.categoryId === categoryFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => {
        const cat = getCategoryById(t.categoryId);
        return typeFilter === 'income' ? cat?.type === 'income' : cat?.type === 'expense';
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
    });

    return filtered;
  }, [transactions, searchTerm, categoryFilter, typeFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    totalIncome: transactions
      .filter(t => {
        const cat = getCategoryById(t.categoryId);
        return cat?.type === 'income';
      })
      .reduce((sum, t) => sum + t.amount, 0),
    totalExpenses: transactions
      .filter(t => {
        const cat = getCategoryById(t.categoryId);
        return cat?.type === 'expense';
      })
      .reduce((sum, t) => sum + t.amount, 0),
    count: transactions.length,
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();    
    setTransactionToDelete(id);
    setShowDeleteConfirm(true);
  };

  const navigate = useNavigate();
  const confirmDelete = () => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete);
      setToastMessage('Transaction deleted successfully');
      setToastType('success');
      setShowToast(true);
      setTransactionToDelete(null);
      setShowDetailModal(false);
    }
    setShowDeleteConfirm(false);
  };

  const handleViewDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const handleEdit = (transaction: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const isDebtTransaction = transaction.tags && (transaction.tags.includes('debt') || transaction.tags.includes('debt-payment'));
    
    if (isDebtTransaction) {
      setToastMessage('Debt transactions cannot be edited. Please manage them from the Debts module.');
      setToastType('warning');
      setShowToast(true);
      return;
    }
    
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };


  const incomeCategories = categories.filter(c => c.type === 'income' && !c.isSystem);
  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.isSystem);

  const selectedTransactionDetails = selectedTransaction ? getCategoryById(selectedTransaction.categoryId) : null;

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
            setShowTransactionModal(true);
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

      {/* Filters Bar */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl mb-6">
        <div className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/30"
              />
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 hover:text-white text-sm font-light transition-all duration-300 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {(categoryFilter !== 'all' || typeFilter !== 'all') && (
              <span className="w-2 h-2 bg-[#6366F1] rounded-full" />
            )}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (sortBy === 'date') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('date');
                  setSortOrder('desc');
                }
              }}
              className={`px-3 py-2 rounded-lg text-sm font-light transition-all duration-200 flex items-center gap-2 ${
                sortBy === 'date' 
                  ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' 
                  : 'bg-white/[0.03] text-white/60 hover:text-white'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Date {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'amount') {
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortBy('amount');
                  setSortOrder('desc');
                }
              }}
              className={`px-3 py-2 rounded-lg text-sm font-light transition-all duration-200 flex items-center gap-2 ${
                sortBy === 'amount' 
                  ? 'bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/30' 
                  : 'bg-white/[0.03] text-white/60 hover:text-white'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Amount {sortBy === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>

        {showFilters && (
        <div className="p-4 border-t border-white/10 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <CustomSelect
              label="Category"
              value={categoryFilter}
              onChange={(value) => setCategoryFilter(value)}
              options={[
                { id: 'all', label: 'All Categories', icon: null },
                ...(incomeCategories.length > 0 
                  ? [{ id: 'income-sep', label: '━━━ INCOME ━━━', icon: null, disabled: true }] 
                  : []),
                ...incomeCategories.map(cat => {
                  const IconComponent = getIconComponent(cat.icon);
                  return {
                    id: cat.id,
                    label: cat.name,
                    icon: <IconComponent className="w-4 h-4" style={{ color: cat.color }} />,
                    color: cat.color,
                  };
                }),
                ...(expenseCategories.length > 0 
                  ? [{ id: 'expense-sep', label: '━━━ EXPENSES ━━━', icon: null, disabled: true }] 
                  : []),
                ...expenseCategories.map(cat => {
                  const IconComponent = getIconComponent(cat.icon);
                  return {
                    id: cat.id,
                    label: cat.name,
                    icon: <IconComponent className="w-4 h-4" style={{ color: cat.color }} />,
                    color: cat.color,
                  };
                }),
              ]}
              placeholder="Select a category"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <CustomSelect
              label="Type"
              value={typeFilter}
              onChange={(value) => setTypeFilter(value)}
              options={[
                { id: 'all', label: 'All Types', icon: null },
                { id: 'income', label: 'Income Only', icon: <TrendingUp className="w-4 h-4 text-green-500" /> },
                { id: 'expense', label: 'Expense Only', icon: <TrendingDown className="w-4 h-4 text-red-500" /> },
              ]}
              placeholder="Select type"
            />
          </div>
        </div>
      )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="text-left p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Date</th>
                <th className="text-left p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Wallet</th>
                <th className="text-left p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Category</th>
                <th className="text-left p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Description</th>
                <th className="text-right p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Amount</th>
                <th className="text-center p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map(t => {
                const cat = getCategoryById(t.categoryId);
                const wallet = getWalletById(t.walletId);
                const isDebtTransaction = t.tags && (t.tags.includes('debt') || t.tags.includes('debt-payment'));
                
                return (
                  <tr 
                    key={t.id} 
                    onClick={() => handleViewDetails(t)}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200 group cursor-pointer"
                  >
                    <td className="p-4 text-sm text-white/60 font-light">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-white/30" />
                        {formatDate(t.date, 'short')}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-white/60 font-light">
                      <div className="flex items-center gap-2">
                        {wallet?.name}
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
                      <span className="text-sm font-light text-white/80">{cat?.name}</span>
                    </div>
                  </td>
                    <td className="p-4 text-sm font-light text-white/40">{t.description || '-'}</td>
                    <td className={`p-4 text-right text-sm font-light ${cat?.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                      {cat?.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleEdit(t, e)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDebtTransaction
                              ? 'text-white/20 cursor-not-allowed'
                              : 'hover:bg-white/10 text-white/40 hover:text-white opacity-0 group-hover:opacity-100'
                          }`}
                          disabled={isDebtTransaction}
                          title={isDebtTransaction ? 'Debt transactions cannot be edited' : 'Edit transaction'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(t.id, e)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDebtTransaction
                              ? 'text-white/20 cursor-not-allowed'
                              : 'hover:bg-red-500/20 text-white/40 hover:text-red-500 opacity-0 group-hover:opacity-100'
                          }`}
                          disabled={isDebtTransaction}
                          title={isDebtTransaction ? 'Debt transactions cannot be deleted directly' : 'Delete transaction'}
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

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
              <Search className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/40 text-sm font-light">No transactions found</p>
            <button
              onClick={() => {
                setEditingTransaction(null);
                setShowTransactionModal(true);
              }}
              className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light transition-all duration-300"
            >
              Add your first transaction
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-white/10">
            <p className="text-xs text-white/40 font-light">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white/[0.03] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all duration-300"
              >
                <ChevronLeft className="w-4 h-4 text-white/60" />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-light transition-all duration-300 ${
                        currentPage === pageNum
                          ? 'bg-[#6366F1] text-white'
                          : 'bg-white/[0.03] text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white/[0.03] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all duration-300"
              >
                <ChevronRight className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {showDetailModal && selectedTransaction && selectedTransactionDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md flex flex-col max-h-[85vh]">
            {/* Header - Sticky */}
            <div className="sticky top-0 z-10 bg-white/[0.03] backdrop-blur-xl rounded-t-xl">
              <div className="flex justify-between items-center p-5 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-light text-white">Transaction Details</h3>
                  <p className="text-xs text-white/40 mt-0.5 font-light">
                    {selectedTransaction.tags && (selectedTransaction.tags.includes('debt') || selectedTransaction.tags.includes('debt-payment')) 
                      ? 'Debt Transaction - Read Only' 
                      : 'View transaction information'}
                  </p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-4">
                {/* Debt Warning Badge */}
                {selectedTransaction.tags && (selectedTransaction.tags.includes('debt') || selectedTransaction.tags.includes('debt-payment')) && (
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-amber-500/80 font-light">
                          This is a debt-related transaction. To maintain data consistency, please manage it from the Debts module.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/40 font-light">Amount</p>
                    <p className={`text-xl font-light ${selectedTransactionDetails.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                      {selectedTransactionDetails.type === 'income' ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/40 font-light">Date</p>
                    <p className="text-sm font-light text-white/80">{formatDate(selectedTransaction.date, 'long')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: `${selectedTransactionDetails.color}20` }}>
                    {selectedTransactionDetails.icon}
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 font-light">Category</p>
                    <p className="text-sm font-light text-white/80">{selectedTransactionDetails.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <FileText className="w-4 h-4 text-white/40" />
                  <div>
                    <p className="text-[10px] text-white/40 font-light">Description</p>
                    <p className="text-sm font-light text-white/80">{selectedTransaction.description || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <Wallet className="w-4 h-4 text-white/40" />
                  <div>
                    <p className="text-[10px] text-white/40 font-light">Wallet</p>
                    <p className="text-sm font-light text-white/80">
                      {wallets.find(w => w.id === selectedTransaction.walletId)?.icon} {wallets.find(w => w.id === selectedTransaction.walletId)?.name}
                      {wallets.find(w => w.id === selectedTransaction.walletId)?.lastFourDigits && 
                        ` (****${wallets.find(w => w.id === selectedTransaction.walletId)?.lastFourDigits})`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Sticky */}
            <div className="sticky bottom-0 bg-white/[0.03] backdrop-blur-xl rounded-b-xl">
              <div className="flex gap-3 p-5 border-t border-white/10">
                {selectedTransaction.tags && (selectedTransaction.tags.includes('debt') || selectedTransaction.tags.includes('debt-payment')) ? (
                  // Botones para transacciones de deuda
                  <>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        navigate('/debts');
                      }}
                      className="flex-1 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-amber-500 text-sm font-light transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Go to Debts
                    </button>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  // Botones para transacciones normales
                  <>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        setEditingTransaction(selectedTransaction);
                        setShowTransactionModal(true);
                      }}
                      className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 text-sm font-light transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        handleDeleteClick(selectedTransaction.id, {} as React.MouseEvent);
                      }}
                      className="flex-1 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-500 text-sm font-light transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null);
        }}
        onSave={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null);
        }}
        editingTransaction={editingTransaction}
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