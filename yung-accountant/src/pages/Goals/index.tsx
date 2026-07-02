// pages/Goals/index.tsx
import React from 'react';
import { Plus, ShoppingBag, Sparkles, Target } from 'lucide-react';
import GoalDetailModal from './GoalDetailModal';
import GoalModal from './GoalModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { GoalCard } from './GoalCard';
import { CompletedGoalCard } from './CompletedGoalCard';
import { GoalStats } from './GoalStats';
import { useGoals } from './useGoals';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import CachedBadge from '../../components/common/CachedBadge';
import { useTranslation } from '../../i18n';

const Goals: React.FC = () => {
  const { t } = useTranslation();

  useDocumentTitle(t('goals.title'));

  const {
    goals,
    showGoalModal,
    setShowGoalModal,
    showDetailModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showCompleteConfirm,
    setShowCompleteConfirm,
    editingGoal,
    setEditingGoal,
    selectedGoalId,
    goalToDelete,
    showToast,
    setShowToast,
    toastMessage,
    toastType,
    activeGoals,
    completedGoals,
    totalSaved,
    totalTarget,
    totalBalance,
    allocatedToGoals,
    availableBalance,
    selectedGoal,
    handleSaveGoal,
    handleEditGoal,
    handleDeleteGoal,
    confirmDelete,
    handleCompletePurchase,
    confirmCompletePurchase,
    handleOpenDetail,
    handleCloseDetailModal,
  } = useGoals();

  return (
    <div className="max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-10 pt-4 animate-fade-in-down">
        <div>
          <h1 className="text-[34px] font-light tracking-[-0.03em]" style={{ color: 'var(--theme-text-primary)' }}>
            {t('goals.title')} <CachedBadge />
          </h1>
          <p className="text-[14px] mt-1.5 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
            {t('goals.subtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingGoal(null);
            setShowGoalModal(true);
          }}
          className="px-5 py-3 rounded-2xl text-[12px] font-medium tracking-[0.04em] uppercase flex items-center gap-2.5 transition-all duration-500 hover:-translate-y-1 active:scale-95"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: '#FFFFFF',
            boxShadow: '0 4px 20px -6px var(--theme-primary)'
          }}
        >
          <Plus className="w-4 h-4 transition-transform duration-500 hover:rotate-90" strokeWidth={2.5} />
          {t('goals.newGoal')}
        </button>
      </div>

      {/* Stats */}
      <GoalStats
        totalBalance={totalBalance}
        allocatedToGoals={allocatedToGoals}
        availableBalance={availableBalance}
        totalSaved={totalSaved}
        totalTarget={totalTarget}
        activeGoalsCount={activeGoals.length}
      />

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="mb-10">
          <h2 className="text-[15px] font-medium tracking-[0.02em] mb-5 flex items-center gap-3" style={{ color: 'var(--theme-text-secondary)' }}>
            <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center glass-sm">
              <Target className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />
            </div>
            {t('goals.active')} {t('goals.title')}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={handleEditGoal}
                onDelete={confirmDelete}
                onCompletePurchase={handleCompletePurchase}
                onOpenDetail={handleOpenDetail}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-[15px] font-medium tracking-[0.02em] mb-5 flex items-center gap-3" style={{ color: 'var(--theme-text-tertiary)' }}>
            <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center glass-sm">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
            </div>
            {t('goals.completed')} {t('goals.title')}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {completedGoals.map(goal => (
              <CompletedGoalCard
                key={goal.id}
                goal={goal}
                onOpenDetail={handleOpenDetail}
                onDelete={confirmDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <div className="rounded-[2.5rem] p-16 text-center glass-aero animate-fade-in-up">
          <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 glass-sm">
            <Target className="w-10 h-10" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.25 }} strokeWidth={1} />
          </div>
          <p className="text-[18px] font-light tracking-[-0.02em] mb-2" style={{ color: 'var(--theme-text-primary)' }}>{t('goals.noGoals')}</p>
          <p className="text-[14px] tracking-[0.03em] mb-7" style={{ color: 'var(--theme-text-tertiary)' }}>
            {t('goals.createFirst')}
          </p>
          <button
            onClick={() => setShowGoalModal(true)}
            className="px-7 py-3.5 rounded-2xl text-[13px] font-medium tracking-[0.04em] uppercase inline-flex items-center gap-2.5 transition-all duration-500 hover:-translate-y-1 active:scale-95"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: '#FFFFFF',
              boxShadow: '0 4px 24px -6px var(--theme-primary)'
            }}
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            {t('goals.createFirst')}
          </button>
        </div>
      )}

      {/* Modals */}
      <GoalModal
        isOpen={showGoalModal}
        onClose={() => {
          setShowGoalModal(false);
          setEditingGoal(null);
        }}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
      />

      <GoalDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        goalId={selectedGoalId}
        onEdit={() => {
          if (selectedGoal) {
            handleCloseDetailModal();
            handleEditGoal(selectedGoal);
          }
        }}
        onDelete={() => {
          if (selectedGoal) {
            handleCloseDetailModal();
            confirmDelete(selectedGoal.id, selectedGoal.name);
          }
        }}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteGoal}
        title={t('goals.deleteGoal')}
        message={
          goals.find(g => g.id === goalToDelete?.id)?.status === 'completed'
            ? `Are you sure you want to delete "${goalToDelete?.name}"? ALL associated transactions will be permanently deleted. This action cannot be undone.`
            : t('goals.confirmDelete')
        }
        confirmText={goals.find(g => g.id === goalToDelete?.id)?.status === 'completed' ? t('goals.deleteGoal') : t('common.delete')}
        type="danger"
      />

      <ConfirmModal
        isOpen={showCompleteConfirm}
        onClose={() => setShowCompleteConfirm(false)}
        onConfirm={confirmCompletePurchase}
        title={t('goals.completeGoal')}
        message={t('goals.confirmComplete')}
        confirmText={t('goals.completeGoal')}
        type="success"
        icon={<ShoppingBag className="w-5 h-5" />}
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

export default Goals;