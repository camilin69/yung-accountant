// pages/Habits/useHabits.ts
import { useState, useMemo, useEffect, useRef } from 'react';
import { useHabitStore } from '../../store';
import { isOffline } from '../../services/offlineHelper';
import { getLocalDateString } from '../../utils/formatters';
import { useTranslation } from '../../i18n';

export const useHabits = () => {
  const { t } = useTranslation();
  const { 
    habits, 
    isLoading,
    fetchHabits,
    addHabit, 
    updateHabit, 
    deleteHabit, 
    checkHabit 
  } = useHabitStore();

  const fetchedRef = useRef(false);
  
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

  // Cargar hábitos si no hay datos
  useEffect(() => {
    if (!fetchedRef.current && habits.length === 0 && !isLoading) {
      fetchedRef.current = true;
      if (!isOffline() || habits.length === 0) {
        fetchHabits();
      }
    }
  }, []);

  const activeHabits = habits.filter(h => h.isActive);
  const inactiveHabits = habits.filter(h => !h.isActive);
  
  const completedToday = useMemo(() => {
    const today = getLocalDateString();
    return activeHabits.filter(habit => {
      const check = habit.checks?.find(c => c.checkDate === today);
      return check?.completed;
    }).length;
  }, [activeHabits]);

  const streakStats = useMemo(() => {
    let totalCurrentStreak = 0;
    let totalBestStreak = 0;
    activeHabits.forEach(habit => {
      totalCurrentStreak += habit.currentStreak || 0;
      totalBestStreak += habit.bestStreak || 0;
    });
    return { totalCurrentStreak, totalBestStreak };
  }, [activeHabits]);

  const handleCheck = async (habitId: string, date: string, completed: boolean, note?: string) => {
    try {
      await checkHabit(habitId, date, completed, note);
      setToastMessage(completed ? t('habits.checked') : t('habits.undo'));
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      setToastMessage(t('common.error'));
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setErrors({ name: t('common.required') });
      return;
    }

    try {
      if (editingHabit) {
        await updateHabit(editingHabit.id, {
          name: formData.name,
          isActive: formData.isActive,
        });
        setToastMessage(t('habits.updated'));
      } else {
        await addHabit({ name: formData.name });
        setToastMessage(t('habits.created'));
      }
      setToastType('success');
      setShowToast(true);
      resetForm();
      setShowModal(false);
    } catch (error) {
      setToastMessage(t('common.error'));
      setToastType('error');
      setShowToast(true);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', isActive: true });
    setErrors({ name: '' });
    setEditingHabit(null);
  };

  const handleEdit = (habit: any) => {
    setEditingHabit(habit);
    setFormData({ name: habit.name, isActive: habit.isActive });
    setShowModal(true);
  };

  const handleToggleActive = async (habit: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateHabit(habit.id, { isActive: !habit.isActive });
      setToastMessage(`${habit.name}: ${t(!habit.isActive ? 'habits.resumed' : 'habits.paused')}`);
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      setToastMessage(t('common.error'));
      setToastType('error');
      setShowToast(true);
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHabitToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (habitToDelete) {
      try {
        await deleteHabit(habitToDelete);
        setToastMessage(t('habits.deleted'));
        setToastType('success');
        setShowToast(true);
        setHabitToDelete(null);
        if (selectedHabitId === habitToDelete) {
          setSelectedHabitId(null);
        }
      } catch (error) {
        setToastMessage(t('common.error'));
        setToastType('error');
        setShowToast(true);
      }
    }
    setShowDeleteConfirm(false);
  };

  const selectedHabit = selectedHabitId ? habits.find(h => h.id === selectedHabitId) : null;

  return {
    habits, showModal, setShowModal, showCalendar, setShowCalendar,
    showDeleteConfirm, setShowDeleteConfirm, editingHabit, setEditingHabit,
    selectedHabitId, setSelectedHabitId, showToast, setShowToast,
    toastMessage, setToastMessage, toastType, setToastType,
    formData, setFormData, errors, setErrors,
    activeHabits, inactiveHabits, completedToday, streakStats, selectedHabit,
    handleCheck, handleSubmit, resetForm, handleEdit, handleToggleActive,
    handleDeleteClick, confirmDelete, checkHabit,
    isLoading,
  };
};