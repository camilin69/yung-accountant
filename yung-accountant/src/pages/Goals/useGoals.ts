// pages/Goals/useGoals.ts

import { useEffect, useRef, useState } from 'react';
import { useGoalStore, useTransactionStore, useWalletStore, useTotalBalance, useGoalsAllocatedBalance, useAvailableBalance } from '../../store';
import { isOffline } from '../../services/offlineHelper';
import { getLocalDateString } from '../../utils/formatters';
import { useTranslation } from '../../i18n';

export const useGoals = () => {
  const { t } = useTranslation();
  const { goals, addGoal, updateGoal, deleteGoal, isLoading : isGoalsLoading, fetchGoals } = useGoalStore();
  const { addTransaction } = useTransactionStore();
  const { wallets, isLoading : isWalletsLoading, fetchWallets } = useWalletStore();
  const goalsFetchedRef = useRef(false);
  const walletsFetchedRef = useRef(false);

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

  useEffect(() => {
    if (!goalsFetchedRef.current && goals.length === 0 && !isGoalsLoading) {
      goalsFetchedRef.current = true;
      if (!isOffline() || goals.length === 0) {
        fetchGoals();
      }
    }
    if(!walletsFetchedRef.current && wallets.length === 0 && !isWalletsLoading) {
      walletsFetchedRef.current = true;
      if (!isOffline() || wallets.length === 0) {
        fetchWallets();
      }
    }
  }, []);

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

  const handleSaveGoal = async (data: any) => {
    if (editingGoal) {
      await updateGoal(editingGoal.id, data);
      showSuccessToast(t('goals.updated'));
    } else {
      await addGoal(data);
      showSuccessToast(t('goals.created'));
    }
    setEditingGoal(null);
  };

  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal);
    setShowGoalModal(true);
  };

  const handleDeleteGoal = async () => {
    if (goalToDelete) {
        await deleteGoal(goalToDelete.id);

        // Refrescar datos
        const { fetchWallets } = useWalletStore.getState();
        const { fetchTransactions } = useTransactionStore.getState();
        const { fetchGoals } = useGoalStore.getState();
        await fetchGoals(true);
        await fetchWallets(true);
        await fetchTransactions(true);

        showSuccessToast(t('goals.deleted'));
        setGoalToDelete(null);
        setShowDetailModal(false);
    }
  };

  const confirmDelete = (id: string, name: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    const hasTransactions = goal.transactions && goal.transactions.length > 0;

    // Si esta activo y tiene transacciones -> bloquear
    if (goal.status === 'active' && hasTransactions) {
        setToastMessage(`Cannot delete "${name}". You must delete all ${goal.transactions?.length} transaction(s) first.`);
        setToastType('warning');
        setShowToast(true);
        return;
    }

    // Si esta completado o no tiene transacciones -> permitir
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
        date: getLocalDateString(),
        tags: ['goal', 'purchase'],
      });

      showSuccessToast(`Goal "${goalToComplete.name}" purchased and completed!`);
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
    isGoalsLoading,
  };
};