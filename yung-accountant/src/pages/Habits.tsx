// pages/Habits.tsx

import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Save, 
  Calendar, 
  TrendingUp,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  Flame,
  Power,
  PowerOff,
  Eye,
  EyeOff
} from 'lucide-react';
import ConfirmModal from '../components/common/ConfirmModal';
import ToastNotification from '../components/common/ToastNotification';
import CalendarHabit from '../components/habits/CalendarHabit';
import { format } from 'date-fns';

const Habits: React.FC = () => {
  const { habits, addHabit, updateHabit, deleteHabit } = useStore();
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
      // Verificar si ya existe un check para esta fecha
      const existingIndex = existingChecks.findIndex(c => c.checkDate === date);
      if (existingIndex >= 0) {
        // Actualizar el existente
        newChecks = [...existingChecks];
        newChecks[existingIndex] = { ...newChecks[existingIndex], completed: true, note };
        
        // No aumentar streak si ya estaba completado
      } else {
        // Agregar nuevo
        newChecks = [...existingChecks, { id: Date.now().toString(), habitId, checkDate: date, completed: true, note }];
        
        // Calcular streak basado en días consecutivos
        // Por simplicidad, incrementamos si el día anterior está completado
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
      // Eliminar check (desmarcar)
      newChecks = existingChecks.filter(c => c.checkDate !== date);
      // Resetear streak (por simplicidad)
      newCurrentStreak = 0;
      // Best streak se mantiene
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
        createdAt: new Date().toISOString(),
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
            Habits
          </h1>
          <p className="text-xs text-white/40 mt-0.5 font-light">Build and track your daily routines</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="group relative px-4 py-2 bg-white/5 hover:bg-white/10 transition-all duration-300 text-white text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          New Habit
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-[#6366F1]" />
            <span className="text-xs text-white/40">Active Habits</span>
          </div>
          <p className="text-2xl font-light text-[#6366F1]">{activeHabits.length}</p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-white/40">Completed Today</span>
          </div>
          <p className="text-2xl font-light text-green-500">{completedToday}</p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-white/40">Total Streak</span>
          </div>
          <p className="text-2xl font-light text-orange-500">{streakStats.totalCurrentStreak}</p>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-white/40">Best Streak</span>
          </div>
          <p className="text-2xl font-light text-yellow-500">{streakStats.totalBestStreak}</p>
        </div>
      </div>

      {/* Habits Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Habits List */}
        <div className="space-y-4">
          {/* Active Habits */}
          {activeHabits.length > 0 && (
            <div>
              <h2 className="text-sm font-light text-white/60 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Active Habits
              </h2>
              <div className="space-y-3">
                {activeHabits.map(habit => {
                  const today = new Date().toISOString().split('T')[0];
                  const isCompletedToday = habit.checks?.some(c => c.checkDate === today);
                  
                  return (
                    <div
                      key={habit.id}
                      onClick={() => setSelectedHabitId(habit.id)}
                      className={`bg-white/[0.03] backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 cursor-pointer group hover:bg-white/[0.06] ${
                        selectedHabitId === habit.id ? 'border-[#6366F1]/50' : 'border-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10">
                            <Calendar className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <h3 className="text-base font-light text-white">{habit.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-white/40">Daily habit</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => handleToggleActive(habit, e)} className="p-1.5 rounded-lg hover:bg-yellow-500/20 text-white/40 hover:text-yellow-500 transition-colors" title={habit.isActive ? 'Deactivate' : 'Activate'}>
                            {habit.isActive ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => handleEdit(habit)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => handleDeleteClick(habit.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Streak Info */}
                      <div className="flex items-center gap-4 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-3 h-3 text-orange-500/60" />
                          <span className="text-[10px] text-white/40">Streak: {habit.currentStreak}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3 h-3 text-yellow-500/60" />
                          <span className="text-[10px] text-white/40">Best: {habit.bestStreak}</span>
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto">
                          {isCompletedToday ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span className="text-[10px] text-green-500/80">Done today</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-white/30" />
                              <span className="text-[10px] text-white/30">Pending</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inactive Habits */}
          {inactiveHabits.length > 0 && (
            <div>
              <h2 className="text-sm font-light text-white/40 mb-3 flex items-center gap-2">
                <PowerOff className="w-4 h-4" />
                Inactive Habits
              </h2>
              <div className="space-y-3 opacity-60">
                {inactiveHabits.map(habit => (
                  <div
                    key={habit.id}
                    onClick={() => setSelectedHabitId(habit.id)}
                    className={`bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-xl p-4 transition-all duration-300 cursor-pointer group hover:bg-white/[0.04] ${
                      selectedHabitId === habit.id ? 'border-[#6366F1]/50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5">
                          <Calendar className="w-5 h-5 text-white/30" />
                        </div>
                        <div>
                          <h3 className="text-base font-light text-white/60">{habit.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-white/30">Inactive</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => handleToggleActive(habit, e)} className="p-1.5 rounded-lg hover:bg-green-500/20 text-white/40 hover:text-green-500 transition-colors" title="Activate">
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleEdit(habit)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => handleDeleteClick(habit.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {habits.length === 0 && (
            <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
              <Target className="w-16 h-16 mx-auto mb-4 text-white/20" />
              <p className="text-white/40 text-sm font-light">No habits yet</p>
              <p className="text-white/30 text-xs mt-1">Start building better routines</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm font-light transition-all duration-300 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Your First Habit
              </button>
            </div>
          )}
        </div>

        {/* Calendar View */}
        <div className="relative">
          {selectedHabit && (
            <div className="relative">
              {/* Botón para ocultar/mostrar calendario */}
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                title={showCalendar ? 'Hide calendar' : 'Show calendar'}
              >
                {showCalendar ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              
              {showCalendar ? (
                <CalendarHabit
                  habitId={selectedHabit.id}
                  habitName={selectedHabit.name}
                  checks={selectedHabit.checks || []}
                  onCheck={(date, completed, note) => handleCheck(selectedHabit.id, date, completed, note)}
                  isReadOnly={!selectedHabit.isActive}
                />
              ) : (
                <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center h-full flex flex-col items-center justify-center">
                  <Eye className="w-12 h-12 text-white/20 mb-3" />
                  <p className="text-white/40 text-sm font-light">Calendar hidden</p>
                  <button
                    onClick={() => setShowCalendar(true)}
                    className="mt-3 text-xs text-[#6366F1] hover:underline"
                  >
                    Show calendar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal para crear/editar habit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/20 rounded-xl w-full max-w-md flex flex-col max-h-[85vh]">
            <div className="sticky top-0 z-10 bg-white/[0.03] backdrop-blur-xl rounded-t-xl">
              <div className="flex justify-between items-center p-5 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-light text-white">
                    {editingHabit ? 'Edit Habit' : 'New Habit'}
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5 font-light">
                    {editingHabit ? 'Update your habit' : 'Create a new habit to track'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">
                  Habit Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2.5 bg-white/[0.03] border rounded-lg text-white/80 text-sm font-light focus:outline-none focus:border-[#6366F1]/50 transition-colors placeholder:text-white/20 ${
                    errors.name ? 'border-red-500/50' : 'border-white/10'
                  }`}
                  placeholder="e.g., Exercise, Read, Meditate..."
                  autoFocus
                />
                {errors.name && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 text-red-500/80" />
                    <p className="text-[10px] text-red-500/80">{errors.name}</p>
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5 font-light">Status</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: true })}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-200 flex items-center justify-center gap-2 ${
                      formData.isActive
                        ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                        : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: false })}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-light transition-all duration-200 flex items-center justify-center gap-2 ${
                      !formData.isActive
                        ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <PowerOff className="w-4 h-4" />
                    Inactive
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                <p className="text-[9px] text-white/40 font-light mb-2">How it works</p>
                <div className="space-y-1 text-[10px] text-white/30">
                  <p>• Mark days when you complete your habit</p>
                  <p>• Add notes to track details (e.g., "30 min workout")</p>
                  <p>• Maintain streaks by being consistent</p>
                  <p>• Your best streak is automatically tracked</p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white/[0.03] backdrop-blur-xl rounded-b-xl">
              <div className="flex gap-3 p-5 border-t border-white/10">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/[0.03] hover:bg-white/10 rounded-lg text-white/60 text-sm font-light transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingHabit ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Habit"
        message="Are you sure you want to delete this habit? All progress will be lost."
        confirmText="Delete"
        type="danger"
      />

      {/* Toast Notification */}
      <ToastNotification
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
};

export default Habits;