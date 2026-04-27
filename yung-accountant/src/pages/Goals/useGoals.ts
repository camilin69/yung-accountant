// pages/Goals/useGoals.ts

import { useState } from 'react';
import { useGoalStore, useTransactionStore, useWalletStore, useTotalBalance, useGoalsAllocatedBalance, useAvailableBalance } from '../../store';

export const useGoals = () => {
  const { goals, addGoal, updateGoal, deleteGoal } = useGoalStore();
  const { addTransaction } = useTransactionStore();
  const { wallets } = useWalletStore();
  
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

  const selectedGoal = selectedGoalId ? goals.find(g => g.id === selectedGoalId) : null;

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
      const defaultWallet = wallets.find(w => w.isActive);
      
      if (!defaultWallet) {
        showErrorToast('No active wallet found. Please create a wallet first.');
        return;
      }
      
      addTransaction({
        amount: goalToComplete.currentAmount,
        categoryId: goalToComplete.purchaseCategoryId,
        walletId: defaultWallet.id,
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

  return {
    // Estados
    goals,
    showGoalModal,
    setShowGoalModal,
    showDetailModal,
    setShowDetailModal,
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
    setToastMessage,
    toastType,
    setToastType,
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
    showSuccessToast,
    showErrorToast,
    handleSaveGoal,
    handleEditGoal,
    handleDeleteGoal,
    confirmDelete,
    handleCompletePurchase,
    confirmCompletePurchase,
    handleOpenDetail,
    handleCloseDetailModal,
  };
};