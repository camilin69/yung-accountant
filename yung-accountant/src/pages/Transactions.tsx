// pages/Transactions.tsx

import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, getCategoryIcon } from '../utils/formatters';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Download, 
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Receipt
} from 'lucide-react';
import TransactionModal from '../components/modals/TransactionModal';

const Transactions: React.FC = () => {
  const { transactions, addTransaction, deleteTransaction } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  [categoryFilter, setCategoryFilter]
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const itemsPerPage = 10;

  const categories = ['all', 'Income', 'Food', 'Transport', 'Weed', 'Entertainment', 'Savings', 'Health', 'Education'];

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Search
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => 
        typeFilter === 'income' ? t.isIncome : !t.isIncome
      );
    }

    // Sort
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

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    totalIncome: transactions.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0),
    totalExpenses: transactions.filter(t => !t.isIncome).reduce((s, t) => s + t.amount, 0),
    count: transactions.length,
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this transaction?')) {
      deleteTransaction(id);
    }
  };

  const handleAddTransaction = (data: any) => {
    addTransaction(data);
    setShowModal(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#6C63FF] to-[#FF6584] bg-clip-text text-transparent">
            Transactions History
          </h1>
          <p className="text-gray-500 mt-1">Track and manage all your financial movements</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add Transaction
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1A1A2E] rounded-xl p-4 border border-white/5">
          <p className="text-sm text-gray-500">Total Transactions</p>
          <p className="text-2xl font-bold text-white">{stats.count}</p>
        </div>
        <div className="bg-[#1A1A2E] rounded-xl p-4 border border-white/5">
          <p className="text-sm text-gray-500">Total Income</p>
          <p className="text-2xl font-bold text-green-500">+{formatCurrency(stats.totalIncome)}</p>
        </div>
        <div className="bg-[#1A1A2E] rounded-xl p-4 border border-white/5">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-500">-{formatCurrency(stats.totalExpenses)}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#1A1A2E] rounded-xl p-4 border border-white/5 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0F0F1A] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[#6C63FF]"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-[#0F0F1A] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[#6C63FF]"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-[#0F0F1A] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[#6C63FF]"
          >
            <option value="all">All Types</option>
            <option value="income">Income Only</option>
            <option value="expense">Expense Only</option>
          </select>

          {/* Sort */}
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
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                sortBy === 'date' ? 'bg-[#6C63FF]/20 text-[#6C63FF]' : 'bg-[#0F0F1A] text-gray-400'
              }`}
            >
              <ArrowUpDown className="w-3 h-3" />
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
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                sortBy === 'amount' ? 'bg-[#6C63FF]/20 text-[#6C63FF]' : 'bg-[#0F0F1A] text-gray-400'
              }`}
            >
              <ArrowUpDown className="w-3 h-3" />
              Amount {sortBy === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#1A1A2E] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-[#0F0F1A]">
                <th className="text-left p-4 text-sm font-medium text-gray-500">Date</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Description</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Category</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-center p-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map(t => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-sm">{formatDate(t.date, 'long')}</td>
                  <td className="p-4 text-sm">{t.description || '-'}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                      t.isIncome ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      <span>{getCategoryIcon(t.category)}</span>
                      {t.category}
                    </span>
                  </td>
                  <td className={`p-4 text-right text-sm font-semibold ${t.isIncome ? 'text-green-500' : 'text-red-500'}`}>
                    {t.isIncome ? '+' : '-'} {formatCurrency(t.amount)}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-500">No transactions found</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary mt-4">
              <Plus className="w-4 h-4" /> Add your first transaction
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-white/10">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-[#0F0F1A] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 rounded-lg bg-[#6C63FF]/20 text-[#6C63FF] text-sm">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-[#0F0F1A] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1A1A2E] rounded-xl max-w-md w-[90%] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Add Transaction</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <TransactionModal
              onClose={() => setShowModal(false)}
              onSave={handleAddTransaction}
              defaultDate={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;