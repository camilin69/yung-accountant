// components/habits/CalendarHabit.tsx
import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, TrendingUp, Target, FileText, X, Save, ArrowLeft } from 'lucide-react';
import { CheckCircle } from 'lucide-react';

interface CalendarHabitProps {
  habitId: string;
  habitName: string;
  checks: any[];
  onCheck: (date: string, completed: boolean, note?: string) => void;
  isReadOnly?: boolean;
}

const CalendarHabit: React.FC<CalendarHabitProps> = ({
  habitName,
  checks,
  onCheck,
  isReadOnly = false,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [note, setNote] = useState('');
  const [, setShowToast] = useState(false);
  const [, setToastMessage] = useState('');
  const [, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const getCheckForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return checks.find(c => c.checkDate === dateStr);
  };

  const isDateCompleted = (date: Date): boolean => {
    return getCheckForDate(date)?.completed || false;
  };

  const getNoteForDate = (date: Date): string => {
    return getCheckForDate(date)?.note || '';
  };

  const isFutureDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const monthlyStats = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    
    let completed = 0;
    days.forEach(day => {
      if (isDateCompleted(day)) completed++;
    });
    
    const progress = days.length > 0 ? (completed / days.length) * 100 : 0;
    
    return { completed, total: days.length, progress };
  }, [currentDate, checks]);

  const handlePrevious = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNext = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date: Date) => {
    if (isFutureDate(date)) return;
    
    const existingCheck = getCheckForDate(date);
    setIsCompleted(existingCheck?.completed || false);
    setNote(existingCheck?.note || '');
    setSelectedDate(date);
    setShowModal(true);
  };

  const handleSave = () => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      onCheck(dateStr, isCompleted, note);
      setShowModal(false);
      setSelectedDate(null);
      setNote('');
      setToastMessage(isCompleted ? 'Habit marked as completed!' : 'Habit unmarked');
      setToastType('success');
      setShowToast(true);
      
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedDate(null);
    setNote('');
  };

  return (
    <>
      <div className={`bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-xl p-5 ${isReadOnly ? 'opacity-80' : ''}`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--theme-primary)]" />
            <h3 className="text-sm font-light text-[var(--theme-text-primary)]">{habitName}</h3>
            {isReadOnly && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-500/20 text-gray-400/80 ml-2">
                Read Only
              </span>
            )}
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              className="p-1.5 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-light bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-[var(--theme-text-tertiary)]" />
            </button>
          </div>
          <div className="text-sm font-light text-[var(--theme-text-secondary)]">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="mb-4 p-3 bg-[var(--theme-background-glass)] rounded-lg border border-[var(--theme-border-dark)]">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-green-600" />
              <span className="text-[10px] text-[var(--theme-text-tertiary)]">Monthly Progress</span>
            </div>
            <span className="text-[10px] text-[var(--theme-text-secondary)]">{monthlyStats.completed}/{monthlyStats.total} days</span>
          </div>
          <div className="h-1.5 bg-[var(--theme-border-dark)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(monthlyStats.progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-[9px] text-[var(--theme-text-tertiary)] font-light py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthDays[0] && (
            <>
              {Array.from({ length: (monthDays[0].getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
            </>
          )}
          
          {monthDays.map((date, idx) => {
            const completed = isDateCompleted(date);
            const isFuture = isFutureDate(date);
            const isToday = isSameDay(date, new Date());
            const hasNote = !!getNoteForDate(date);
            const noteText = getNoteForDate(date);
            
            return (
              <button
                key={idx}
                onClick={() => handleDayClick(date)}
                disabled={isFuture}
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center 
                  transition-all duration-200 relative group
                  ${completed ? 'bg-green-500/20 border border-green-500/30' : 'bg-[var(--theme-background-glass)] border border-[var(--theme-border-dark)]'}
                  ${isToday && !completed ? 'ring-1 ring-[var(--theme-primary)]/50' : ''}
                  ${isFuture ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--theme-background-glass-hover)]'}
                `}
              >
                <span className={`text-xs font-light ${completed ? 'text-green-600' : 'text-[var(--theme-text-secondary)]'}`}>
                  {format(date, 'd')}
                </span>
                {completed && (
                  <CheckCircle className="w-3 h-3 text-green-600 mt-0.5" />
                )}
                {isToday && !completed && (
                  <div className="w-1 h-1 rounded-full bg-[var(--theme-primary)] mt-0.5" />
                )}
                {hasNote && completed && (
                  <div className="mt-0.5 group/tooltip relative">
                    <div className="w-3.5 h-3.5 rounded-full bg-[var(--theme-primary)]/20 border border-[var(--theme-primary)]/30 flex items-center justify-center cursor-help">
                      <FileText className="w-2 h-2 text-[var(--theme-primary)]" />
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--theme-background-glass)] backdrop-blur-sm border border-[var(--theme-border-light)] rounded-md text-[8px] text-[var(--theme-text-secondary)] whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none z-10">
                      📝 {noteText.length > 30 ? noteText.substring(0, 27) + '...' : noteText}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-4 pt-3 border-t border-[var(--theme-border-light)]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
            <span className="text-[8px] text-[var(--theme-text-tertiary)]">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--theme-border-dark)] border border-[var(--theme-border-light)]" />
            <span className="text-[8px] text-[var(--theme-text-tertiary)]">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--theme-primary)]" />
            <span className="text-[8px] text-[var(--theme-text-tertiary)]">Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="w-2.5 h-2.5 text-[var(--theme-text-tertiary)]" />
            <span className="text-[8px] text-[var(--theme-text-tertiary)]">Has note</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--theme-background-glass)] backdrop-blur-xl border border-[var(--theme-border-light)] rounded-xl w-full max-w-md max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-t-xl">
              <div className="flex justify-between items-center p-5 border-b border-[var(--theme-border-light)]">
                <div className="flex items-center gap-3">
                  <button onClick={handleClose} className="lg:hidden p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
                    <ArrowLeft className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
                  </button>
                  <div>
                    <h3 className="text-lg font-light text-[var(--theme-text-primary)]">
                      {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
                    </h3>
                    <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 font-light">
                      {habitName}
                    </p>
                  </div>
                </div>
                <button onClick={handleClose} className="hidden lg:block p-2 rounded-lg hover:bg-[var(--theme-background-glass-hover)] transition-colors">
                  <X className="w-5 h-5 text-[var(--theme-text-tertiary)]" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto modal-scroll p-5 space-y-5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-light text-[var(--theme-text-primary)]">Completed</label>
                <button
                  onClick={() => !isReadOnly && setIsCompleted(!isCompleted)}
                  disabled={isReadOnly}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 ${
                    isReadOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  } ${
                    isCompleted
                      ? 'bg-green-500/20 border border-green-500/30 text-green-600'
                      : 'bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] text-[var(--theme-text-tertiary)]'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs text-[var(--theme-text-tertiary)] mb-1.5 font-light">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => !isReadOnly && setNote(e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Add a note about your progress..."
                  rows={3}
                  className={`w-full px-4 py-2.5 bg-[var(--theme-background-glass)] border border-[var(--theme-border-light)] rounded-lg text-[var(--theme-text-primary)] text-sm font-light focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors resize-none placeholder:text-[var(--theme-text-tertiary)]/20 ${
                    isReadOnly ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[var(--theme-background-glass)] backdrop-blur-xl rounded-b-xl">
              <div className="flex gap-3 p-5 border-t border-[var(--theme-border-light)]">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 bg-[var(--theme-background-glass)] hover:bg-[var(--theme-background-glass-hover)] rounded-lg text-[var(--theme-text-tertiary)] text-sm font-light transition-all duration-300"
                >
                  Cancel
                </button>
                {!isReadOnly && (
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-lg text-white text-sm font-light transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CalendarHabit;