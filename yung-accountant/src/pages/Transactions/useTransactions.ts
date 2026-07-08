// pages/Transactions/useTransactions.ts

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTransactionStore, useCategoryStore, useWalletStore } from '../../store';
import { isOffline } from '../../services/offlineHelper';

export const useTransactions = (t?: (key: string, vars?: Record<string, string | number>) => string) => {
  const [searchParams] = useSearchParams();
  const { transactions, deleteTransaction, isLoading : isTransactionsLoading, fetchTransactions } = useTransactionStore();
  const { wallets, isLoading : isWalletsLoading, fetchWallets } = useWalletStore();

  const transactionsFetchedRef = useRef(false);
  const walletsFetchedRef = useRef(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Reset to page 1 when filters change — prevents empty pages when filtered results shrink
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, typeFilter]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const { categories, fetchAllCategories } = useCategoryStore();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if(!transactionsFetchedRef.current && transactions.length === 0 && !isTransactionsLoading) {
      transactionsFetchedRef.current = true;
      if (!isOffline() || transactions.length === 0) {
        fetchTransactions();
      }
    }
    if(!walletsFetchedRef.current && wallets.length === 0 && !isWalletsLoading) {
      walletsFetchedRef.current = true;
      if (!isOffline() || wallets.length === 0) {
        fetchWallets();
      }
    }
  }, [])
  
  useEffect(() => {
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchParams]);

  const getCategoryById = (id: string) => categories.find(c => c.id === id);
  const getWalletById = (id: string) => wallets.find(w => w.id === id);

  
  
  useEffect(() => {
    if (!fetchedRef.current && categories.length === 0) {
      fetchedRef.current = true;
      if (!isOffline() || categories.length === 0) {
        fetchAllCategories();
      }
    }
  }, [categories.length, fetchAllCategories]);

  const incomeCategories = categories.filter(c => c.type === 'income' && !c.isSystem);
  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.isSystem);

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (searchTerm) {
      filtered = filtered.filter(t => {
        const cat = getCategoryById(t.categoryId);
        return t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               cat?.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.categoryId === categoryFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => {
        const cat = getCategoryById(t.categoryId);
        return typeFilter === 'income' ? cat?.type === 'income' : cat?.type === 'expense';
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
    });

    return filtered;
  }, [transactions, searchTerm, categoryFilter, typeFilter, sortBy, sortOrder]);

  const filteredTransactionsLength = filteredTransactions.length;
  const totalPages = Math.ceil(filteredTransactions.length / 10);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * 10,
    currentPage * 10
  );

  const stats = {
    totalIncome: transactions
      .filter(t => {
        const cat = getCategoryById(t.categoryId);
        return cat?.type === 'income';
      })
      .reduce((sum, t) => sum + t.amount, 0),
    totalExpenses: transactions
      .filter(t => {
        const cat = getCategoryById(t.categoryId);
        return cat?.type === 'expense';
      })
      .reduce((sum, t) => sum + t.amount, 0),
    count: transactions.length,
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();    
    setTransactionToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (transactionToDelete) {
      await deleteTransaction(transactionToDelete);
      
      setToastMessage(t ? t('transactions.deleted') : 'Transaction deleted successfully');
      setToastType('success');
      setShowToast(true);
      setTransactionToDelete(null);
      setShowDetailModal(false);
    }
    setShowDeleteConfirm(false);
  };

  const handleViewDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const handleEdit = (transaction: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const isDebtTransaction = transaction.tags && (transaction.tags.includes('debt') || transaction.tags.includes('debt-payment'));
    
    if (isDebtTransaction) {
      setToastMessage(t ? t('debts.cannotEditDebtTransactions') : 'Debt transactions cannot be edited. Please manage them from the Debts module.');
      setToastType('warning');
      setShowToast(true);
      return;
    }
    
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const selectedTransactionDetails = selectedTransaction ? getCategoryById(selectedTransaction.categoryId) : null;

  return {
    // Estados
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    typeFilter,
    setTypeFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    currentPage,
    setCurrentPage,
    showTransactionModal,
    setShowTransactionModal,
    showDetailModal,
    setShowDetailModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    editingTransaction,
    setEditingTransaction,
    selectedTransaction,
    setSelectedTransaction,
    transactionToDelete,
    showFilters,
    setShowFilters,
    showToast,
    setShowToast,
    toastMessage,
    setToastMessage,
    toastType,
    setToastType,
    // Datos derivados
    filteredTransactions,
    filteredTransactionsLength,
    totalPages,
    paginatedTransactions,
    stats,
    incomeCategories,
    expenseCategories,
    categories,
    selectedTransactionDetails,
    wallets,
    isTransactionsLoading,
    // Funciones
    getCategoryById,
    getWalletById,
    handleDeleteClick,
    confirmDelete,
    handleViewDetails,
    handleEdit,
  };
};