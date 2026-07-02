// components/habits/CalendarHabit.tsx
import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, TrendingUp, Target, FileText, X, Save, ArrowLeft, CheckCircle } from 'lucide-react';

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

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const legendItems = [
    { color: 'var(--semantic-income)', label: 'Completed', type: 'circle' as const },
    { color: 'var(--theme-border-dark)', label: 'Pending', type: 'circle-border' as const },
    { color: 'var(--theme-primary)', label: 'Today', type: 'circle' as const },
    { label: 'Has note', type: 'icon' as const },
  ];

  return (
    <>
      <div className={`rounded-[2rem] p-6 glass-md animate-fade-in-up ${isReadOnly ? 'opacity-80' : ''}`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[1rem] flex items-center justify-center glass-sm">
              <Target className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-primary)' }}>{habitName}</h3>
            {isReadOnly && (
              <span className="text-[9px] font-medium px-2 py-0.5 rounded-full glass-sm" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>
                Read Only
              </span>
            )}
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex gap-1.5">
            <button
              onClick={handlePrevious}
              className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm"
            >
              <ChevronLeft className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
            <button
              onClick={handleToday}
              className="px-4 py-2 rounded-2xl text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
              style={{ color: 'var(--theme-text-tertiary)' }}
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm"
            >
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} />
            </button>
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="mb-5 p-4 rounded-[1.25rem] glass-sm">
          <div className="flex justify-between items-center mb-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--semantic-income)' }} strokeWidth={1.5} />
              <span className="text-[10px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--theme-text-tertiary)' }}>Monthly Progress</span>
            </div>
            <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-secondary)' }}>{monthlyStats.completed}/{monthlyStats.total} days</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--theme-background-glass-hover)' }}>
            <div 
              className="h-full rounded-full transition-all duration-700"
              style={{ 
                width: `${Math.min(monthlyStats.progress, 100)}%`, 
                background: 'var(--theme-gradient-primary)', 
                boxShadow: '0 0 14px -4px var(--theme-primary)' 
              }}
            />
          </div>
        </div>

        {/* Calendar Grid - Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[10px] font-medium tracking-[0.06em] uppercase py-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid - Days */}
        <div className="grid grid-cols-7 gap-1.5">
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
                className={`aspect-square rounded-[0.85rem] flex flex-col items-center justify-center transition-all duration-300 relative group ${
                  completed 
                    ? 'glass-sm' 
                    : 'hover:bg-[var(--theme-background-glass-hover)]'
                } ${isFuture ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{
                  backgroundColor: completed ? 'rgba(16,185,129,0.10)' : 'var(--theme-background-glass)',
                  border: completed ? '1px solid rgba(16,185,129,0.25)' : '1px solid var(--theme-border-dark)',
                  boxShadow: isToday && !completed ? '0 0 10px -2px var(--theme-primary)' : 'none',
                }}
              >
                <span className={`text-xs font-medium ${completed ? '' : ''}`}
                  style={{ color: completed ? 'var(--semantic-income)' : 'var(--theme-text-secondary)' }}>
                  {format(date, 'd')}
                </span>
                {completed && (
                  <CheckCircle className="w-3 h-3 mt-0.5" style={{ color: 'var(--semantic-income)' }} strokeWidth={2} />
                )}
                {isToday && !completed && (
                  <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ backgroundColor: 'var(--theme-primary)' }} />
                )}
                {hasNote && completed && (
                  <div className="mt-0.5 group/tooltip relative">
                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center cursor-help glass-sm" style={{ border: '1px solid var(--theme-border-medium)' }}>
                      <FileText className="w-2 h-2" style={{ color: 'var(--theme-primary)' }} />
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-2xl glass-aero text-[9px] font-medium whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 pointer-events-none z-10"
                      style={{ color: 'var(--theme-text-secondary)', boxShadow: 'var(--shadow-glass-lg)' }}>
                      {noteText.length > 30 ? noteText.substring(0, 27) + '...' : noteText}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-5 mt-5 pt-4" style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
          {legendItems.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {item.type === 'circle' && (
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              )}
              {item.type === 'circle-border' && (
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'transparent', border: `1px solid ${item.color}` }} />
              )}
              {item.type === 'icon' && (
                <FileText className="w-2.5 h-2.5" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
              )}
              <span className="text-[9px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-[2rem] overflow-hidden glass-aero animate-scale-in">
            {/* Header */}
            <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
              <div className="flex items-center gap-3">
                <button onClick={handleClose} className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
                  <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
                </button>
                <div>
                  <h3 className="text-lg font-medium tracking-[0.01em]" style={{ color: 'var(--theme-text-primary)' }}>
                    {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
                  </h3>
                  <p className="text-xs tracking-[0.03em] mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                    {habitName}
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="hidden lg:block p-2 rounded-2xl transition-all duration-300 hover:scale-110 glass-sm">
                <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto modal-scroll p-5 space-y-5">
              <div className="flex items-center justify-between p-4 rounded-[1.25rem] glass-sm">
                <label className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Completed</label>
                <button
                  onClick={() => !isReadOnly && setIsCompleted(!isCompleted)}
                  disabled={isReadOnly}
                  className={`w-8 h-8 rounded-[0.85rem] flex items-center justify-center transition-all duration-500 ${
                    isReadOnly ? 'cursor-not-allowed opacity-30' : 'cursor-pointer hover:scale-110'
                  }`}
                  style={{
                    backgroundColor: isCompleted ? 'rgba(16,185,129,0.12)' : 'var(--theme-background-glass-hover)',
                    border: isCompleted ? '1px solid rgba(16,185,129,0.25)' : '1px solid var(--theme-border-dark)',
                  }}
                >
                  <CheckCircle className="w-4 h-4" style={{ color: isCompleted ? 'var(--semantic-income)' : 'var(--theme-text-tertiary)' }} strokeWidth={1.5} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium tracking-[0.04em] uppercase mb-1.5" style={{ color: 'var(--theme-text-tertiary)' }}>
                  Note (optional)
                </label>
                <textarea
                  maxLength={100}
                  value={note}
                  onChange={(e) => !isReadOnly && setNote(e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Add a note about your progress..."
                  rows={3}
                  className={`w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all duration-500 placeholder:opacity-30 resize-none glass-sm ${
                    isReadOnly ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{ color: 'var(--theme-text-primary)', fontWeight: 350 }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid var(--theme-border-dark)' }}>
              <div className="flex gap-3 p-5">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 glass-sm"
                  style={{ color: 'var(--theme-text-tertiary)' }}
                >
                  Cancel
                </button>
                {!isReadOnly && (
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2.5 rounded-2xl text-white text-sm font-medium transition-all duration-500 hover:-translate-y-1 flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--theme-primary)', boxShadow: 'var(--shadow-button)' }}
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