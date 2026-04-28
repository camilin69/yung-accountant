// pages/Wallets/useWallets.ts

import { useState, useMemo } from 'react';
import { useWalletStore, useTransactionStore, useCategoryStore } from '../../store';
import { walletTypes, getWalletIconString } from './constants';

export const useWallets = () => {
  const { wallets, addWallet, updateWallet, deleteWallet } = useWalletStore();
  const { transactions } = useTransactionStore();
  const { categories } = useCategoryStore();
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<any>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [showBalances, setShowBalances] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    type: 'cash' as any,
    bankName: '',
    lastFourDigits: '',
    color: '#10B981',
  });
  const [errors, setErrors] = useState({
    name: '',
  });

  // Calcular el balance total REAL desde las transacciones
  const totalBalance = useMemo(() => {
    return transactions.reduce((total, transaction) => {
      const category = categories.find(c => c.id === transaction.categoryId);
      if (category?.type === 'income') {
        return total + transaction.amount;
      } else if (category?.type === 'expense') {
        return total - transaction.amount;
      }
      return total;
    }, 0);
  }, [transactions, categories]);

  const hasWallets = wallets.length > 0;
  const activeWallets = wallets.filter(w => w.isActive);
  const inactiveWallets = wallets.filter(w => !w.isActive);
  const totalTransactions = transactions.length;

  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const walletTransactions = transactions.filter(t => t.walletId === id);
    if (walletTransactions.length > 0) {
      setToastMessage(`Cannot delete wallet "${wallets.find(w => w.id === id)?.name}". It has ${walletTransactions.length} associated transactions. Please reassign or delete them first.`);
      setToastType('error');
      setShowToast(true);
      return;
    }
    setWalletToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (walletToDelete) {
      deleteWallet(walletToDelete);
      setToastMessage('Wallet deleted successfully');
      setToastType('success');
      setShowToast(true);
      setWalletToDelete(null);
      setShowDetailModal(false);
    }
    setShowDeleteConfirm(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'cash',
      bankName: '',
      lastFourDigits: '',
      color: '#10B981',
    });
    setEditingWallet(null);
    setErrors({ name: '' });
  };

  const handleEdit = (wallet: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingWallet(wallet);
    setFormData({
      name: wallet.name,
      type: wallet.type,
      bankName: wallet.bankName || '',
      lastFourDigits: wallet.lastFourDigits || '',
      color: wallet.color,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      setErrors({ name: 'Wallet name is required' });
      setToastMessage('Please enter a wallet name');
      setToastType('error');
      setShowToast(true);
      return;
    }

    const iconString = getWalletIconString(formData.type);

    if (editingWallet) {
      updateWallet(editingWallet.id, {
        name: formData.name,
        type: formData.type,
        bankName: formData.bankName,
        lastFourDigits: formData.lastFourDigits,
        color: formData.color,
        icon: iconString,
        isActive: true,
      });
      setToastMessage('Wallet updated successfully');
    } else {
      addWallet({
        name: formData.name,
        type: formData.type,
        bankName: formData.bankName,
        lastFourDigits: formData.lastFourDigits,
        color: formData.color,
        icon: iconString,
        currentBalance: 0,
        isActive: true,
      });
      setToastMessage('Wallet created successfully');
    }
    setToastType('success');
    setShowToast(true);
    resetForm();
    setShowModal(false);
  };

  const handleWalletClick = (walletId: string) => {
    setSelectedWalletId(walletId);
    setShowDetailModal(true);
  };

  const handleTypeChange = (type: string) => {
    const selectedType = walletTypes.find(t => t.id === type);
    setFormData({
      ...formData,
      type: type as any,
      color: selectedType?.color || '#6366F1',
    });
  };

  const walletTypeOptions = walletTypes.map(wt => ({
    id: wt.id,
    label: wt.label,
    icon: wt.getIcon(wt.color),
    color: wt.color,
  }));

  return {
    // Estados
    wallets,
    showModal,
    setShowModal,
    showDetailModal,
    setShowDetailModal,
    editingWallet,
    setEditingWallet,
    selectedWalletId,
    setSelectedWalletId,
    showDeleteConfirm,
    setShowDeleteConfirm,
    walletToDelete,
    showToast,
    setShowToast,
    toastMessage,
    setToastMessage,
    toastType,
    setToastType,
    showBalances,
    setShowBalances,
    formData,
    setFormData,
    errors,
    setErrors,
    // Datos derivados
    totalBalance,
    hasWallets,
    activeWallets,
    inactiveWallets,
    totalTransactions,
    walletTypeOptions,
    // Funciones
    handleDeleteClick,
    confirmDelete,
    resetForm,
    handleEdit,
    handleSubmit,
    handleWalletClick,
    handleTypeChange,
  };
};