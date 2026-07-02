// pages/Simulation/index.tsx
import React from 'react';
import { Plus, RefreshCw, Clock } from 'lucide-react';
import Calendar from '../../components/common/Calendar';
import SimulationDetailModal from './SimulationDetailModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { SimulationStats } from './SimulationStats';
import { SimulationTable } from './SimulationTable';
import { SimulationFormModal } from './SimulationFormModal';
import { useSimulation } from './useSimulation';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import CachedBadge from '../../components/common/CachedBadge';
import { getIconComponent } from '../../utils/iconHelpers';

const SimulationCalendar: React.FC = () => {
  
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

  useDocumentTitle('Simulation');

  const weeksDisplayValue = formData.weeks > 0 ? formData.weeks.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('.', ',') : '';
  const monthsDisplayValue = formData.months > 0 ? formData.months.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('.', ',') : '';
  const modalTotalPreview = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    if (formData.period === 'day') return formData.amount * formData.days;
    if (formData.period === 'week') return formData.amount * formData.weeks;
    return formData.amount * formData.months;
  };

  const categoryOptions = [
    ...(incomeCategories.length > 0 ? [{ id: 'income-sep', label: 'INCOME', icon: null, disabled: true }] : []),
    ...incomeCategories.map(cat => {
      const IconComponent = getIconComponent(cat.icon);
      return { id: cat.id, label: cat.name, icon: <IconComponent className="w-4 h-4" style={{ color: cat.color }} />, color: cat.color };
    }),
    ...(expenseCategories.length > 0 ? [{ id: 'expense-sep', label: 'EXPENSES', icon: null, disabled: true }] : []),
    ...expenseCategories.map(cat => {
      const IconComponent = getIconComponent(cat.icon);
      return { id: cat.id, label: cat.name, icon: <IconComponent className="w-4 h-4" style={{ color: cat.color }} />, color: cat.color };
    }),
  ];

  const visibleTransactionsLength = Math.min(visibleCount, sortedTransactions.length);

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ backgroundColor: 'transparent' }}>
      {/* Header */}
      <div className={`flex-shrink-0 ${getHeaderPadding()}`}>
        <div className={`flex ${isVerySmall ? 'flex-col items-start gap-3' : 'justify-between items-center'} mb-5 animate-fade-in-down`}>
          <div>
            <h1 className={`${isVerySmall ? 'text-[26px]' : (isMobile ? 'text-[30px]' : 'text-[34px]')} font-light tracking-[-0.03em]`} style={{ color: 'var(--theme-text-primary)' }}>
              Simulation Calendar <CachedBadge />
            </h1>
            <p className={`${isVerySmall ? 'text-[11px]' : 'text-[14px]'} tracking-[0.02em] mt-1`} style={{ color: 'var(--theme-text-tertiary)' }}>
              Simulate financial scenarios
            </p>
          </div>
          <div className={`flex gap-2.5 ${isVerySmall ? 'w-full' : ''}`}>
            <button
              onClick={handleReset}
              className={`group ${isVerySmall ? 'px-4 py-3 text-[12px]' : (isMobile ? 'px-4 py-3 text-xs' : 'px-5 py-3 text-xs')} rounded-2xl font-medium tracking-[0.04em] uppercase flex items-center gap-2 transition-all duration-500 hover:-translate-y-1 glass-sm ${isVerySmall ? 'flex-1 justify-center' : ''}`}
              style={{ color: 'var(--theme-text-secondary)' }}
            >
              <RefreshCw className={`${isVerySmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} group-hover:rotate-180 transition-transform duration-500`} strokeWidth={1.5} />
              <span className={isVerySmall ? 'hidden' : 'inline'}>Reset</span>
            </button>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className={`group ${isVerySmall ? 'px-4 py-3 text-[12px]' : (isMobile ? 'px-4 py-3 text-xs' : 'px-5 py-3 text-xs')} rounded-2xl font-medium tracking-[0.04em] uppercase flex items-center gap-2 transition-all duration-500 hover:-translate-y-1 active:scale-95 ${isVerySmall ? 'flex-1 justify-center' : ''}`}
              style={{ backgroundColor: 'var(--theme-primary)', color: '#FFFFFF', boxShadow: '0 4px 20px -6px var(--theme-primary)' }}
            >
              <Plus className={`${isVerySmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} transition-transform duration-500 hover:rotate-90`} strokeWidth={2.5} />
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

        <div className="flex items-center justify-between mt-3 mb-3">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--semantic-income)' }} />
              <span className={`${isVerySmall ? 'text-[9px]' : 'text-[11px]'} font-medium`} style={{ color: 'var(--theme-text-tertiary)' }}>
                {allSimulations.filter(t => getCategoryById(t.categoryId)?.type === 'income').length} Income
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--semantic-expense)' }} />
              <span className={`${isVerySmall ? 'text-[9px]' : 'text-[11px]'} font-medium`} style={{ color: 'var(--theme-text-tertiary)' }}>
                {allSimulations.filter(t => getCategoryById(t.categoryId)?.type === 'expense').length} Expenses
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }} strokeWidth={1.5} />
            <span className={`${isVerySmall ? 'text-[8px]' : 'text-[10px]'} font-medium`} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.55 }}>{allSimulations.length} active</span>
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
        <div className="rounded-[2rem] overflow-hidden glass-md animate-fade-in-up">
          <div className={`${isVerySmall ? 'p-3' : 'p-5'}`} style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
            <div className={`flex ${isVerySmall ? 'flex-col gap-2' : 'justify-between items-center'}`}>
              <h3 className="text-sm font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-secondary)' }}>Simulated Transactions</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleSort('createdAt')} 
                  className={`px-4 py-2 rounded-2xl text-[11px] font-medium transition-all duration-500 hover:-translate-y-0.5 ${
                    sortBy === 'createdAt' ? 'glass-md' : 'glass-sm'
                  }`}
                  style={{ color: sortBy === 'createdAt' ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }}
                >
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