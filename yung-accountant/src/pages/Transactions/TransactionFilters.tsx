// pages/Transactions/TransactionFilters.tsx

import React from 'react';
import { Search, Filter, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import CustomSelect from '../../components/common/CustomSelect';
import { getIconComponent } from '../../utils/iconHelpers';

interface TransactionFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  sortBy: 'date' | 'amount';
  setSortBy: (value: 'date' | 'amount') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (value: 'asc' | 'desc') => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  incomeCategories: any[];
  expenseCategories: any[];
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
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
  showFilters,
  setShowFilters,
  incomeCategories,
  expenseCategories,
}) => {
  return (
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
  );
};