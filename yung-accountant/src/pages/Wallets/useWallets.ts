// pages/Wallets/useWallets.ts
import { useState, useMemo, useEffect, useRef } from 'react';
import { useWalletStore, useTransactionStore } from '../../store';
import { walletTypes, getWalletIconString } from './constants';

export const useWallets = () => {
  const { wallets, isLoading : isWalletsLoading, fetchWallets, addWallet, updateWallet, deleteWallet } = useWalletStore();
  const { transactions, isLoading : isTransactionsLoading, fetchTransactions } = useTransactionStore();
  
  const walletsFetchedRef = useRef(false);
  const transactionsFetchedRef = useRef(false);
  
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
    type: 'cash' as WalletType,
    bankName: '',
    lastFourDigits: '',
    color: '#10B981',
  });
  const [errors, setErrors] = useState({ name: '' });

  useEffect(() => {
    if (!walletsFetchedRef.current && wallets.length === 0 && !isWalletsLoading) {
      walletsFetchedRef.current = true;
      fetchWallets();
    }
    if(!transactionsFetchedRef.current && transactions.length === 0 && !isTransactionsLoading) {
      transactionsFetchedRef.current = true;
      fetchTransactions();
    }
  }, []);

  const totalBalance = useMemo(() => {
    return wallets.reduce((total, w) => total + w.currentBalance, 0);
  }, [wallets]);

  const hasWallets = wallets.length > 0;
  const activeWallets = wallets.filter(w => w.isActive);
  const inactiveWallets = wallets.filter(w => !w.isActive);
  const totalTransactions = transactions.length;

  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const walletTransactions = transactions.filter(t => t.walletId === id);
    if (walletTransactions.length > 0) {
      setToastMessage(`Cannot delete wallet. It has ${walletTransactions.length} transactions.`);
      setToastType('error');
      setShowToast(true);
      return;
    }
    setWalletToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (walletToDelete) {
      await deleteWallet(walletToDelete);
      setToastMessage('Wallet deleted');
      setToastType('success');
      setShowToast(true);
      setWalletToDelete(null);
      setShowDetailModal(false);
    }
    setShowDeleteConfirm(false);
  };

  const resetForm = () => {
    setFormData({ name: '', type: 'cash', bankName: '', lastFourDigits: '', color: '#10B981' });
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

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setErrors({ name: 'Wallet name is required' });
      return;
    }

    const iconString = getWalletIconString(formData.type);

    try {
      if (editingWallet) {
        await updateWallet(editingWallet.id, {
          name: formData.name,
          type: formData.type,
          bankName: formData.bankName,
          lastFourDigits: formData.lastFourDigits,
          color: formData.color,
          icon: iconString,
        });
        setToastMessage('Wallet updated');
      } else {
        await addWallet({
          name: formData.name,
          type: formData.type,
          bankName: formData.bankName,
          lastFourDigits: formData.lastFourDigits,
          color: formData.color,
          icon: iconString,
          currentBalance: 0,
        });
        setToastMessage('Wallet created');
      }
      setToastType('success');
      setShowToast(true);
      resetForm();
      setShowModal(false);
    } catch (error) {
      setToastMessage('Error saving wallet');
      setToastType('error');
      setShowToast(true);
    }
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
    wallets, showModal, setShowModal, showDetailModal, setShowDetailModal,
    editingWallet, setEditingWallet, selectedWalletId, setSelectedWalletId,
    showDeleteConfirm, setShowDeleteConfirm, walletToDelete,
    showToast, setShowToast, toastMessage, setToastMessage, toastType, setToastType,
    showBalances, setShowBalances, formData, setFormData, errors, setErrors,
    totalBalance, hasWallets, activeWallets, inactiveWallets, totalTransactions,
    walletTypeOptions,
    handleDeleteClick, confirmDelete, resetForm, handleEdit, handleSubmit,
    handleWalletClick, handleTypeChange,
  };
};

type WalletType = 'cash' | 'bank_account' | 'credit_card' | 'debit_card' | 'other';