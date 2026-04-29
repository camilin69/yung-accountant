// pages/Simulation/index.tsx
import React from 'react';
import { Plus, RefreshCw, Clock } from 'lucide-react';
import { useThemeStyles } from '../../hooks/useTheme';
import Calendar from '../../components/common/Calendar';
import SimulationDetailModal from './SimulationDetailModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { SimulationStats } from './SimulationStats';
import { SimulationTable } from './SimulationTable';
import { SimulationFormModal } from './SimulationFormModal';
import { useSimulation } from './useSimulation';
import { getIconComponent } from '../../utils/iconHelpers';

const SimulationCalendar: React.FC = () => {
  const { getGradientTextClass } = useThemeStyles();
  
  const {
    categories,
    currentDate,
    setCurrentDate,
    showModal,
    setShowModal,
    showDetailModal,
    setShowDetailModal,
    editingTransaction,
    selectedTransaction,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showResetConfirm,
    setShowResetConfirm,
    setSelectedTransaction,
    showToast,
    setShowToast,
    toastMessage,
    toastType,
    isMobile,
    isVerySmall,
    formData,
    setFormData,
    errors,
    visibleCount,
    isLoadingMore,
    sortBy,
    sortOrder,
    stats,
    allSimulations,
    sortedTransactions,
    hasMore,
    incomeCategories,
    expenseCategories,
    isStartDateSelected,
    getHeaderPadding,
    getCardPadding,
    getCardTextSize,
    getCategoryById,
    getDayTransactions,
    handleAmountChange,
    handlePeriodChange,
    handleCategoryChange,
    handleStartDateChange,
    handleEndDateChange,
    handleDaysChange,
    handleWeeksChange,
    handleMonthsChange,
    handleSubmit,
    resetForm,
    handleEdit,
    handleDelete,
    handleViewDetails,
    confirmDelete,
    handleReset,
    confirmReset,
    loadMore,
    handleSort,
  } = useSimulation();

  const weeksDisplayValue = formData.weeks > 0 ? formData.weeks.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('.', ',') : '';
  const monthsDisplayValue = formData.months > 0 ? formData.months.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('.', ',') : '';
  const modalTotalPreview = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    if (formData.period === 'day') return formData.amount * formData.days;
    if (formData.period === 'week') return formData.amount * formData.weeks;
    return formData.amount * formData.months;
  };

  const categoryOptions = [
    ...(incomeCategories.length > 0 ? [{ id: 'income-sep', label: '━━━ INCOME ━━━', icon: null, disabled: true }] : []),
    ...incomeCategories.map(cat => {
      const IconComponent = getIconComponent(cat.icon);
      return {
        id: cat.id,
        label: cat.name,
        icon: <IconComponent className="w-4 h-4" style={{ color: cat.color }} />,
        color: cat.color,
      };
    }),
    ...(expenseCategories.length > 0 ? [{ id: 'expense-sep', label: '━━━ EXPENSES ━━━', icon: null, disabled: true }] : []),
    ...expenseCategories.map(cat => {
      const IconComponent = getIconComponent(cat.icon);
      return {
        id: cat.id,
        label: cat.name,
        icon: <IconComponent className="w-4 h-4" style={{ color: cat.color }} />,
        color: cat.color,
      };
    }),
  ];

  const visibleTransactionsLength = Math.min(visibleCount, sortedTransactions.length);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--theme-background-primary)' }}>
      {/* Header */}
      <div className={`flex-shrink-0 ${getHeaderPadding()}`}>
        <div className={`flex ${isVerySmall ? 'flex-col items-start gap-2' : 'justify-between items-center'} mb-4`}>
          <div>
            <h1 className={`${isVerySmall ? 'text-xl' : (isMobile ? 'text-2xl' : 'text-3xl')} font-light tracking-tight ${getGradientTextClass()}`}>
              Simulation Calendar
            </h1>
            <p className={`${isVerySmall ? 'text-[10px]' : 'text-xs'} text-[var(--theme-text-tertiary)] mt-0.5 font-light`}>
              Simulate financial scenarios
            </p>
          </div>
          <div className={`flex gap-2 ${isVerySmall ? 'w-full' : ''}`}>
            <button
              onClick={handleReset}
              className={`group relative ${isVerySmall ? 'px-3 py-1.5 text-[11px]' : (isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm')} bg-[var(--theme-background-glass)] hover:bg-red-500/20 transition-all duration-300 text-[var(--theme-text-primary)] font-light flex items-center gap-1.5 overflow-hidden rounded-lg flex-1 justify-center border border-[var(--theme-border-light)]`}
            >
              <RefreshCw className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} group-hover:rotate-180 transition-transform duration-500`} />
              <span className={isVerySmall ? 'hidden' : 'inline'}>Reset</span>
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className={`group relative ${isVerySmall ? 'px-3 py-1.5 text-[11px]' : (isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm')} bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] transition-all duration-300 text-[var(--theme-text-primary)] font-light flex items-center gap-1.5 overflow-hidden rounded-lg flex-1 justify-center border border-[var(--theme-border-light)]`}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Plus className={`${isVerySmall ? 'w-3 h-3' : (isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4')} group-hover:rotate-90 transition-transform duration-300`} />
              <span className={isVerySmall ? 'hidden' : 'inline'}>Simulate</span>
            </button>
          </div>
        </div>

        <SimulationStats
          stats={stats}
          getCardPadding={getCardPadding}
          getCardTextSize={getCardTextSize}
          isVerySmall={isVerySmall}
          isMobile={isMobile}
        />

        <div className="flex items-center justify-between mt-2 mb-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-600" />
              <span className={`${isVerySmall ? 'text-[8px]' : 'text-[10px]'} text-[var(--theme-text-tertiary)]`}>
                {allSimulations.filter(t => getCategoryById(t.categoryId)?.type === 'income').length} Income
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-600" />
              <span className={`${isVerySmall ? 'text-[8px]' : 'text-[10px]'} text-[var(--theme-text-tertiary)]`}>
                {allSimulations.filter(t => getCategoryById(t.categoryId)?.type === 'expense').length} Expenses
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-[var(--theme-text-tertiary)]/50" />
            <span className={`${isVerySmall ? 'text-[7px]' : 'text-[9px]'} text-[var(--theme-text-tertiary)]/50`}>{allSimulations.length} active</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 px-4 pb-4">
        <Calendar
          transactions={allSimulations}
          categories={categories}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onDayClick={() => {}}
          getDayTransactions={getDayTransactions}
          getCategoryById={getCategoryById}
          isFutureDisabled={false}
          showBalance={false}
          className="w-full"
        />
      </div>

      {/* Table */}
      <div className="flex-shrink-0 px-4 pb-6">
        <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl overflow-hidden">
          <div className={`${isVerySmall ? 'p-3' : 'p-4'} border-b border-[var(--theme-border-light)]`}>
            <div className={`flex ${isVerySmall ? 'flex-col gap-2' : 'justify-between items-center'}`}>
              <h3 className="text-sm font-light text-[var(--theme-text-secondary)]">Simulated Transactions</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => handleSort('createdAt')} className={`px-2 py-1 rounded-lg text-[10px] font-light transition-all duration-200 ${sortBy === 'createdAt' ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/30' : 'bg-[var(--theme-background-glass)] text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-background-glass-hover)]'}`}>
                  Sort by Date {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
          </div>
          
          <SimulationTable
            sortedTransactions={sortedTransactions}
            visibleCount={visibleCount}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            allSimulationsLength={allSimulations.length}
            visibleTransactionsLength={visibleTransactionsLength}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loadMore={loadMore}
            getCategoryById={getCategoryById}
            isVerySmall={isVerySmall}
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Modals */}
      <SimulationFormModal
        isOpen={showModal}
        editingTransaction={editingTransaction}
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        isStartDateSelected={isStartDateSelected}
        weeksDisplayValue={weeksDisplayValue}
        monthsDisplayValue={monthsDisplayValue}
        modalTotalPreview={modalTotalPreview}
        categoryOptions={categoryOptions}
        onClose={() => { setShowModal(false); resetForm(); }}
        onSubmit={handleSubmit}
        onAmountChange={handleAmountChange}
        onPeriodChange={handlePeriodChange}
        onCategoryChange={handleCategoryChange}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onDaysChange={handleDaysChange}
        onWeeksChange={handleWeeksChange}
        onMonthsChange={handleMonthsChange}
      />

      <SimulationDetailModal 
        isOpen={showDetailModal} 
        onClose={() => { setShowDetailModal(false); setSelectedTransaction(null); }} 
        transaction={selectedTransaction} 
        category={selectedTransaction ? getCategoryById(selectedTransaction.categoryId) : null} 
      />
      
      <ConfirmModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete} title="Delete Simulation" message="Are you sure you want to delete this simulated transaction?" confirmText="Delete" type="danger" />
      <ConfirmModal isOpen={showResetConfirm} onClose={() => setShowResetConfirm(false)} onConfirm={confirmReset} title="Reset All Simulations" message="Are you sure you want to reset ALL simulation data? This action cannot be undone." confirmText="Reset All" cancelText="Cancel" type="danger" />
      <ToastNotification isOpen={showToast} onClose={() => setShowToast(false)} message={toastMessage} type={toastType} />
    </div>
  );
};

export default SimulationCalendar;