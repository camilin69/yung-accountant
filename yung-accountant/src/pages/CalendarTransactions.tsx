// pages/CalendarTransactions.tsx

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Plus, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  X, 
  Edit2, 
  Trash2,
  RefreshCw,
  Calendar as CalendarIcon
} from 'lucide-react';
import Calendar from '../components/common/Calendar';
import TransactionModal from '../components/modals/TransactionModal';
import ConfirmModal from '../components/common/ConfirmModal';
import ToastNotification from '../components/common/ToastNotification';

const CalendarTransactions: React.FC = () => {
  const { transactions, categories, deleteTransaction, setTransactions } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const getCategoryById = (id: string) => categories.find(c => c.id === id);
  const getDayTransactions = (date: string) => transactions.filter(t => t.date === date);

  const getMonthIncome = () => {
    const startDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
    return transactions
      .filter(t => {
        const cat = getCategoryById(t.categoryId);
        return cat?.type === 'income' && t.date >= startDate && t.date <= endDate;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getMonthExpenses = () => {
    const startDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
    return transactions
      .filter(t => {
        const cat = getCategoryById(t.categoryId);
        return cat?.type === 'expense' && t.date >= startDate && t.date <= endDate;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const currentBalance = getMonthIncome() - getMonthExpenses();
  const savingsRate = getMonthIncome() > 0 ? (currentBalance / getMonthIncome()) * 100 : 0;

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setShowDayModal(true);
  };

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setShowDayModal(false);
    setShowTransactionModal(true);
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('Delete this transaction?')) {
      deleteTransaction(id);
      setToastMessage('Transaction deleted successfully');
      setToastType('success');
      setShowToast(true);
    }
  };

  const handleResetAllTransactions = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setTransactions([]);
    setToastMessage('All transactions have been reset');
    setToastType('success');
    setShowToast(true);
    setShowResetConfirm(false);
  };

  const selectedDateTransactions = selectedDate
    ? transactions.filter(t => t.date === selectedDate)
    : [];

  const selectedDateIncome = selectedDateTransactions.filter(t => {
    const cat = getCategoryById(t.categoryId);
    return cat?.type === 'income';
  }).reduce((sum, t) => sum + t.amount, 0);

  const selectedDateExpenses = selectedDateTransactions.filter(t => {
    const cat = getCategoryById(t.categoryId);
    return cat?.type === 'expense';
  }).reduce((sum, t) => sum + t.amount, 0);

  const selectedDateBalance = selectedDateIncome - selectedDateExpenses;

  return (
    <div className="h-screen flex flex-col bg-[#0F0F1A] overflow-hidden">
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
              Calendar
            </h1>
            <p className="text-xs text-white/40 mt-0.5 font-light">Track your daily finances</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleResetAllTransactions}
              className="group relative px-4 py-2 bg-white/5 hover:bg-red-500/20 transition-all duration-300 text-white text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg"
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              Reset All
            </button>
            <button
              onClick={() => {
                setSelectedDate(null);
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
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3">
            <Wallet className="w-3.5 h-3.5 text-white/60 mb-1" />
            <p className="text-lg font-light text-white">{formatCurrency(currentBalance)}</p>
            <p className="text-[10px] text-white/40 mt-0.5 font-light">Net Balance</p>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3">
            <TrendingUp className="w-3.5 h-3.5 text-green-500/80 mb-1" />
            <p className="text-lg font-light text-green-500">+{formatCurrency(getMonthIncome())}</p>
            <p className="text-[10px] text-white/40 mt-0.5 font-light">Total Income</p>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3">
            <TrendingDown className="w-3.5 h-3.5 text-red-500/80 mb-1" />
            <p className="text-lg font-light text-red-500">-{formatCurrency(getMonthExpenses())}</p>
            <p className="text-[10px] text-white/40 mt-0.5 font-light">Total Expenses</p>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-3">
            <Sparkles className="w-3.5 h-3.5 text-[#6366F1]/80 mb-1" />
            <p className="text-lg font-light text-[#6366F1]">{Math.round(savingsRate)}%</p>
            <p className="text-[10px] text-white/40 mt-0.5 font-light">Savings Rate</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pb-6">
        <Calendar
          transactions={transactions}
          categories={categories}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onDayClick={handleDayClick}
          getDayTransactions={getDayTransactions}
          getCategoryById={getCategoryById}
          isFutureDisabled={true}
          showBalance={true}
          className="h-full"
        />
      </div>

      {/* Day Detail Modal */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-light text-white">{formatDate(selectedDate, 'long')}</h3>
                <p className="text-[10px] text-white/40 mt-0.5 font-light">Daily transactions</p>
              </div>
              <button onClick={() => setShowDayModal(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[55vh] space-y-2">
              {selectedDateTransactions.map(t => {
                const cat = getCategoryById(t.categoryId);
                if (!cat) return null;
                return (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-white/5 group">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        {cat.icon}
                      </div>
                      <div>
                        <p className="text-sm font-light text-white">{cat.name}</p>
                        <p className="text-[10px] text-white/40">{t.description || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className={`text-sm font-light ${cat.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                        {cat.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </p>
                      <button
                        onClick={() => handleEditTransaction(t)}
                        className="p-1 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-white/60 hover:text-white" />
                      </button>
                      <button
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="p-1 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white/40 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {selectedDateTransactions.length === 0 && (
                <div className="text-center py-6">
                  <div className="w-10 h-10 mx-auto mb-2 bg-white/[0.03] flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-white/20" />
                  </div>
                  <p className="text-white/40 text-xs font-light">No transactions for this day</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => {
                  setShowDayModal(false);
                  setEditingTransaction(null);
                  setShowTransactionModal(true);
                }}
                className="w-full py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center justify-center gap-2 group"
              >
                <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
                Add Transaction
              </button>
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
          setSelectedDate(null);
        }}
        onSave={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null);
          setSelectedDate(null);
        }}
        editingTransaction={editingTransaction}
        defaultDate={selectedDate || undefined}
      />

      {/* Confirm Reset Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={confirmReset}
        title="Reset All Transactions"
        message="Are you sure you want to reset ALL transactions? This action cannot be undone and all your financial data will be lost."
        confirmText="Reset All"
        cancelText="Cancel"
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

export default CalendarTransactions;