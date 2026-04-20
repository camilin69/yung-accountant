// pages/Transactions.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Search, 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  Filter,
  ArrowUpDown,
  Calendar as CalendarIcon,
  Sparkles
} from 'lucide-react';
import TransactionModal from '../components/modals/TransactionModal';

const Transactions: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { transactions, categories, deleteTransaction } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchParams]);

  const getCategoryById = (id: string) => categories.find(c => c.id === id);

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

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this transaction?')) {
      deleteTransaction(id);
    }
  };

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

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
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl mb-6 overflow-hidden">
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
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] text-white/40 mb-1.5 font-light">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors"
              >
                <option value="all">All Categories</option>
                {incomeCategories.length > 0 && (
                  <optgroup label="Income">
                    {incomeCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </optgroup>
                )}
                {expenseCategories.length > 0 && (
                  <optgroup label="Expenses">
                    {expenseCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] text-white/40 mb-1.5 font-light">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors"
              >
                <option value="all">All Types</option>
                <option value="income">Income Only</option>
                <option value="expense">Expense Only</option>
              </select>
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
                <th className="text-left p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Category</th>
                <th className="text-left p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Description</th>
                <th className="text-right p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Amount</th>
                <th className="text-center p-4 text-[10px] font-light text-white/40 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map(t => {
                const cat = getCategoryById(t.categoryId);
                if (!cat) return null;
                return (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200 group">
                    <td className="p-4 text-sm text-white/60 font-light">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-white/30" />
                        {formatDate(t.date, 'short')}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all duration-300 group-hover:scale-110"
                          style={{ backgroundColor: `${cat.color}20` }}
                        >
                          {cat.icon}
                        </div>
                        <span className="text-sm font-light text-white/80">{cat.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-light text-white/40">{t.description || '-'}</td>
                    <td className={`p-4 text-right text-sm font-light ${cat.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                      {cat.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => {
                            setEditingTransaction(t);
                            setShowTransactionModal(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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
    </div>
  );
};

export default Transactions;