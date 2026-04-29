// pages/Habits/index.tsx
import React from 'react';
import { Target, Eye, EyeOff, Plus, PowerOff } from 'lucide-react';
import { useThemeStyles } from '../../hooks/useTheme';
import CalendarHabit from './CalendarHabit';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { HabitStats } from './HabitStats';
import { HabitCard } from './HabitCard';
import { InactiveHabitCard } from './InactiveHabitCard';
import { HabitFormModal } from './HabitFormModal';
import { EmptyState } from './EmptyState';
import { useHabits } from './useHabits';

const Habits: React.FC = () => {
  const { getGradientTextClass } = useThemeStyles();
  
  const {
    habits,
    showModal,
    setShowModal,
    showCalendar,
    setShowCalendar,
    showDeleteConfirm,
    setShowDeleteConfirm,
    editingHabit,
    selectedHabitId,
    setSelectedHabitId,
    showToast,
    setShowToast,
    toastMessage,
    toastType,
    formData,
    setFormData,
    errors,
    activeHabits,
    inactiveHabits,
    completedToday,
    streakStats,
    selectedHabit,
    handleCheck,
    handleSubmit,
    resetForm,
    handleEdit,
    handleToggleActive,
    handleDeleteClick,
    confirmDelete,
  } = useHabits();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={`text-2xl font-light tracking-tight ${getGradientTextClass()}`}>
            Habits
          </h1>
          <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">Build and track your daily routines</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="group relative px-4 py-2 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] transition-all duration-300 text-[var(--theme-text-primary)] text-sm font-light flex items-center gap-2 overflow-hidden rounded-lg border border-[var(--theme-border-light)]"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          New Habit
        </button>
      </div>

      {/* Stats Cards */}
      <HabitStats
        activeHabitsCount={activeHabits.length}
        completedToday={completedToday}
        totalCurrentStreak={streakStats.totalCurrentStreak}
        totalBestStreak={streakStats.totalBestStreak}
      />

      {/* Habits Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Habits List */}
        <div className="space-y-4">
          {/* Active Habits */}
          {activeHabits.length > 0 && (
            <div>
              <h2 className="text-sm font-light text-[var(--theme-text-secondary)] mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Active Habits
              </h2>
              <div className="space-y-3">
                {activeHabits.map(habit => {
                  const today = new Date().toISOString().split('T')[0];
                  const isCompletedToday = habit.checks?.some(c => c.checkDate === today) ?? false;
                  
                  return (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      isSelected={selectedHabitId === habit.id}
                      isCompletedToday={isCompletedToday}
                      onSelect={setSelectedHabitId}
                      onToggleActive={handleToggleActive}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Inactive Habits */}
          {inactiveHabits.length > 0 && (
            <div>
              <h2 className="text-sm font-light text-[var(--theme-text-tertiary)] mb-3 flex items-center gap-2">
                <PowerOff className="w-4 h-4" />
                Inactive Habits
              </h2>
              <div className="space-y-3 opacity-70">
                {inactiveHabits.map(habit => (
                  <InactiveHabitCard
                    key={habit.id}
                    habit={habit}
                    isSelected={selectedHabitId === habit.id}
                    onSelect={setSelectedHabitId}
                    onToggleActive={handleToggleActive}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            </div>
          )}

          {habits.length === 0 && <EmptyState onCreateHabit={() => setShowModal(true)} />}
        </div>

        {/* Calendar View */}
        <div className="relative">
          {selectedHabit && (
            <div className="relative">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] transition-colors text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]"
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
                <div className="bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-12 text-center h-full flex flex-col items-center justify-center">
                  <Eye className="w-12 h-12 text-[var(--theme-text-tertiary)]/20 mb-3" />
                  <p className="text-[var(--theme-text-tertiary)] text-sm font-light">Calendar hidden</p>
                  <button
                    onClick={() => setShowCalendar(true)}
                    className="mt-3 text-xs text-[var(--theme-primary)] hover:underline"
                  >
                    Show calendar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Habit Form Modal */}
      <HabitFormModal
        isOpen={showModal}
        editingHabit={editingHabit}
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
      />

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