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
import { formatCurrency } from '../../utils/formatters';

const Goals: React.FC = () => {
  const {
    goals,
    // Estados
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
    goalToComplete,
    showToast,
    setShowToast,
    toastMessage,
    toastType,
    // Datos derivados
    activeGoals,
    completedGoals,
    totalSaved,
    totalTarget,
    totalBalance,
    allocatedToGoals,
    availableBalance,
    selectedGoal,
    // Funciones
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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
            Goals
          </h1>
          <p className="text-xs text-white/40 mt-0.5 font-light">
            Track and achieve your financial targets, system of savings on promise
          </p>
        </div>
        <button
          onClick={() => {
            setEditingGoal(null);
            setShowGoalModal(true);
          }}
          className="group relative px-4 py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          New Goal
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
          <h2 className="text-sm font-light text-white/60 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Active Goals
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
          <h2 className="text-sm font-light text-white/40 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Completed Goals 🎉
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {completedGoals.map(goal => (
              <CompletedGoalCard
                key={goal.id}
                goal={goal}
                onDelete={confirmDelete}
                onOpenDetail={handleOpenDetail}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
          <Target className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <p className="text-white/40 text-sm font-light">No goals yet</p>
          <p className="text-white/30 text-xs mt-1">Start by setting your first financial goal</p>
          <button
            onClick={() => setShowGoalModal(true)}
            className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light transition-all duration-300 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Your First Goal
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
        title="Delete Goal"
        message={`Are you sure you want to delete "${goalToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />

      <ConfirmModal
        isOpen={showCompleteConfirm}
        onClose={() => setShowCompleteConfirm(false)}
        onConfirm={confirmCompletePurchase}
        title="Complete Purchase"
        message={`Are you sure you want to complete the purchase of "${goalToComplete?.name}" for ${formatCurrency(goalToComplete?.currentAmount || 0)}? This will create a transaction and mark the goal as completed.`}
        confirmText="Complete Purchase"
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