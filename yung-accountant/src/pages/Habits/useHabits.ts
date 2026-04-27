// pages/Habits/useHabits.ts

import { useState, useMemo } from 'react';
import { useHabitStore } from '../../store';
import { format } from 'date-fns';

export const useHabits = () => {
  const { habits, addHabit, updateHabit, deleteHabit } = useHabitStore();
  
  const [showModal, setShowModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<any>(null);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
  });
  const [errors, setErrors] = useState({
    name: '',
  });

  const activeHabits = habits.filter(h => h.isActive);
  const inactiveHabits = habits.filter(h => !h.isActive);
  
  const completedToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return activeHabits.filter(habit => {
      const check = habit.checks?.find(c => c.checkDate === today);
      return check?.completed;
    }).length;
  }, [activeHabits, habits]);

  const streakStats = useMemo(() => {
    let totalCurrentStreak = 0;
    let totalBestStreak = 0;
    activeHabits.forEach(habit => {
      totalCurrentStreak += habit.currentStreak;
      totalBestStreak += habit.bestStreak;
    });
    return { totalCurrentStreak, totalBestStreak };
  }, [activeHabits]);

  const handleCheck = (habitId: string, date: string, completed: boolean, note?: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const existingChecks = habit.checks || [];
    let newChecks: any[];
    let newCurrentStreak = habit.currentStreak;
    let newBestStreak = habit.bestStreak;

    if (completed) {
      const existingIndex = existingChecks.findIndex(c => c.checkDate === date);
      if (existingIndex >= 0) {
        newChecks = [...existingChecks];
        newChecks[existingIndex] = { ...newChecks[existingIndex], completed: true, note };
      } else {
        newChecks = [...existingChecks, { id: Date.now().toString(), habitId, checkDate: date, completed: true, note }];
        
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
        const wasYesterdayCompleted = existingChecks.some(c => c.checkDate === yesterdayStr && c.completed);
        
        if (wasYesterdayCompleted) {
          newCurrentStreak = habit.currentStreak + 1;
        } else {
          newCurrentStreak = 1;
        }
        newBestStreak = Math.max(newCurrentStreak, habit.bestStreak);
      }
    } else {
      newChecks = existingChecks.filter(c => c.checkDate !== date);
      newCurrentStreak = 0;
      newBestStreak = habit.bestStreak;
    }

    updateHabit(habitId, {
      checks: newChecks,
      currentStreak: newCurrentStreak,
      bestStreak: newBestStreak,
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      setErrors({ name: 'Habit name is required' });
      setToastMessage('Please enter a habit name');
      setToastType('error');
      setShowToast(true);
      return;
    }

    if (editingHabit) {
      updateHabit(editingHabit.id, {
        name: formData.name,
        isActive: formData.isActive,
      });
      setToastMessage('Habit updated successfully');
    } else {
      addHabit({
        name: formData.name,
        isActive: true,
      });
      setToastMessage('Habit created successfully');
    }
    setToastType('success');
    setShowToast(true);
    resetForm();
    setShowModal(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      isActive: true,
    });
    setErrors({ name: '' });
    setEditingHabit(null);
  };

  const handleEdit = (habit: any) => {
    setEditingHabit(habit);
    setFormData({
      name: habit.name,
      isActive: habit.isActive,
    });
    setShowModal(true);
  };

  const handleToggleActive = (habit: any, e: React.MouseEvent) => {
    e.stopPropagation();
    updateHabit(habit.id, { isActive: !habit.isActive });
    setToastMessage(`${habit.name} ${!habit.isActive ? 'activated' : 'deactivated'}`);
    setToastType('success');
    setShowToast(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHabitToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (habitToDelete) {
      deleteHabit(habitToDelete);
      setToastMessage('Habit deleted successfully');
      setToastType('success');
      setShowToast(true);
      setHabitToDelete(null);
      if (selectedHabitId === habitToDelete) {
        setSelectedHabitId(null);
      }
    }
    setShowDeleteConfirm(false);
  };

  const selectedHabit = selectedHabitId ? habits.find(h => h.id === selectedHabitId) : null;

  return {
    // Estados
    habits,
    showModal,
    setShowModal,
    showCalendar,
    setShowCalendar,
    showDeleteConfirm,
    setShowDeleteConfirm,
    editingHabit,
    setEditingHabit,
    selectedHabitId,
    setSelectedHabitId,
    showToast,
    setShowToast,
    toastMessage,
    setToastMessage,
    toastType,
    setToastType,
    formData,
    setFormData,
    errors,
    setErrors,
    // Datos derivados
    activeHabits,
    inactiveHabits,
    completedToday,
    streakStats,
    selectedHabit,
    // Funciones
    handleCheck,
    handleSubmit,
    resetForm,
    handleEdit,
    handleToggleActive,
    handleDeleteClick,
    confirmDelete,
  };
};