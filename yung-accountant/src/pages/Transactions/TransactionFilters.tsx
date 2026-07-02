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
  searchTerm, setSearchTerm, categoryFilter, setCategoryFilter,
  typeFilter, setTypeFilter, sortBy, setSortBy, sortOrder, setSortOrder,
  showFilters, setShowFilters, incomeCategories, expenseCategories,
}) => {
  const hasActiveFilters = categoryFilter !== 'all' || typeFilter !== 'all';

  return (
    <div className="rounded-[2rem] overflow-hidden mb-8 glass-md animate-fade-in-up">
      <div className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 glass-sm"
              style={{ color: 'var(--theme-text-primary)', fontWeight: 400 }}
            />
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-500 hover:-translate-y-0.5 flex items-center gap-2 glass-sm"
          style={{ color: hasActiveFilters ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
          )}
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (sortBy === 'date') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              else { setSortBy('date'); setSortOrder('desc'); }
            }}
            className={`px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-500 hover:-translate-y-0.5 flex items-center gap-2 ${
              sortBy === 'date' ? 'glass-md' : 'glass-sm'
            }`}
            style={{ color: sortBy === 'date' ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Date {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
          <button
            onClick={() => {
              if (sortBy === 'amount') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              else { setSortBy('amount'); setSortOrder('desc'); }
            }}
            className={`px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-500 hover:-translate-y-0.5 flex items-center gap-2 ${
              sortBy === 'amount' ? 'glass-md' : 'glass-sm'
            }`}
            style={{ color: sortBy === 'amount' ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Amount {sortBy === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="p-4 flex flex-wrap gap-4" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          <div className="flex-1 min-w-[200px]">
            <CustomSelect
              label="Category"
              value={categoryFilter}
              onChange={(value) => setCategoryFilter(value)}
              options={[
                { id: 'all', label: 'All Categories', icon: null },
                ...(incomeCategories.length > 0 
                  ? [{ id: 'income-sep', label: 'INCOME', icon: null, disabled: true }] 
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
                  ? [{ id: 'expense-sep', label: 'EXPENSES', icon: null, disabled: true }] 
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
                { id: 'income', label: 'Income Only', icon: <TrendingUp className="w-4 h-4" style={{ color: 'var(--semantic-income)' }} /> },
                { id: 'expense', label: 'Expense Only', icon: <TrendingDown className="w-4 h-4" style={{ color: 'var(--semantic-expense)' }} /> },
              ]}
              placeholder="Select type"
            />
          </div>
        </div>
      )}
    </div>
  );
};