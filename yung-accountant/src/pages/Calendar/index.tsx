// pages/Calendar/index.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStyles } from '../../hooks/useTheme';
import Calendar from '../../components/common/Calendar';
import TransactionDetailModal from '../Transactions/TransactionModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { CalendarStats } from './CalendarStats';
import { DayModal } from './DayModal';
import { useCalendar } from './useCalendar';
import { Plus, RefreshCw } from 'lucide-react';

const CalendarTransactions: React.FC = () => {
  const navigate = useNavigate();
  const { getGradientTextClass } = useThemeStyles();

  const {
    transactions,
    categories,
    currentDate,
    setCurrentDate,
    showTransactionModal,
    setShowTransactionModal,
    showDayModal,
    setShowDayModal,
    showResetConfirm,
    setShowResetConfirm,
    editingTransaction,
    setEditingTransaction,
    selectedDate,
    setSelectedDate,
    showToast,
    setShowToast,
    toastMessage,
    toastType,
    isMobile,
    isVerySmall,
    selectedDateTransactions,
    getCategoryById,
    getDayTransactions,
    getMonthIncome,
    getMonthExpenses,
    currentBalance,
    handleDayClick,
    handleEditTransaction,
    handleDeleteTransaction,
    handleResetAllTransactions,
    confirmReset,
    getCardPadding,
    getHeaderPadding,
  } = useCalendar();

  const incomeCategories = categories.filter(c => c.type === 'income' && !c.isSystem);
  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.isSystem);
  
  return (
    <div className="min-h-screen w-full overflow-x-hidden pb-24">
      {/* Header */}
      <div className={`flex-shrink-0 ${getHeaderPadding()}`}>
        <div className={`flex ${isVerySmall ? 'flex-col items-start gap-3' : 'justify-between items-center'} mb-5 animate-fade-in-down`}>
          <div>
            <h1 className={`${isVerySmall ? 'text-[26px]' : (isMobile ? 'text-[30px]' : 'text-[34px]')} font-light tracking-[-0.03em]`} style={{ color: 'var(--theme-text-primary)' }}>
              Calendar
            </h1>
            <p className={`${isVerySmall ? 'text-[11px]' : 'text-[14px]'} tracking-[0.02em] mt-1`} style={{ color: 'var(--theme-text-tertiary)' }}>
              Track your daily finances
            </p>
          </div>
          <div className={`flex gap-2.5 ${isVerySmall ? 'w-full' : ''}`}>
            <button
              onClick={handleResetAllTransactions}
              className={`group ${isVerySmall ? 'px-4 py-3 text-[12px]' : (isMobile ? 'px-4 py-3 text-xs' : 'px-5 py-3 text-xs')} rounded-2xl font-medium tracking-[0.04em] uppercase flex items-center gap-2 transition-all duration-500 hover:-translate-y-1 glass-sm ${isVerySmall ? 'flex-1 justify-center' : ''}`}
              style={{ color: 'var(--theme-text-secondary)' }}
            >
              <RefreshCw className={`${isVerySmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} group-hover:rotate-180 transition-transform duration-500`} strokeWidth={1.5} />
              <span className={isVerySmall ? 'hidden' : 'inline'}>Reset</span>
            </button>
            <button
              onClick={() => {
                setSelectedDate(null);
                setEditingTransaction(null);
                setShowTransactionModal(true);
              }}
              className={`group ${isVerySmall ? 'px-4 py-3 text-[12px]' : (isMobile ? 'px-4 py-3 text-xs' : 'px-5 py-3 text-xs')} rounded-2xl font-medium tracking-[0.04em] uppercase flex items-center gap-2 transition-all duration-500 hover:-translate-y-1 active:scale-95 ${isVerySmall ? 'flex-1 justify-center' : ''}`}
              style={{ 
                backgroundColor: 'var(--theme-primary)', 
                color: '#FFFFFF',
                boxShadow: '0 4px 20px -6px var(--theme-primary)'
              }}
            >
              <Plus className={`${isVerySmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} group-hover:rotate-90 transition-transform duration-500`} strokeWidth={2.5} />
              <span className={isVerySmall ? 'hidden' : 'inline'}>Add</span>
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <CalendarStats
          currentBalance={currentBalance}
          monthIncome={getMonthIncome()}
          monthExpenses={getMonthExpenses()}
          getCardPadding={getCardPadding}
          isVerySmall={isVerySmall}
          isMobile={isMobile}
        />
      </div>

      {/* Calendario */}
      <div className="flex-1 px-4 w-full overflow-x-hidden">
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
          className="w-full"
        />
      </div>

      {/* Modales */}
      <DayModal
        isOpen={showDayModal}
        selectedDate={selectedDate}
        transactions={selectedDateTransactions}
        isVerySmall={isVerySmall}
        isMobile={isMobile}
        onClose={() => setShowDayModal(false)}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
        onAddTransaction={() => {
          setShowDayModal(false);
          setEditingTransaction(null);
          setShowTransactionModal(true);
        }}
        onGoToDebts={() => {
          setShowDayModal(false);
          navigate('/debts');
        }}
        getCategoryById={getCategoryById}
      />

      <TransactionDetailModal
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
        categories={categories}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
      />

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