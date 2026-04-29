// pages/Calendar/index.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, useThemeStyles } from '../../hooks/useTheme';
import Calendar from '../../components/common/Calendar';
import TransactionDetailModal from '../Transactions/TransactionDetailModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { CalendarStats } from './CalendarStats';
import { DayModal } from './DayModal';
import { useCalendar } from './useCalendar';
import { Plus, RefreshCw } from 'lucide-react';

const CalendarTransactions: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole } = useTheme();
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

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* Header */}
      <div className={`flex-shrink-0 ${getHeaderPadding()}`}>
        <div className={`flex ${isVerySmall ? 'flex-col items-start gap-2' : 'justify-between items-center'} mb-3`}>
          <div>
            <h1 className={`${isVerySmall ? 'text-xl' : (isMobile ? 'text-2xl' : 'text-3xl')} font-light tracking-tight ${getGradientTextClass()}`}>
              Calendar
            </h1>
            <p className={`${isVerySmall ? 'text-[10px]' : 'text-xs'} text-[var(--theme-text-tertiary)] mt-0.5 font-light`}>
              Track your daily finances
            </p>
          </div>
          <div className={`flex gap-2 ${isVerySmall ? 'w-full' : ''}`}>
            <button
              onClick={handleResetAllTransactions}
              className={`group relative ${isVerySmall ? 'px-3 py-1.5 text-[11px]' : (isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm')} bg-[var(--theme-background-glass)] hover:bg-red-500/20 transition-all duration-300 text-[var(--theme-text-primary)] font-light flex items-center gap-1.5 overflow-hidden rounded-lg flex-1 justify-center border border-[var(--theme-border-light)]`}
            >
              <RefreshCw className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} group-hover:rotate-180 transition-transform duration-500`} />
              <span className={isVerySmall ? 'hidden' : 'inline'}>Reset</span>
            </button>
            <button
              onClick={() => {
                setSelectedDate(null);
                setEditingTransaction(null);
                setShowTransactionModal(true);
              }}
              className={`group relative ${isVerySmall ? 'px-3 py-1.5 text-[11px]' : (isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm')} bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] transition-all duration-300 text-[var(--theme-text-primary)] font-light flex items-center gap-1.5 overflow-hidden rounded-lg flex-1 justify-center border border-[var(--theme-border-light)]`}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Plus className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} group-hover:rotate-90 transition-transform duration-300`} />
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

      {/* Calendario - Contenedor que evita desbordes */}
      <div className="flex-1 px-4 pb-6 w-full overflow-x-hidden">
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

      {/* Modales... */}
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