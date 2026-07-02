// pages/Habits/index.tsx
import React from 'react';
import { Target, Eye, EyeOff, Plus, PowerOff } from 'lucide-react';
import CalendarHabit from './CalendarHabit';
import ConfirmModal from '../../components/common/ConfirmModal';
import ToastNotification from '../../components/common/ToastNotification';
import { HabitStats } from './HabitStats';
import { HabitCard } from './HabitCard';
import { InactiveHabitCard } from './InactiveHabitCard';
import { HabitFormModal } from './HabitFormModal';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import CachedBadge from '../../components/common/CachedBadge';
import { EmptyState } from './EmptyState';
import { useHabits } from './useHabits';
import { getLocalDateString } from '../../utils/formatters';

const Habits: React.FC = () => {

  useDocumentTitle('Habits');

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
    <div className="max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-10 pt-4 animate-fade-in-down">
        <div>
          <h1 className="text-[34px] font-light tracking-[-0.03em]" style={{ color: 'var(--theme-text-primary)' }}>
            Habits <CachedBadge />
          </h1>
          <p className="text-[14px] mt-1.5 tracking-[0.02em]" style={{ color: 'var(--theme-text-tertiary)' }}>
            Build and track your daily routines
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-5 py-3 rounded-2xl text-[12px] font-medium tracking-[0.04em] uppercase flex items-center gap-2.5 transition-all duration-500 hover:-translate-y-1 active:scale-95"
          style={{ 
            backgroundColor: 'var(--theme-primary)', 
            color: '#FFFFFF',
            boxShadow: '0 4px 20px -6px var(--theme-primary)'
          }}
        >
          <Plus className="w-4 h-4 transition-transform duration-500 hover:rotate-90" strokeWidth={2.5} />
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
              <h2 className="text-[15px] font-medium tracking-[0.02em] mb-4 flex items-center gap-3" style={{ color: 'var(--theme-text-secondary)' }}>
                <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center glass-sm">
                  <Target className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />
                </div>
                Active Habits
              </h2>
              <div className="space-y-3">
                {activeHabits.map(habit => {
                  const today = getLocalDateString();
                  const isCompletedToday = habit.checks?.some((c: any) => c.checkDate === today) ?? false;
                  
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
              <h2 className="text-[15px] font-medium tracking-[0.02em] mb-4 flex items-center gap-3" style={{ color: 'var(--theme-text-tertiary)' }}>
                <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center glass-sm">
                  <PowerOff className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
                </div>
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
                className="absolute top-3 right-3 z-10 p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm"
                title={showCalendar ? 'Hide calendar' : 'Show calendar'}
                style={{ color: 'var(--theme-text-tertiary)' }}
              >
                {showCalendar ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
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
                <div className="rounded-[2rem] p-16 text-center h-full flex flex-col items-center justify-center glass-aero">
                  <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 glass-sm">
                    <Eye className="w-8 h-8" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.25 }} strokeWidth={1} />
                  </div>
                  <p className="text-[15px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>Calendar hidden</p>
                  <button
                    onClick={() => setShowCalendar(true)}
                    className="mt-4 text-[13px] font-medium transition-all duration-300 hover:opacity-80"
                    style={{ color: 'var(--theme-primary)' }}
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