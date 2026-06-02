// pages/Categories/useCategories.ts

import { useEffect, useRef, useState } from 'react';
import { useCategoryStore } from '../../store';

export const useCategories = () => {
  const { 
    categories, 
    isLoading,           
    fetchAllCategories,  
    addCategory, 
    updateCategory, 
    deleteCategory 
  } = useCategoryStore();
  
  const fetchedRef = useRef(false);
  
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    icon: 'Briefcase',
    color: '#6366F1',
  });

  // Separar categorías
  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');
  
  const systemIncomeCategories = incomeCategories.filter(c => c.isDefault || c.name === 'Borrow' || c.name === 'Debt Collection');
  const customIncomeCategories = incomeCategories.filter(c => !c.isDefault && c.name !== 'Borrow' && c.name !== 'Debt Collection');
  
  const systemExpenseCategories = expenseCategories.filter(c => c.isDefault || c.name === 'Lent' || c.name === 'Debt Payment');
  const customExpenseCategories = expenseCategories.filter(c => !c.isDefault && c.name !== 'Lent' && c.name !== 'Debt Payment');

  const isSystemCategory = (category: any) => {
    return category.isDefault || ['Borrow', 'Lent', 'Debt Payment', 'Debt Collection'].includes(category.name);
  };

  useEffect(() => {
    if (!fetchedRef.current && categories.length === 0 && !isLoading) {
      fetchedRef.current = true;
      fetchAllCategories();
    }
  }, []);
  
  const handleSubmit = () => {
    if (!formData.name.trim()) {
      setToastMessage('Please enter a category name');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (editingCategory) {
      updateCategory(editingCategory.id, { ...formData, isDefault: editingCategory.isDefault });
      setToastMessage('Category updated successfully');
    } else {
      // Usar el userId del usuario actual
      addCategory({
            name: formData.name,
            type: formData.type,
            icon: formData.icon,
            color: formData.color,
      });
      setToastMessage('Category created successfully');
    }
    setToastType('success');
    setShowToast(true);

    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', type: 'expense', icon: 'Briefcase', color: '#6366F1' });
  };

  const handleEdit = (category: any) => {
    if (isSystemCategory(category)) {
      setToastMessage('System categories cannot be edited');
      setToastType('warning');
      setShowToast(true);
      return;
    }
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
    });
    setShowModal(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
    const category = categories.find(c => c.id === id);
    if (category && isSystemCategory(category)) {
      setToastMessage('System categories cannot be deleted');
      setToastType('warning');
      setShowToast(true);
      return;
    }
    setCategoryToDelete({ id, name });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteCategory(categoryToDelete.id);
      setToastMessage(`Category "${categoryToDelete.name}" deleted`);
      setToastType('success');
      setShowToast(true);
      setCategoryToDelete(null);
    }
    setShowDeleteConfirm(false);
  };

  const resetForm = () => {
    setFormData({ name: '', type: 'expense', icon: 'Briefcase', color: '#6366F1' });
    setEditingCategory(null);
  };

  return {
    // Estados
    categories,
    showModal,
    setShowModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    categoryToDelete,
    editingCategory,
    setEditingCategory,
    showToast,
    setShowToast,
    toastMessage,
    setToastMessage,
    toastType,
    setToastType,
    formData,
    setFormData,
    // Datos derivados
    incomeCategories,
    expenseCategories,
    systemIncomeCategories,
    customIncomeCategories,
    systemExpenseCategories,
    customExpenseCategories,
    // Funciones
    isSystemCategory,
    handleSubmit,
    handleEdit,
    handleDeleteClick,
    confirmDelete,
    resetForm,
  };
};