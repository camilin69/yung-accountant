// pages/Goals.tsx

import React, { useState } from 'react';
import { useStore, useAvailableBalance, useTotalBalance, useGoalsAllocatedBalance } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  Plus, 
  Target, 
  Calendar, 
  TrendingUp, 
  Trash2, 
  Edit2, 
  Sparkles,
  CheckCircle,
  Wallet,
  ShoppingBag
} from 'lucide-react';
import GoalDetailModal from '../components/modals/GoalDetailModal';
import ConfirmModal from '../components/common/ConfirmModal';
import ToastNotification from '../components/common/ToastNotification';
import GoalModal from '../components/modals/GoalModal';

const Goals: React.FC = () => {
  const { goals, addGoal, updateGoal, deleteGoal, addTransaction, wallets } = useStore();
  const totalBalance = useTotalBalance();
  const allocatedToGoals = useGoalsAllocatedBalance();
  const availableBalance = useAvailableBalance();
  
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<{ id: string; name: string } | null>(null);
  const [goalToComplete, setGoalToComplete] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const totalSaved = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setToastType('success');
    setShowToast(true);
  };

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setToastType('error');
    setShowToast(true);
  };

  const handleSaveGoal = (data: any) => {
    if (editingGoal) {
      updateGoal(editingGoal.id, data);
      showSuccessToast('Goal updated successfully');
    } else {
      addGoal(data);
      showSuccessToast('Goal created successfully');
    }
    setEditingGoal(null);
  };

  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal);
    setShowGoalModal(true);
  };

  const handleDeleteGoal = () => {
    if (goalToDelete) {
      deleteGoal(goalToDelete.id);
      showSuccessToast(`Goal "${goalToDelete.name}" deleted`);
      setGoalToDelete(null);
      setShowDetailModal(false);
    }
  };

  const confirmDelete = (id: string, name: string) => {
    setGoalToDelete({ id, name });
    setShowDeleteConfirm(true);
  };

  const handleCompletePurchase = (goal: any) => {
    setGoalToComplete(goal);
    setShowCompleteConfirm(true);
  };

  const confirmCompletePurchase = () => {
    if (goalToComplete) {
      // Buscar la wallet por defecto
      const defaultWallet = wallets.find(w => w.isActive);
      
      if (!defaultWallet) {
        showErrorToast('No active wallet found. Please create a wallet first.');
        return;
      }
      
      // Crear transacción de gasto con walletId
      addTransaction({
        amount: goalToComplete.currentAmount,
        categoryId: goalToComplete.purchaseCategoryId,
        walletId: defaultWallet.id,  // ← AGREGAR walletId
        description: `Purchase: ${goalToComplete.name}`,
        date: new Date().toISOString().split('T')[0],
        tags: ['goal', 'purchase'],
      });
      
      showSuccessToast(`🎉 Goal "${goalToComplete.name}" purchased and completed!`);
      updateGoal(goalToComplete.id, { status: 'completed' });
      setGoalToComplete(null);
      setShowDetailModal(false);
    }
  };


  const handleOpenDetail = (goal: any) => {
    setSelectedGoalId(goal.id);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedGoalId(null);
  };

  // Obtener el goal actual para el modal de detalle
  const selectedGoal = selectedGoalId ? goals.find(g => g.id === selectedGoalId) : null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
            Goals
          </h1>
          <p className="text-xs text-white/40 mt-0.5 font-light">Track and achieve your financial targets</p>
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

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-[#6366F1]" />
            <span className="text-xs text-white/40">Total Balance</span>
          </div>
          <p className="text-2xl font-light text-[#6366F1]">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-white/40">In Goals</span>
          </div>
          <p className="text-2xl font-light text-yellow-500">{formatCurrency(allocatedToGoals)}</p>
        </div>
        <div className="bg-gradient-to-br from-[#1A1A2E] to-[#1A1A2E]/80 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-green-500" />
            <span className="text-xs text-white/40">Available</span>
          </div>
          <p className="text-2xl font-light text-green-500">{formatCurrency(availableBalance)}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-[#6366F1]/80" />
            <span className="text-xs text-white/40">Active Goals</span>
          </div>
          <p className="text-2xl font-light text-white">{activeGoals.length}</p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500/80" />
            <span className="text-xs text-white/40">Total Saved</span>
          </div>
          <p className="text-2xl font-light text-green-500">{formatCurrency(totalSaved)}</p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-yellow-500/80" />
            <span className="text-xs text-white/40">Overall Progress</span>
          </div>
          <p className="text-2xl font-light text-yellow-500">
            {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-light text-white/60 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Active Goals
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeGoals.map(goal => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              const remaining = goal.targetAmount - goal.currentAmount;
              const isCompleted = progress >= 100;
              const priorityColor = goal.priority === 'high' ? 'text-red-500/80 bg-red-500/10' : 
                                   goal.priority === 'medium' ? 'text-yellow-500/80 bg-yellow-500/10' : 
                                   'text-green-500/80 bg-green-500/10';
              
              return (
                <div 
                  key={goal.id} 
                  onClick={() => handleOpenDetail(goal)}
                  className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5 transition-all duration-300 hover:bg-white/[0.06] hover:scale-[1.02] cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-base font-light text-white">{goal.name}</h3>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditGoal(goal)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => confirmDelete(goal.id, goal.name)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${priorityColor}`}>
                      {goal.priority}
                    </span>
                    {goal.context && (
                      <span className="text-[10px] text-white/30">{goal.context}</span>
                    )}
                  </div>
                  
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-white/40">Saved: {formatCurrency(goal.currentAmount)}</span>
                    <span className="text-white/40">Target: {formatCurrency(goal.targetAmount)}</span>
                  </div>
                  
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
                    <div 
                      className="h-full bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-[10px] text-white/40 mb-4">
                    <span>{Math.round(progress)}% complete</span>
                    <span>{formatCurrency(remaining)} left</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] text-white/30 mb-4">
                    <Calendar className="w-3 h-3" />
                    Deadline: {formatDate(goal.targetDate, 'long')}
                  </div>

                  {/* Complete Purchase Button - Solo visible cuando la meta está al 100% */}
                  {isCompleted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompletePurchase(goal);
                      }}
                      className="w-full py-2 rounded-lg text-xs font-light flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r from-[#6366F1] to-[#EC4899] text-white hover:scale-[1.02]"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      Complete Purchase
                    </button>
                  )}
                </div>
              );
            })}
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
              <div 
                key={goal.id} 
                onClick={() => handleOpenDetail(goal)}
                className="bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-xl p-5 opacity-70 hover:opacity-100 transition-all duration-300 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500/60" />
                    <h3 className="text-base font-light text-white/60 line-through">{goal.name}</h3>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => confirmDelete(goal.id, goal.name)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-white/30">Completed: {formatCurrency(goal.currentAmount)}</span>
                  <span className="text-white/30">Target: {formatCurrency(goal.targetAmount)}</span>
                </div>
                
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full w-full" />
                </div>
                
                <div className="flex items-center gap-2 text-[10px] text-white/20">
                  <Calendar className="w-3 h-3" />
                  Completed: {formatDate(goal.completedAt || goal.targetDate, 'long')}
                </div>
              </div>
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